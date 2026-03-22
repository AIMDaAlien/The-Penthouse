# User Management Packet

## Current truth

The backend foundations for user management already exist.

Implemented backend/admin seams:

- `GET /api/v1/admin/invite`
- `POST /api/v1/admin/invite/rotate`
- `GET /api/v1/admin/members`
- `POST /api/v1/admin/members/:memberId/remove`
- `POST /api/v1/admin/members/:memberId/ban`
- `POST /api/v1/admin/members/:memberId/temp-password`
- `GET /api/v1/admin/chats/:chatId/messages`

Implemented member self-service seams:

- `GET /api/v1/me`
- `PATCH /api/v1/me/profile`
- `POST /api/v1/me/password`
- `POST /api/v1/me/recovery-code/rotate`
- `GET /api/v1/members`
- `GET /api/v1/members/:memberId`

## What is actually missing

The missing work is mostly on the frontend/admin experience side:

- an admin-facing member management screen
- an admin-facing invite management screen
- clear handling for destructive actions:
  - remove
  - ban
  - temporary password issuance
- correct admin-only visibility and stale-state handling

## Scope for this round

Do **not** redesign backend semantics.

Do **not** broaden into server/operator dashboards yet.

Build the first user-management UI slice using the existing backend contracts.

## First slice target

1. Admin can open a basic user-management screen
2. Admin can search and inspect members
3. Admin can see role and status clearly
4. Admin can rotate/view the invite code
5. Admin can remove, ban, or issue a temporary password
6. Dangerous actions are confirmed and reflected immediately in UI

## Agent order

1. `Opencode`
   - implement the first admin user-management UI slice against existing APIs
2. `Claude Opus 4.6`
   - review for permission leaks, stale state, destructive-action mistakes, and edge-case regressions

## Not in this slice

- full server management dashboard
- analytics
- DMs
- broad visual redesign
- new backend moderation features
- role editing or admin promotion flows unless a true blocker appears
