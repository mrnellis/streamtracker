# StreamTrack

Self-hosted tracker for household streaming subscriptions: what you pay per
platform, how many concurrent seats each plan allows, who is actually using
them, and what renews next.

Built to run on a homelab Kubernetes cluster.

## Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI, Motor (async MongoDB), PyJWT, bcrypt |
| Frontend | React 19, React Router 7, Tailwind, shadcn/ui, Recharts |
| Database | MongoDB 7 (single-replica StatefulSet, PVC-backed) |
| Deployment | Kubernetes manifests targeting k3s + Traefik |

Auth is a JWT bearer token held in `localStorage`; every API route is prefixed
`/api`.

## Features

- Subscription CRUD — platform, tier, price, currency, concurrent seats,
  region, next payment date, per-profile users, notes
- Dashboard — monthly and annualized spend, seat and profile counts, renewals
  due inside 30 days, spend breakdown by platform, region distribution
- Renewals timeline grouped into Overdue / This week / 30 days / Later
- 15 pre-seeded platform templates (Netflix, Disney+, Hulu, Max, Spotify, …)
- CSV export of all subscriptions with a totals row

## Deploying

See [k8s/README.md](k8s/README.md) for the full walkthrough — building images,
loading them into k3s without a registry, secrets, and the security posture the
manifests apply.

The short version:

```bash
cd frontend && yarn install    # generates yarn.lock, required by the build
```

Then build both images, edit the placeholder values in `k8s/10-secrets.yaml`,
set the Ingress host, and `kubectl apply -f k8s/`.

## Local development

```bash
cd backend && pip install -r requirements.txt && uvicorn server:app --port 8001
```

The backend expects `MONGO_URL`, `DB_NAME`, `JWT_SECRET`, and `ADMIN_PASSWORD`
in the environment (or a `backend/.env` file, which is gitignored).

```bash
cd frontend && yarn install && yarn start
```

Set `REACT_APP_BACKEND_URL` to reach the API. Leave it empty to use relative
`/api` paths, which is what the Kubernetes deployment does.

## Repository layout

```
backend/    FastAPI application (single-module server.py) + Dockerfile
frontend/   React SPA + nginx Dockerfile
k8s/        Kubernetes manifests, applied in numeric order
memory/     PRD and product notes
```
