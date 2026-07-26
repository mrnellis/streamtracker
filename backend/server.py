from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import logging
import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Annotated

import bcrypt
import jwt
from bson import ObjectId
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, BeforeValidator, ConfigDict


# ---------- Setup ----------
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24 * 7  # long-lived for homelab

app = FastAPI(title="StreamTrack API")
api_router = APIRouter(prefix="/api")
bearer_scheme = HTTPBearer(auto_error=False)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


# ---------- Utilities ----------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def gen_id() -> str:
    return str(uuid.uuid4())


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> dict:
    if credentials is None or not credentials.credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"id": payload["sub"]})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user.pop("_id", None)
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ---------- Models ----------
class UserPublic(BaseModel):
    id: str
    email: EmailStr
    name: str
    role: str = "user"
    created_at: str


class RegisterInput(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=1)


class LoginInput(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    token: str
    user: UserPublic


class ProfileUser(BaseModel):
    id: str = Field(default_factory=gen_id)
    name: str
    color: Optional[str] = None  # hex or preset


class SubscriptionInput(BaseModel):
    platform: str
    tier: str
    monthly_price: float
    currency: str = "USD"
    concurrent_users: int = 1
    region: str = "US"  # ISO country code
    next_payment_date: str  # ISO date string YYYY-MM-DD
    profile_users: List[ProfileUser] = []
    notes: Optional[str] = None
    brand_color: Optional[str] = None


class SubscriptionOut(SubscriptionInput):
    id: str
    owner_id: str
    created_at: str
    updated_at: str


# ---------- Auth Endpoints ----------
@api_router.post("/auth/register", response_model=AuthResponse)
async def register(payload: RegisterInput):
    email = payload.email.lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user_doc = {
        "id": gen_id(),
        "email": email,
        "name": payload.name.strip(),
        "role": "user",
        "password_hash": hash_password(payload.password),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(user_doc)
    token = create_access_token(user_doc["id"], user_doc["email"])
    user_doc.pop("_id", None)
    user_doc.pop("password_hash", None)
    return {"token": token, "user": user_doc}


@api_router.post("/auth/login", response_model=AuthResponse)
async def login(payload: LoginInput):
    email = payload.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(user["id"], user["email"])
    user.pop("_id", None)
    user.pop("password_hash", None)
    return {"token": token, "user": user}


@api_router.get("/auth/me", response_model=UserPublic)
async def me(current_user: dict = Depends(get_current_user)):
    return current_user


# ---------- Subscriptions CRUD ----------
@api_router.get("/subscriptions", response_model=List[SubscriptionOut])
async def list_subscriptions(current_user: dict = Depends(get_current_user)):
    docs = await db.subscriptions.find({"owner_id": current_user["id"]}, {"_id": 0}).to_list(1000)
    docs.sort(key=lambda x: x.get("next_payment_date", ""))
    return docs


@api_router.post("/subscriptions", response_model=SubscriptionOut, status_code=201)
async def create_subscription(payload: SubscriptionInput, current_user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc).isoformat()
    doc = payload.model_dump()
    doc.update({
        "id": gen_id(),
        "owner_id": current_user["id"],
        "created_at": now,
        "updated_at": now,
    })
    # ensure each profile user has an id
    for pu in doc.get("profile_users", []):
        if not pu.get("id"):
            pu["id"] = gen_id()
    await db.subscriptions.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.get("/subscriptions/{sub_id}", response_model=SubscriptionOut)
async def get_subscription(sub_id: str, current_user: dict = Depends(get_current_user)):
    doc = await db.subscriptions.find_one({"id": sub_id, "owner_id": current_user["id"]}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Subscription not found")
    return doc


@api_router.put("/subscriptions/{sub_id}", response_model=SubscriptionOut)
async def update_subscription(sub_id: str, payload: SubscriptionInput, current_user: dict = Depends(get_current_user)):
    doc = await db.subscriptions.find_one({"id": sub_id, "owner_id": current_user["id"]})
    if not doc:
        raise HTTPException(status_code=404, detail="Subscription not found")
    update = payload.model_dump()
    for pu in update.get("profile_users", []):
        if not pu.get("id"):
            pu["id"] = gen_id()
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.subscriptions.update_one({"id": sub_id}, {"$set": update})
    doc = await db.subscriptions.find_one({"id": sub_id}, {"_id": 0})
    return doc


@api_router.delete("/subscriptions/{sub_id}", status_code=204)
async def delete_subscription(sub_id: str, current_user: dict = Depends(get_current_user)):
    res = await db.subscriptions.delete_one({"id": sub_id, "owner_id": current_user["id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Subscription not found")
    return None


# ---------- Dashboard ----------
@api_router.get("/dashboard/summary")
async def dashboard_summary(current_user: dict = Depends(get_current_user)):
    docs = await db.subscriptions.find({"owner_id": current_user["id"]}, {"_id": 0}).to_list(1000)
    total_monthly = sum(float(d.get("monthly_price", 0)) for d in docs)
    total_yearly = total_monthly * 12
    total_seats = sum(int(d.get("concurrent_users", 0)) for d in docs)
    total_profiles = sum(len(d.get("profile_users", [])) for d in docs)

    today = datetime.now(timezone.utc).date()
    upcoming = []
    for d in docs:
        try:
            npd = datetime.fromisoformat(d["next_payment_date"]).date()
        except Exception:
            continue
        days = (npd - today).days
        if days <= 30:
            upcoming.append({
                "id": d["id"],
                "platform": d["platform"],
                "tier": d["tier"],
                "next_payment_date": d["next_payment_date"],
                "monthly_price": d["monthly_price"],
                "currency": d.get("currency", "USD"),
                "brand_color": d.get("brand_color"),
                "days_until": days,
            })
    upcoming.sort(key=lambda x: x["days_until"])

    # breakdown by platform for chart
    breakdown = [
        {
            "platform": d["platform"],
            "monthly_price": d["monthly_price"],
            "brand_color": d.get("brand_color"),
        }
        for d in docs
    ]
    breakdown.sort(key=lambda x: x["monthly_price"], reverse=True)

    # regions count
    region_counts = {}
    for d in docs:
        r = d.get("region", "US")
        region_counts[r] = region_counts.get(r, 0) + 1

    return {
        "total_monthly": round(total_monthly, 2),
        "total_yearly": round(total_yearly, 2),
        "total_subscriptions": len(docs),
        "total_seats": total_seats,
        "total_profiles": total_profiles,
        "upcoming_renewals": upcoming,
        "spend_breakdown": breakdown,
        "region_counts": region_counts,
    }


# ---------- Platform Templates ----------
PLATFORM_TEMPLATES = [
    {"platform": "Netflix", "tier": "Standard", "monthly_price": 15.49, "concurrent_users": 2, "brand_color": "#E50914"},
    {"platform": "Netflix", "tier": "Premium", "monthly_price": 22.99, "concurrent_users": 4, "brand_color": "#E50914"},
    {"platform": "Disney+", "tier": "Standard", "monthly_price": 10.99, "concurrent_users": 4, "brand_color": "#0E6FBB"},
    {"platform": "Disney+", "tier": "Premium", "monthly_price": 15.99, "concurrent_users": 4, "brand_color": "#0E6FBB"},
    {"platform": "Hulu", "tier": "With Ads", "monthly_price": 7.99, "concurrent_users": 2, "brand_color": "#1CE783"},
    {"platform": "Hulu", "tier": "No Ads", "monthly_price": 17.99, "concurrent_users": 2, "brand_color": "#1CE783"},
    {"platform": "Max", "tier": "With Ads", "monthly_price": 9.99, "concurrent_users": 2, "brand_color": "#7B2CBF"},
    {"platform": "Max", "tier": "Ultimate", "monthly_price": 20.99, "concurrent_users": 4, "brand_color": "#7B2CBF"},
    {"platform": "Prime Video", "tier": "Standard", "monthly_price": 8.99, "concurrent_users": 3, "brand_color": "#00A8E1"},
    {"platform": "Spotify", "tier": "Individual", "monthly_price": 11.99, "concurrent_users": 1, "brand_color": "#1DB954"},
    {"platform": "Spotify", "tier": "Family", "monthly_price": 19.99, "concurrent_users": 6, "brand_color": "#1DB954"},
    {"platform": "Apple TV+", "tier": "Standard", "monthly_price": 9.99, "concurrent_users": 6, "brand_color": "#A0A5AB"},
    {"platform": "YouTube Premium", "tier": "Individual", "monthly_price": 13.99, "concurrent_users": 1, "brand_color": "#FF0000"},
    {"platform": "Peacock", "tier": "Premium", "monthly_price": 7.99, "concurrent_users": 3, "brand_color": "#F5A623"},
    {"platform": "Paramount+", "tier": "Standard", "monthly_price": 5.99, "concurrent_users": 3, "brand_color": "#0064FF"},
]


@api_router.get("/platform-templates")
async def get_platform_templates(current_user: dict = Depends(get_current_user)):
    return PLATFORM_TEMPLATES


@api_router.get("/health")
async def health():
    return {"status": "ok", "time": datetime.now(timezone.utc).isoformat()}


# ---------- Include Router + Middleware ----------
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- Startup: Seed admin + indexes ----------
@app.on_event("startup")
async def startup_event():
    await db.users.create_index("email", unique=True)
    await db.subscriptions.create_index("owner_id")
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@homelab.local").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "id": gen_id(),
            "email": admin_email,
            "name": "Admin",
            "role": "admin",
            "password_hash": hash_password(admin_password),
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        logger.info(f"Seeded admin user: {admin_email}")
    else:
        # sync password if env changed
        if not verify_password(admin_password, existing["password_hash"]):
            await db.users.update_one(
                {"email": admin_email},
                {"$set": {"password_hash": hash_password(admin_password)}},
            )
            logger.info(f"Updated admin password for: {admin_email}")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
