# Production Alpha Release Runbook

Date: 2026-05-18

This runbook prepares The Penthouse for invited alpha users on a self-hosted Docker Compose + Caddy stack. It does not create demo users or public shared credentials.

## Release Shape

- `postgres`: persistent PostgreSQL 16 database.
- `api`: Node 22 production build, runs migrations before startup, stores uploads on a persistent volume.
- `caddy`: serves the built SvelteKit PWA and reverse-proxies API and Socket.IO traffic.
- Public app target: `https://penthouse.blog`.
- Likely API target: `https://api.penthouse.blog`.

The Compose production services are behind the `production` profile so local `npm run db:start` still starts only the local database and optional media services.

## Server Preparation

Create the production env file on the server:

```sh
cp infra/production.env.example infra/production.env
```

Replace all placeholder values. Required release secrets:

- `POSTGRES_PASSWORD`
- `DATABASE_URL`
- `JWT_SECRET`
- `ALTCHA_HMAC_KEY`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `ALPHA_BOOTSTRAP_INVITE_CODE`

Generate VAPID keys when needed:

```sh
npx web-push generate-vapid-keys
```

Use a private invite code for `ALPHA_BOOTSTRAP_INVITE_CODE`. Do not use `PENTHOUSE-ALPHA` in production.

## Build And Start

Validate Compose:

```sh
docker compose --env-file infra/production.env -f infra/docker-compose.yml --profile production config
```

Build and boot:

```sh
docker compose --env-file infra/production.env -f infra/docker-compose.yml --profile production up -d --build
```

Watch startup:

```sh
docker compose --env-file infra/production.env -f infra/docker-compose.yml --profile production ps
docker compose --env-file infra/production.env -f infra/docker-compose.yml --profile production logs -f api caddy
```

The API container runs `migrate:prod` before `start`. When `ALPHA_BOOTSTRAP_INVITE_CODE` is set, it also runs the guarded alpha bootstrap before the API starts serving traffic. SQL migration files are copied into `dist/src/db/migrations` during the API build.

## Bootstrap Invites

The production container creates or refreshes the private alpha invite automatically when `ALPHA_BOOTSTRAP_INVITE_CODE` is present. For a manual local run after migrations:

```sh
docker compose --env-file infra/production.env -f infra/docker-compose.yml --profile production exec api \
  npm --workspace @penthouse/api run bootstrap:alpha:prod
```

The script:

- keeps registration in `invite_only` mode;
- creates or refreshes `ALPHA_BOOTSTRAP_INVITE_CODE`;
- refuses `PENTHOUSE-ALPHA` in production;
- revokes the default local invite when `ALPHA_REVOKE_DEFAULT_INVITE=true`.

The first registered account becomes admin. After that, use admin invite generation for tester-specific codes.

## Rollback

Before deploying a replacement build:

```sh
docker compose --env-file infra/production.env -f infra/docker-compose.yml --profile production exec postgres \
  sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' | gzip > "penthouse-predeploy-$(date +%Y%m%d-%H%M%S).sql.gz"
```

Also record the current image IDs:

```sh
docker compose --env-file infra/production.env -f infra/docker-compose.yml --profile production images
```

Rollback options:

- restart the previous image tags if they were preserved by the host;
- restore the database dump if a migration must be reversed;
- keep the old stack restartable until the new root app, API, auth, messaging, and media paths are proven live.

## Release Proof

Run local gates first:

```sh
npm run validate
npm --workspace @penthouse/api run build
npm --workspace @penthouse/web run build
docker compose --env-file infra/production.env.example -f infra/docker-compose.yml --profile production config
```

Then prove the deployed host:

```sh
curl -fsS https://api.penthouse.blog/api/v1/health
curl -fsS https://api.penthouse.blog/api/v1/app-distribution
curl -I https://penthouse.blog/manifest.webmanifest
curl -I https://penthouse.blog/service-worker.js
curl -I https://penthouse.blog/icons/icon-192.png
```

Browser proof required before calling the alpha released:

- root app loads over TLS;
- registration works with a private invite;
- login works after refresh;
- Socket.IO connects;
- a message can be sent and received;
- a small media upload can be attached and fetched;
- manifest and service worker register without console errors;
- install prompt appears where the browser supports it;
- update prompt appears on a changed service worker.

## Known Alpha Limits

- Users are real invited alpha users, but data may still be wiped during early testing.
- No shared demo login exists by design.
- Password reset uses recovery codes, not email.
- Push requires valid VAPID keys and browser/device support.
- Voice/media signaling should stay disabled until the operator deliberately tests that path.
