# Opencode Prompt: Klipy Picker Animation Fix

Implement a tightly bounded fix for Klipy preview behavior in the GIF picker.

Project
- The Penthouse
- Current line is effectively `origin/rebuild` even if the local branch is `main`
- Mobile: Vue 3 + Vite + Capacitor

Confirmed runtime symptom
- Klipy GIFs animate correctly once sent in chat
- Klipy GIFs are still static inside the GIF picker
- Giphy behaves correctly

Goal
Make Klipy previews in the picker feel correct without redesigning the picker or disturbing the already-working in-chat Klipy behavior.

Focus only on
- `apps/mobile/src/components/GifPicker.vue`
- any helper/metadata seam needed to decide whether Klipy should preview as video or animated image
- targeted tests only

Likely seams to inspect
- `apps/mobile/src/components/GifPicker.vue`
- `apps/mobile/src/components/MessageList.vue`
- `services/api/src/routes/media.ts`
- `packages/contracts/src/api.ts`

Requirements
- Keep the fix narrow
- Preserve current Giphy behavior
- Preserve current in-chat Klipy behavior
- If Klipy image-mode results are still using a static preview in the picker, switch to the correct animated asset or another clearly intentional preview strategy
- If platform/runtime limitations force a compromise, document the exact tradeoff instead of pretending it is fixed

Do not do
- no push changes
- no auth/session changes
- no broad GIF picker redesign
- no visual redesign of the app shell

Validation
- relevant mobile tests
- `npm --workspace apps/mobile run build`
- call out anything that still needs emulator proof

Return
1. Root cause
2. Files changed
3. Tests updated
4. Validation results
5. Remaining runtime risk, if any
