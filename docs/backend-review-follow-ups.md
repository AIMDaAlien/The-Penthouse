# Backend Review Follow-Ups

Generated from the deployment-inclusive backend review on May 19, 2026.

## Resolved Medium Findings

- Socket `message.edit` now uses the shared message edit helper, records a `message_edits` audit row, and emits the same sync payload as REST edits.
- Socket `message.read` now validates that `throughMessageId` belongs to the target chat before updating `chat_members.last_read_message_id`.
- Message create/edit/delete/reaction paths now append their `sync_events` row in the same transaction as the domain write; folder-item reorder now does the same for its folder sync payload.
- Channel creation now requires owner/admin manager rights on the parent group while still preserving non-member rejection before DM/channel type validation.
- Chat notification override routes now assert membership before reading or writing a per-chat override.

## Resolved Low Findings

- Static icon cache headers are now deployed on the live host as of May 19, 2026: `https://penthouse.blog/icons/icon-192.png` returns `cache-control: public, max-age=31536000, immutable`. The active live seam was the preserved `/mnt/cache/appdata/penthouse/app/infra/compose/caddy/Caddyfile.production` file, so future deploys must not delete the host's preserved `infra/compose/` files during rsync-style updates.
- Private chat media now has a backend signed URL path for render-only clients. Message hydration rewrites allowed private attachment URLs to short-lived `/api/v1/media/signed/<payload>/<signature>` links, and message creation rejects media references the sender cannot access.
- Chat member listing now derives banner URLs from `banner_media_id` via `/api/v1/media/public/:id`, matching `/auth/me`, user search, admin member lists, and sync user payloads.
