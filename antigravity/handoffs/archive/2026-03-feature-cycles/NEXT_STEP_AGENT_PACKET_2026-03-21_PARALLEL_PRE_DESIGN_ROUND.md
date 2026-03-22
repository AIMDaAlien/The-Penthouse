# Parallel Pre-Design Functional Round

## Summary

Run the next round as two parallel implementation tracks so we can move faster without lowering the bar on product quality.

Important instruction for both agents:
- take your time
- prioritize qualitative results over rushing
- keep scope disciplined
- prefer clean seams, good tests, and user-facing clarity over broad feature sprawl

The two tracks are intentionally split to minimize file overlap:

1. `Opencode` implements **Session and Device Management v1**
2. `Claude / Opus` implements **Invite and Onboarding Controls v1**

These are the last major functional slices to land before the app can sensibly move into a stronger visual design pass.

## Why This Split

### Track A: Session and Device Management v1
- mostly member-facing
- centered around auth/session/device state
- natural seams:
  - `services/api/src/routes/auth.ts`
  - `services/api/src/routes/members.ts`
  - `apps/mobile/src/components/ProfileSettings.vue`
  - `apps/mobile/src/services/http.ts`
  - `packages/contracts/src/api.ts`

### Track B: Invite and Onboarding Controls v1
- mostly admin/onboarding-facing
- centered around invite lifecycle and registration policy
- natural seams:
  - `services/api/src/routes/auth.ts`
  - `services/api/src/routes/admin.ts`
  - `apps/mobile/src/components/AdminMemberManagement.vue`
  - `apps/mobile/src/components/AuthPanel.vue`
  - `packages/contracts/src/api.ts`

The only real shared file risk is `packages/contracts/src/api.ts` and `packages/contracts/openapi.v1.yaml`. That overlap is acceptable as long as each agent keeps changes bounded to its own schemas and avoids unrelated cleanup.

## Track A Deliverable

`Session and Device Management v1`

Goal:
- let members see and manage active sessions/devices
- let them revoke other sessions
- label the current session
- surface meaningful device state such as push-enabled / muted-DM count if practical

Output:
- implementation prompt:
  - `OPENCODE_SESSION_DEVICE_MANAGEMENT_V1_2026-03-21.md`

## Track B Deliverable

`Invite and Onboarding Controls v1`

Goal:
- move beyond a single master invite
- add multiple invite codes with labels and limits
- add a simple registration mode control
- make onboarding state and invite management explicit in admin UI

Output:
- implementation prompt:
  - `OPUS_INVITE_ONBOARDING_CONTROLS_V1_2026-03-21.md`

## Ground Rules For Both

- no broad visual redesign yet
- no speculative future-platform work
- no analytics/dashboard bloat
- no “just enough to pass” shortcuts
- keep tests strong
- if a feature needs a small product choice, pick the smallest coherent option and document it

## Recommended Run Order

Run both in parallel now.

When both land:
1. merge the stronger implementation details
2. do one integration pass for auth/session/register/admin seams
3. then decide whether Ops Hardening v2 still needs a dedicated pass before visual redesign
