# StreamTrack frontend — build + nginx serve
FROM docker.io/library/node:20-alpine AS builder

WORKDIR /app
# yarn.lock is required, not optional. The `resolutions` block in package.json
# pins a long list of transitive CVE fixes; an unlocked install silently
# re-resolves them. Fail the build rather than ship a drifted tree.
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .

# REACT_APP_BACKEND_URL is baked in at build time
ARG REACT_APP_BACKEND_URL=""
ENV REACT_APP_BACKEND_URL=$REACT_APP_BACKEND_URL

RUN yarn build

# Unprivileged nginx: runs as UID 101, listens on 8080, and keeps its pid and
# temp paths out of the root filesystem so readOnlyRootFilesystem works.
FROM docker.io/nginxinc/nginx-unprivileged:1.27-alpine

# This base image ends with USER 101, so build steps need root explicitly.
USER root

# SPA fallback + gzip
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=builder /app/build /usr/share/nginx/html

USER 101

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
