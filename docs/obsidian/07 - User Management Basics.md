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

- `GET /api/v1/admin/invite`
- `POST /api/v1/admin/invite/rotate`
- `GET /api/v1/admin/members`
- `POST /api/v1/admin/members/:memberId/remove`
- `POST /api/v1/admin/members/:memberId/ban`
- `POST /api/v1/admin/members/:memberId/temp-password`
- `GET /api/v1/admin/chats/:chatId/messages`

Important boundary:
- admin backend exists now
- separate admin site UI is still deferred

### Moderation visibility rule

Messages from removed/banned users are:

- hidden in normal member chat history
- still visible in the admin audit endpoint

That gives you moderation without destructive deletion.

## What was verified

Live PostgreSQL integration tests now cover:

- admin bootstrap
- invite rotation
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
