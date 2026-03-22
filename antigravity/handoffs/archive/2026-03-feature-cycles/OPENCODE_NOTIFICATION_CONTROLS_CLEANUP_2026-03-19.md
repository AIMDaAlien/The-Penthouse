Implement a tiny cleanup pass on the notification-controls slice for The Penthouse rebuild. Use Claude’s review as the contract. Do not widen scope.

Project
- The Penthouse rebuild
- Notification-controls slice has already landed
- Backend carry-forward support for token rotation already exists
- This is not a redesign pass

What is actually wrong
- The mobile app receives `previousToken` in `handlePushTokenSync(...)`
- The backend registration route already supports `previousToken` and can carry notification settings forward
- But the mobile app is currently calling:
  - `registerDeviceToken('android', token)`
- That means Firebase token rotation silently resets the device’s notification settings

Implement only these items

1. Fix token-rotation carry-forward
- In `apps/mobile/src/App.vue`, pass `previousToken` into `registerDeviceToken(...)`
- The intended call shape is:
  - `registerDeviceToken('android', token, previousToken)`
- Keep the rest of the sync flow intact

2. Add mobile-layer test coverage for this exact bug
- Add or update a test proving that when a token refresh event provides both:
  - `token`
  - `previousToken`
- the mobile app calls `registerDeviceToken` with the previous token included
- This should close the current false-confidence gap between:
  - backend integration coverage
  - actual mobile app wiring

3. Keep scope tight
- do not redesign quiet-hours UX
- do not change GET query-string token usage in this pass
- do not redesign the settings form
- do not add timezone travel detection
- do not widen into multi-device management

Likely files
- `apps/mobile/src/App.vue`
- `apps/mobile/src/App.test.ts`

Validation
- run relevant mobile tests
- run `npm --workspace apps/mobile run build`
- run `npm run validate`

Return
1. Root cause addressed
2. Files changed
3. Tests updated
4. Validation results
5. Any remaining tiny cleanup worth doing later
