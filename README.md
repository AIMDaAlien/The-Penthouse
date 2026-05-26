# The Penthouse

The Penthouse is a self-hosted alpha messaging app: open alpha registration, real-time chat, folders, media uploads, push notification groundwork, and a static PWA frontend.

This repo is currently release-shaped for an early production alpha. Users should be treated as normal invited users giving feedback, not as demo-account testers.

## Local Development

Prerequisites:

- Node.js 22+
- npm 11+
- Docker with Compose

Start Postgres:

```sh
npm run db:start
```

Install dependencies and migrate the database:

```sh
npm install
npm --workspace @penthouse/api run migrate
```

Run the API and web app in separate terminals:

```sh
npm --workspace @penthouse/api run dev
npm --workspace @penthouse/web run dev -- --host 0.0.0.0 --port 5173
```

Local defaults:

- Web: `http://localhost:5173`
- API: `http://localhost:3000`
- Postgres: `localhost:5434`
- Registration: open unless the admin registration mode is set to `closed`

## Production Alpha

Production release uses Docker Compose + Caddy + PostgreSQL. The full runbook is in [docs/PRODUCTION_ALPHA_RELEASE.md](docs/PRODUCTION_ALPHA_RELEASE.md).

Prepare the server env:

```sh
cp infra/production.env.example infra/production.env
```

Replace every placeholder secret in `infra/production.env`, then validate the stack:

```sh
docker compose --env-file infra/production.env -f infra/docker-compose.yml --profile production config
```

Build and start:

```sh
docker compose --env-file infra/production.env -f infra/docker-compose.yml --profile production up -d --build
```

The production container can still create or refresh legacy alpha invites when `ALPHA_BOOTSTRAP_INVITE_CODE` is present, but registration no longer requires an invite code. For a manual local run after migrations:

```sh
docker compose --env-file infra/production.env -f infra/docker-compose.yml --profile production exec api \
  npm --workspace @penthouse/api run bootstrap:alpha:prod
```

The first registered account becomes admin. Keep registration open for alpha testers, or switch the admin registration mode to `closed` to stop new signups.

## Quality Gates

Run these before a release handoff:

```sh
npm run validate
npm --workspace @penthouse/api run build
npm --workspace @penthouse/web run build
docker compose --env-file infra/production.env.example -f infra/docker-compose.yml --profile production config
```

For a real deploy, also verify the live root app, `/api/v1/health`, `/api/v1/app-distribution`, `/manifest.webmanifest`, `/service-worker.js`, registration, login, socket connection, message send/receive, and media upload.

## Alpha Limits

- No public demo account is provided.
- Registration is open while this alpha is gathering tester feedback.
- Recovery-code password reset exists; email reset is not part of this release slice.
- Voice/media signaling is still alpha infrastructure and can be disabled in production with `MEDIASOUP_ENABLED=false`.
- A release is not considered complete until the live domains and a real browser session prove the deployed stack.
