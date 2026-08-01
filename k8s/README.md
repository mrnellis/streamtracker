# StreamTrack — Kubernetes Deployment

Self-host StreamTrack on your homelab cluster.

## Prerequisites
- A Kubernetes cluster (k3s, k0s, microk8s, kind, or full k8s all work)
- An ingress controller. `50-ingress.yaml` targets **Traefik**, which k3s ships
  and enables by default. On nginx-ingress, change `ingressClassName` to `nginx`.
- A container registry your cluster can pull from **OR** load images locally (see below)

## 0. Generate the frontend lockfile (first time only)

The frontend build requires `frontend/yarn.lock` and will fail without it.
Generate and commit it once:

```bash
cd frontend && yarn install && git add yarn.lock && git commit -m "Add yarn.lock"
```

## 1. Build the images

```bash
# From repo root
docker build -t localhost/streamtrack-backend:0.1.0 ./backend

# The frontend bakes REACT_APP_BACKEND_URL at build time.
# Set it to the URL your browser will use to reach the ingress.
docker build \
  --build-arg REACT_APP_BACKEND_URL=http://streamtrack.local \
  -t localhost/streamtrack-frontend:0.1.0 ./frontend
```

### Loading images without a registry
- **k3s:**   `docker save localhost/streamtrack-backend:0.1.0 localhost/streamtrack-frontend:0.1.0 | sudo k3s ctr images import -`
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

## Security posture

All three workloads run with:
- `runAsNonRoot` + an explicit UID (backend 1000, frontend 101, Mongo 999)
- `allowPrivilegeEscalation: false`, all capabilities dropped, `seccompProfile: RuntimeDefault`
- `readOnlyRootFilesystem: true`, with `emptyDir` mounts for the few paths that
  genuinely need writes (`/tmp`, nginx's cache, Mongo's `/data/configdb`)
- `automountServiceAccountToken: false` — nothing here talks to the API server

Two consequences worth knowing:
- The frontend container listens on **8080**, not 80 (a non-root process cannot
  bind a privileged port). The Service still publishes port 80, so the Ingress
  is unchanged.
- Mongo's PVC is chowned to GID 999 by `fsGroup`. On an **existing** volume with
  different ownership, the pod will fail to start until the data is chowned.

Verify after applying:
```bash
kubectl -n streamtrack get pods -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.securityContext.runAsUser}{"\n"}{end}'
```

## Scaling notes
- Backend is stateless — bump `replicas:` freely.
- Mongo is a single-replica StatefulSet. For HA, switch to a ReplicaSet (`bitnami/mongodb-sharded` chart is easier).
- The PVC uses your cluster's default StorageClass. Set one explicitly under `volumeClaimTemplates` if you have multiple.
