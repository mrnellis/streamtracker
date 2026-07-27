# StreamTrack — Kubernetes Deployment

Self-host StreamTrack on your homelab cluster.

## Prerequisites
- A Kubernetes cluster (k3s, k0s, microk8s, kind, or full k8s all work)
- An ingress controller (nginx-ingress or Traefik). k3s ships with Traefik by default.
- A container registry your cluster can pull from **OR** load images locally (see below)

## 1. Build the images

```bash
# From repo root
docker build -t streamtrack-backend:latest ./backend

# The frontend bakes REACT_APP_BACKEND_URL at build time.
# Set it to the URL your browser will use to reach the ingress.
docker build \
  --build-arg REACT_APP_BACKEND_URL=http://streamtrack.local \
  -t streamtrack-frontend:latest ./frontend
```

### Loading images without a registry
- **k3s:**   `docker save streamtrack-backend:latest | sudo k3s ctr images import -`
- **kind:**  `kind load docker-image streamtrack-backend:latest streamtrack-frontend:latest`
- **microk8s:** `docker save streamtrack-backend:latest > /tmp/be.tar && microk8s ctr image import /tmp/be.tar`

Otherwise, tag + push to your registry and update `image:` fields in `30-backend.yaml` / `40-frontend.yaml`.

## 2. Edit secrets

Open `10-secrets.yaml` and replace:
- `JWT_SECRET` — generate with `python3 -c "import secrets; print(secrets.token_hex(32))"`
- `ADMIN_PASSWORD` — pick your own admin password
- `MONGO_ROOT_PASSWORD` — pick your own Mongo password
- `FRONTEND_URL` in the ConfigMap — the URL people will type in a browser

Also edit `50-ingress.yaml` → `host:` to your DNS name (e.g. `streamtrack.home.arpa`).

## 3. Apply

```bash
kubectl apply -f 00-namespace.yaml
kubectl apply -f 10-secrets.yaml
kubectl apply -f 20-mongo-statefulset.yaml
kubectl apply -f 30-backend.yaml
kubectl apply -f 40-frontend.yaml
kubectl apply -f 50-ingress.yaml
```

Or all at once:
```bash
kubectl apply -f .
```

## 4. Verify

```bash
kubectl -n streamtrack get pods
kubectl -n streamtrack logs deploy/streamtrack-backend
```

Add `streamtrack.local` (or your chosen host) to `/etc/hosts` pointing at your cluster's ingress IP, or set it up in your homelab DNS.

Open your browser → `http://streamtrack.local` and log in with the admin credentials from your secret.

## Architecture

```
       Browser
          │
          ▼
   ┌────────────┐
   │  Ingress   │  streamtrack.local
   └─────┬──────┘
     /api│      / (SPA)
   ┌─────▼──────┐  ┌───────────────┐
   │  backend   │  │   frontend    │
   │ (FastAPI)  │  │ (nginx+React) │
   └─────┬──────┘  └───────────────┘
         │
         ▼
   ┌────────────┐
   │  Mongo SS  │  PVC (5Gi)
   └────────────┘
```

## Scaling notes
- Backend is stateless — bump `replicas:` freely.
- Mongo is a single-replica StatefulSet. For HA, switch to a ReplicaSet (`bitnami/mongodb-sharded` chart is easier).
- The PVC uses your cluster's default StorageClass. Set one explicitly under `volumeClaimTemplates` if you have multiple.
