# Opencode Prompt: Android Release Readiness

Implement a tightly bounded Android release-readiness pass for The Penthouse rebuild.

Project
- The Penthouse rebuild
- Mobile: Vue 3 + Vite + Capacitor
- Local branch may be `main`, but the working line is effectively `origin/rebuild`

Current facts
- The release build can be produced, but the output is currently `app-release-unsigned.apk`
- No existing `.jks` / `.keystore` has been found
- Public rollout is being treated as a fresh-install path unless the old signing key later turns up
- Do not generate or commit secrets/keys in this pass

Goal
Make the repo ready for a proper signed Android release build without widening scope.

Implement only these items

1. Bump Android version metadata from the Capacitor defaults
- `versionCode` should move off `1`
- `versionName` should stop being plain `1.0`
- Pick a sensible rebuild baseline for first public release readiness
- Keep it plain and intentional, not elaborate

2. Add optional signing support to the Android build
- Wire `apps/mobile/android/app/build.gradle` so a signing config can be supplied from environment variables or a local Gradle properties file
- It must remain safe for local development if no signing values are present
- Do not hard-code passwords or key paths
- Do not require secrets to exist in the repo

3. Document the signed build flow
- Update deployment/build docs so a human can:
  - create or point to a keystore
  - supply signing values locally
  - build a signed APK for the rebuild
- Keep the docs plain and practical

4. Keep scope tight
- no Play Console workflow expansion beyond what is needed to explain signing
- no mobile feature changes
- no auth/chat changes
- no iOS
- no deployment redesign

Likely files
- `apps/mobile/android/app/build.gradle`
- `docs/DEPLOYMENT.md`
- `docs/TRUENAS_DEPLOYMENT.md`
- `README.md`
- any local build helper docs you add

Validation
- run the relevant Android release build command(s)
- confirm the unsigned fallback still works when no signing vars are present
- if you can validate the signed path structurally without a real key, do that and explain the limit clearly

Return
1. Root cause / why this was blocking public APK readiness
2. Files changed
3. Validation results
4. Exactly what a human still needs to provide outside the repo
