FROM node:22-alpine AS builder

WORKDIR /app

ARG PUBLIC_API_URL=
ARG PUBLIC_SOCKET_URL=
ARG PUBLIC_VAPID_PUBLIC_KEY=
ARG PUBLIC_SKIP_CAPTCHA=false
ARG PUBLIC_LOCAL_FIRST_SYNC=shadow

ENV PUBLIC_API_URL=$PUBLIC_API_URL
ENV PUBLIC_SOCKET_URL=$PUBLIC_SOCKET_URL
ENV PUBLIC_VAPID_PUBLIC_KEY=$PUBLIC_VAPID_PUBLIC_KEY
ENV PUBLIC_SKIP_CAPTCHA=$PUBLIC_SKIP_CAPTCHA
ENV PUBLIC_LOCAL_FIRST_SYNC=$PUBLIC_LOCAL_FIRST_SYNC

COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY services/api/package.json services/api/package.json

RUN npm ci --workspace @penthouse/web --workspace @penthouse/contracts --include-workspace-root

COPY packages/contracts packages/contracts
COPY apps/web apps/web

RUN npm --workspace @penthouse/web run build

FROM caddy:2-alpine AS runtime

COPY infra/caddy/Caddyfile /etc/caddy/Caddyfile
COPY --from=builder /app/apps/web/build /srv
