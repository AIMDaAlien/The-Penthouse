# Claude Opus 4.6 Prompt: TrueNAS TLS and Public Cutover Review

Do a bounded cutover review for making the rebuild public at `penthouse.blog` on a TrueNAS host.

Context
- The rebuild is staged on TrueNAS under `/mnt/Storage_Pool/penthouse-rebuild/app`
- The old live public Penthouse stack is still separate and should not be broken casually
- The rebuild public-style stack is currently staged on alternate ports:
  - HTTP `9081`
  - HTTPS `9444`
- The old live Penthouse stack historically used Caddy behind `9080/9443`
- The TrueNAS host itself owns real `80/443` via host nginx / UI
- Caddy auto-HTTPS fails in staging because the real public domains still resolve to the old live stack

Public target
- `penthouse.blog` should become the rebuild landing/download site
- `api.penthouse.blog` should become the rebuild API/WebSocket backend
- legacy APK must remain downloadable at `/downloads/the-penthouse.apk`
- rebuild APK should be served at `/downloads/the-penthouse-rebuild.apk`

Important current repo/server facts
- Repo now has:
  - static landing page
  - static legacy page
  - production Caddyfile
  - production + TrueNAS compose files
  - deployment docs
- The legacy APK is already copied to the rebuild downloads directory on TrueNAS
- The rebuild APK is not public-ready yet because it is still unsigned
- For this review, assume fresh-install rollout is acceptable unless the old signing key later appears

What I want from you

1. Review the TLS termination strategy
- Is host nginx TLS termination + proxy to the rebuild stack the cleanest TrueNAS path?
- Should Caddy stay in the chain as an HTTP upstream router for the rebuild site/API, or should host nginx proxy directly to the API/static assets?
- I want the smallest safe path, not a redesign

2. Review domain cutover risk
- What exact risks exist when switching `penthouse.blog` and `api.penthouse.blog` from the old stack to the rebuild?
- Are there hidden Host-header, websocket, upload, or path-routing traps?
- Does the current root-site + api-subdomain split remain sound on this box?

3. Tell me what is truly blocking cutover versus what is cleanup
- separate “must fix before public cutover” from “nice to clean up later”

Files/seams to reason from
- `infra/compose/docker-compose.production.yml`
- `infra/compose/docker-compose.truenas.yml`
- `infra/compose/docker-compose.truenas.preview.yml`
- `infra/compose/caddy/Caddyfile.production`
- `infra/compose/.env.truenas.example`
- `docs/DEPLOYMENT.md`
- `docs/TRUENAS_DEPLOYMENT.md`

Do not do
- no mobile feature review
- no auth/chat redesign
- no iOS
- no push redesign
- no speculative infra rewrite

Return
1. Findings first, ordered by severity
2. Exact recommended TLS/cutover shape in plain English
3. Smallest concrete cutover checklist only
4. Verdict: safe for controlled public cutover once signed APK exists, or not yet
