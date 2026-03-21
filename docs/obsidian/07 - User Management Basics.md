---
tags: [penthouse, user-management, auth, admin, obsidian]
created: 2026-03-08
---

# User Management Basics

## Why this slice exists

The app was usable for basic invite auth and shared chat, but it still lacked the first real layer of account management:

- profile data
- member directory
- account recovery rotation
- admin-controlled invite rotation
- remove / ban controls
- forced password change for manual recovery

Without this slice, the app could demo chat but not manage people.

## What Phase 1 locked

### User model

Users now carry:

- `displayName`
- `bio`
- `avatarMediaId`
- `role` (`admin` or `member`)
- `status` (`active`, `removed`, `banned`)
- `mustChangePassword`

Important rule:
- `username` stays the immutable login identifier.

### Auth/session behavior

Protected requests no longer trust the JWT alone.

Every protected request now reloads the live user row from PostgreSQL and enforces:

- removed/banned users are blocked immediately
- role changes take effect immediately
- forced password change state takes effect immediately

This matters because it closes the gap where an old access token could keep working after an admin action.

### Member self-service APIs

Implemented:

- `GET /api/v1/me`
- `PATCH /api/v1/me/profile`
- `POST /api/v1/me/password`
- `POST /api/v1/me/recovery-code/rotate`
- `GET /api/v1/members`
- `GET /api/v1/members/:memberId`

### Admin backend APIs

Implemented:

- `GET /api/v1/admin/invites`
- `POST /api/v1/admin/invites`
- `POST /api/v1/admin/invites/:inviteId/revoke`
- `GET /api/v1/admin/registration-mode`
- `PUT /api/v1/admin/registration-mode`
- `GET /api/v1/admin/members`
- `POST /api/v1/admin/members/:memberId/remove`
- `POST /api/v1/admin/members/:memberId/ban`
- `POST /api/v1/admin/members/:memberId/temp-password`
- `GET /api/v1/admin/chats/:chatId/messages`

Important boundary:
- admin backend exists now
- separate admin site UI is still deferred

### Moderation visibility rule

The rebuild now has two moderation layers:

- account-level moderation:
  - removed/banned users lose access immediately
  - their old messages are hidden behind generic tombstones in normal member chat history
- message-level moderation:
  - admins can hide and later restore individual messages
  - both actions require a moderator reason
  - normal members see a generic tombstone
  - admin audit still shows the original content plus the latest moderation metadata

Important rule:
- moderation is reversible in v1
- there is still no hard delete in this slice
- moderator reasons stay admin-only

## What was verified

Live PostgreSQL integration tests now cover:

- admin bootstrap
- multi-invite CRUD and revocation
- registration mode toggle (invite_only / closed)
- profile update
- recovery code rotation
- password change
- temporary password + forced password change
- immediate remove/ban access revocation
- hidden-message member vs admin visibility

## What this unlocks next

This slice makes the next frontend work worth doing:

- settings/profile screen
- member directory UI
- forced password change gate
- later admin site work

It also gives Gemini a stable contract surface for the member-facing UI pass.

## What Phase 2 added

Balanced Admin Suite v1 added:

- `POST /api/v1/admin/messages/:messageId/hide`
- `POST /api/v1/admin/messages/:messageId/unhide`
- append-only moderation event logging
- realtime member updates that flip moderated messages into tombstones without reload
- a dedicated admin moderation panel in Settings
- richer read-only operator diagnostics for:
  - realtime socket state
  - moderation counts
  - push/device preference counts

## What Phase 3 added

Invite and Onboarding Controls v1 replaced the single master invite code with multi-invite management:

- `signup_invites` restructured: UUID primary key, label column, optional max_uses and expires_at
- `server_settings` table stores registration mode (invite_only or closed)
- admin can create, list, and revoke invite codes
- registration checks mode first (closed rejects with 403), then validates any active invite by code
- public `GET /api/v1/auth/config` exposes registration mode to unauthenticated clients
- dedicated Invites tab in admin settings with registration mode toggle
- AuthPanel reflects closed mode by replacing the registration form with a notice
