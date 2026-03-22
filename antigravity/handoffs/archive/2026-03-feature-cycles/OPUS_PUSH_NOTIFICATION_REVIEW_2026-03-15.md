# Opus Review Prompt: Android-First Push Notification Slice

Review the newly implemented Android-first push notification slice for The Penthouse.

## Review focus

- token registration and cleanup correctness
- backend token storage safety
- push send trigger correctness on new incoming messages
- open-from-notification routing into the correct chat
- suppression behavior versus active in-app reading
- regression risk on existing local notification and read-receipt behavior

## Explicit checks

1. Token lifecycle
   - duplicate token handling
   - logout cleanup
   - stale token replacement
2. Delivery logic
   - sender exclusion
   - fan-out safety
   - failure handling if a token is dead
3. UX correctness
   - no noisy duplicate alerts while actively reading
   - tapping a push lands in the intended chat
4. Safety
   - no broad auth/session regressions
   - no accidental backend-contract churn beyond the scoped seam

## Output rules

- Findings first, severity ordered
- Include file references
- Call out anything that still requires manual Android proof
- Do not suggest broad redesign beyond this slice
