Implement Session and Device Management v1 for The Penthouse rebuild. Use this prompt as the contract. Take your time and optimize for qualitative results, not speed.

Project context
- The Penthouse rebuild is live publicly
- Mobile: Vue 3 + Vite + Capacitor
- Backend: Fastify + PostgreSQL
- Shared contracts in `packages/contracts`
- Existing auth/session behavior already includes:
  - access + refresh token flow
  - logout of the current refresh token
  - password change flow
  - push/device-token registration and notification preferences
- Existing settings UI already includes:
  - profile/password
  - notification controls
  - media controls

What this slice should do
- let a signed-in member see their active sessions/devices
- mark the current session clearly
- let them revoke other sessions
- optionally let them revoke all other sessions in one action if it fits cleanly
- surface a few useful device details without turning this into a full security center

Build this exact slice

1. Session/device model
- Treat each refresh token row as a user session.
- Extend session storage so each refresh-token-backed session has useful metadata:
  - session id
  - user id
  - created at
  - last used at
  - platform/device label
  - app context if practical (`android`, `web`, etc.)
  - push token presence boolean if practical
- The smallest clean design is acceptable:
  - extend `refresh_tokens`
  - or add a closely related session metadata table keyed by refresh token id
- Keep it privacy-conscious:
  - no raw push token values
  - no raw IP storage unless already present and genuinely needed

2. Backend endpoints
- Add member-authenticated routes for:
  - `GET /api/v1/me/sessions`
  - `DELETE /api/v1/me/sessions/:sessionId`
- Optional but recommended if clean:
  - `DELETE /api/v1/me/sessions/others`
- Rules:
  - users can only see their own sessions
  - users can revoke their other sessions
  - if they revoke the current session directly, the API should behave intentionally and clearly
    - either allow it and force logout
    - or reject it and require current-session logout through the normal logout path
  - pick one clear behavior and test it

3. Session metadata capture
- Capture/update session metadata during:
  - login
  - register
  - refresh
- Use the smallest reliable device description available from the current app:
  - Capacitor device/platform info on native if practical
  - browser-ish fallback on web
- Do not over-engineer a fingerprinting system
- A simple human-readable label is enough, for example:
  - `Android app`
  - `Web browser`
  - `Android app (current device)`

4. Member-facing UI
- Add a new section in the existing settings surface, not a new global screen
- Show:
  - current session/device
  - other active sessions/devices
  - last active / created time
  - a concise device/platform label
  - whether push is active on this device if practical
- Add actions:
  - revoke one session
  - revoke all other sessions if implemented
- Keep the UI calm and utilitarian
- Do not turn this into a visual redesign

5. Device-awareness extras
- If it fits cleanly, show small read-only extras such as:
  - whether this current device has push enabled
  - count of muted DM threads on this device if easy from existing data
- These are optional only if they are genuinely cheap and coherent
- Do not widen into a full diagnostics page

6. Keep scope tight
- no account-recovery redesign
- no MFA
- no IP/geolocation map
- no browser fingerprinting
- no trust-device flows
- no admin management of other users’ sessions in this pass

Likely files
- `packages/contracts/src/api.ts`
- `packages/contracts/openapi.v1.yaml`
- `services/api/src/routes/auth.ts`
- `services/api/src/routes/members.ts`
- relevant migration file(s)
- `services/api/src/utils/sessions.ts`
- `apps/mobile/src/services/http.ts`
- `apps/mobile/src/App.vue`
- `apps/mobile/src/components/ProfileSettings.vue`
- relevant tests

Behavior expectations
- session list should be truthful and easy to read
- revoking another session should invalidate its refresh token immediately
- current session should remain stable when revoking others
- password-change/session-reset behavior should remain coherent with the new session list

Tests
- Backend:
  - list own sessions
  - cannot see another user’s sessions
  - revoke one other session
  - revoked session can no longer refresh
  - current session behavior is explicitly tested
- Frontend:
  - settings renders session/device list
  - current session is labeled clearly
  - revoke action calls correct endpoint and refreshes the list
  - revoke-all-others flow if implemented
- Manual proof still worth doing:
  - same account on two devices
  - revoke one from the other
  - confirm the revoked one loses session refresh and eventually gets forced out

Docs
- Update project memory briefly if this lands:
  - `docs/obsidian/00 - Knowledge Hub.md`
  - `docs/obsidian/13 - MVP Stability Plan v2.md`

Validation
- run relevant mobile tests
- run relevant backend tests
- run `npm --workspace apps/mobile run build`
- run `npm run validate`

Return
1. Root cause addressed
2. Files changed
3. New API / contract shapes
4. Tests updated
5. Validation results
6. Any remaining runtime risk or manual proof still worth doing
