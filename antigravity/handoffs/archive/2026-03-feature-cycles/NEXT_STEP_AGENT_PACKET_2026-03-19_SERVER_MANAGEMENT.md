# Server Management Packet

## Current truth

The rebuild is now the live public-facing Penthouse app.

What has already been proven recently:

- `penthouse.blog` serves the rebuild landing page
- `api.penthouse.blog` is healthy
- the signed rebuild APK is downloadable
- Android push works in real runtime testing
- the first admin user-management slice is in place and tightened

## What is actually missing

The next missing admin/operator slice is **server management**, but it should start as a read-only operator panel, not a remote-control console.

There is already:

- a basic `/api/v1/health` route
- admin/member management APIs
- settings/admin UI structure on mobile

There is **not** yet:

- an admin-facing server/operator overview
- a single summary view of app health, member/content counts, invite state, and push readiness
- a safe read-only operator panel for routine checks after the public cutover

## Scope for this round

Build the **first server-management/operator slice**.

That slice should be:

- admin-only
- read-only
- operationally useful
- safe to expose to admins without leaking secrets

## First slice target

1. Admin can open a server/operator panel from settings
2. Admin can see a current summary of backend health
3. Admin can see read-only counts that help run the app day to day
4. Admin can see whether important integrations are configured, without exposing raw secrets
5. Admin can manually refresh the panel

## Good first-panel contents

- API/app health and last checked time
- database reachable status
- member counts:
  - total
  - active
  - banned
  - removed
  - admins
- content counts:
  - chats
  - messages
  - uploads
  - upload bytes total, if already easy from DB
- invite snapshot:
  - current code
  - uses
  - max uses
  - created time
- push snapshot:
  - whether push is configured
  - Android token count
  - iOS token count

## Not in this slice

- server restart buttons
- remote shell/log viewer
- database mutation tools
- analytics/event dashboards
- role editing/admin promotion flows
- public-site redesign
- new moderation flows

## Agent order

1. `Opencode`
   - implement the first admin/operator server-management slice
2. `Claude Opus 4.6`
   - review for auth leaks, secret leakage, expensive queries, stale-state mistakes, and operator confusion

## Parallel human check

While this slice is being built or reviewed, do one short live admin pass:

1. rotate the live invite
2. issue one temporary password
3. remove one test account
4. ban one test account

That confirms the first user-management slice still feels right on the live stack while the next operator slice is underway.
