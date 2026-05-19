# Kimi Handoff: Backend Review Closure

Date: May 19, 2026
Repo: `/Users/aim/Documents/The Penthouse`
Base branch/commit when reviewed: `main` at `7fcc4ac`

## Verdict

Codex completed the deployment-inclusive backend review, final reviewer pass, and live redeploy. No open Critical, High, or Medium backend findings remain from this pass.

The prior deployment caveat is closed: after redeploy, `https://penthouse.blog/icons/icon-192.png` returns `cache-control: public, max-age=31536000, immutable`.

## Resolved Findings

- Production CAPTCHA/ALTCHA is now backed by signed proof-of-work challenges when `ALTCHA_HMAC_KEY` is configured; development fallback remains explicit.
- Fastify now honors `TRUST_PROXY`, and production Compose defaults it on so rate limits use the real proxied client IP instead of collapsing through Caddy.
- Session revocation now affects REST and ongoing Socket.IO traffic. Socket connection and event handlers validate the backing session device and active refresh state.
- Generic media uploads now default private, profile/emote/sticker media is marked public, and old public consumers use `/api/v1/media/public/:id`.
- Private message media can render through short-lived signed URLs at `/api/v1/media/signed/<payload>/<signature>`, and message creation rejects media refs the sender cannot access.
- Socket `message.edit` now uses the REST edit helper and records `message_edits` audit rows.
- Socket and REST read receipts now reject `throughMessageId` values from another chat.
- Message create/edit/delete/read/reaction sync rows are written in the same transaction as the domain write.
- Folder item reorder writes its sync payload in the same transaction as the reorder.
- Channel creation requires parent group owner/admin manager rights after membership and parent resolution.
- Chat notification override GET/PATCH routes now assert chat membership before reading or writing overrides.
- Final pass patched one low mismatch: `/api/v1/chats/:id/members` now returns `bannerMediaId` and derives `bannerUrl` from `/api/v1/media/public/:id`, matching `/auth/me`, users, admin members, and sync payloads.

## Files To Inspect

- `services/api/src/utils/altcha.ts`
- `services/api/src/utils/sessions.ts`
- `services/api/src/realtime/socket.ts`
- `services/api/src/routes/auth.ts`
- `services/api/src/routes/chats.ts`
- `services/api/src/routes/media.ts`
- `services/api/src/routes/push.ts`
- `services/api/src/utils/messages.ts`
- `services/api/src/utils/media-access.ts`
- `services/api/src/features/sync/events.ts`
- `services/api/src/features/channels/routes.ts`
- `services/api/src/features/chatFolders/routes.ts`
- `services/api/src/features/customEmotes/routes.ts`
- `services/api/src/db/migrations/0010_media_scope.sql`
- `infra/caddy/Caddyfile`
- Live host preserved deployment seam: `/mnt/cache/appdata/penthouse/app/infra/compose/caddy/Caddyfile.production`
- Live host preserved deployment seam: `/mnt/cache/appdata/penthouse/app/infra/compose/docker-compose.production.yml`
- `infra/docker-compose.yml`
- `infra/production.env.example`
- `docs/backend-review-follow-ups.md`

## Verification Evidence

Passing local gates:

```bash
npm --workspace @penthouse/api run typecheck
DATABASE_URL=postgresql://penthouse:penthouse@localhost:5433/penthouse_test npm --workspace @penthouse/api run test
npm --workspace @penthouse/api run build
npm run validate
docker compose --env-file infra/production.env.example -f infra/docker-compose.yml --profile production config
docker run --rm -v "$PWD/infra/caddy/Caddyfile:/etc/caddy/Caddyfile:ro" caddy:2 caddy validate --config /etc/caddy/Caddyfile
git diff --check
```

Notable results:

- API suite: 50 tests, 13 suites, 50 pass.
- Contracts suite under root validate: 36 tests, 19 suites, 36 pass.
- Root validate passed. It still prints existing Svelte a11y/reactivity warnings in web/prototype files; none are backend failures.
- Compose render showed `TRUST_PROXY: "true"`.
- Caddy config validated successfully.

Fresh public checks before redeploy on May 19, 2026:

- `https://api.penthouse.blog/api/v1/health`: HTTP 200.
- `https://api.penthouse.blog/api/v1/auth/config`: HTTP 200.
- `https://api.penthouse.blog/api/v1/app-distribution`: HTTP 200, `cache-control: public, max-age=60`.
- CORS preflight from `https://penthouse.blog` to `/api/v1/auth/config`: HTTP 204 with `access-control-allow-origin: https://penthouse.blog`.
- `https://penthouse.blog/manifest.webmanifest`: HTTP 200, `cache-control: no-cache`.
- `https://penthouse.blog/service-worker.js`: HTTP 200, `cache-control: no-cache`.
- `https://api.penthouse.blog/socket.io/?EIO=4&transport=polling`: HTTP 200, `cache-control: no-store`.
- `https://penthouse.blog/icons/icon-192.png`: HTTP 200 but still `cache-control: no-cache`.

Post-deploy proof on May 19, 2026:

- Pushed commit: `e56a22e Harden backend release surface`.
- Live API rebuilt and Caddy recreated from the `/mnt/cache/appdata/penthouse/app` checkout.
- API migration log showed `applied 0010_media_scope.sql`.
- API container `TRUST_PROXY=true`.
- Runtime Caddy config contains `@immutable path /_app/immutable/* /icons/*`.
- `https://api.penthouse.blog/api/v1/health`: HTTP 200, `{ "status": "ok", "db": "reachable" }`.
- `https://api.penthouse.blog/api/v1/app-distribution`: HTTP 200, `cache-control: public, max-age=60`.
- `https://api.penthouse.blog/socket.io/?EIO=4&transport=polling`: HTTP 200, `cache-control: no-store`.
- `https://penthouse.blog/icons/icon-192.png`: HTTP 200, `cache-control: public, max-age=31536000, immutable`.
- `https://penthouse.blog/manifest.webmanifest`: HTTP 200, `cache-control: no-cache`.
- `https://penthouse.blog/service-worker.js`: HTTP 200, `cache-control: no-cache`.

## Remaining Caveats

- The live host still carries preserved untracked deployment files under `infra/compose/` and `scripts/`. Do not delete those during rsync-style deploys; the runtime Caddy and Compose files currently live there.
- The final review did not find a release blocker in the remaining chat routes, but a future hardening sweep could wrap lower-risk sync append paths for pins, unpins, chat preferences, archive/unarchive, and DM create in transactions for perfect consistency. Current tests pass and the main message/folder paths are already transaction-safe.
- Do not revert the dirty backend hardening changes while reviewing. This handoff assumes they are the intended current work product.

## Kimi Next Step

Use this as a validation handoff, not a request to re-architect the backend. Start by reading the files above, then run the exact verification commands. If they pass, the backend review can be considered closed.
