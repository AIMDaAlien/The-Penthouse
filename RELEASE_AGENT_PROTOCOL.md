# The Penthouse Release Agent Protocol

This file is the source of truth for any AI agent preparing and publishing app updates.

Goal: every meaningful app change ships with:
- correct SemVer version bump
- APK publish to `penthouse.blog`
- GitHub Release asset + notes
- human-readable changelog entry

## 1. Pipeline Snapshot

Primary workflows:
- `.github/workflows/deploy-truenas.yml`
  - runs on pushes to `main`
  - builds Android APK (EAS)
  - generates release notes from commit range
  - publishes GitHub Release (`v<expo.version>`)
  - deploys server + APK to TrueNAS
- `.github/workflows/eas-ota-update.yml`
  - runs on pushes to `main` affecting `mobile/**`
  - publishes OTA update to EAS `preview` branch

Version lock rules enforced in CI:
- `mobile/app.json` -> `expo.version`
- `mobile/package.json` -> `version`
- must match and be `x.y.z`

## 2. Release Type Decision

Use SemVer:
- `patch`: fixes, perf, security hardening, no breaking behavior
- `minor`: new backward-compatible features
- `major`: breaking API/client behavior or migration-heavy change

Default policy for this project:
- if update is significant/user-visible, bump at least `minor`
- if breaking, bump `major`

## 3. Required Files To Update

For every release:
1. Bump mobile version in both files (and lockfile) using:
   - `./scripts/bump_mobile_version.sh patch|minor|major|x.y.z`
2. Update `CHANGELOG.md` with a new section at top.

Optional but recommended:
- update `README.md` if behavior/install flow changed
- update `DEPLOYMENT.md` if infra or ops flow changed

## 4. Human-Readable Changelog Standard

Audience: non-engineering users first, developers second.

Rules:
- start with user impact, not internal implementation
- one line per change, plain language, no vague filler
- avoid raw commit prefixes (`feat:`, `fix:`) in changelog bullets
- group by intent using sections only when relevant:
  - `Added`
  - `Changed`
  - `Fixed`
  - `Performance`
  - `Security`
  - `Ops`
- include concrete nouns (screen, feature, endpoint, download path)

Voice:
- direct, grounded, human
- no hype terms, no robotic phrasing

Bad:
- "improved architecture and optimized workflow"

Good:
- "Login now retries token refresh once before signing you out."

## 5. Commit Message Standard (Important)

Release notes in CI are generated from commit subjects via `scripts/generate_release_notes.sh`.
To keep auto-generated notes readable, write clean commit subjects:

- concise, user-facing impact first
- avoid noisy scope-only messages
- prefer:
  - `fix: app no longer shows persistent server unreachable toast`
  - `feat: add GitHub release APK assets for downgrade support`

## 6. Agent Execution Checklist

Run in this exact order:

1. Sync and inspect
   - `git pull --ff-only`
   - review changes to ship

2. Choose SemVer bump
   - apply policy in Section 2

3. Bump version
   - `./scripts/bump_mobile_version.sh <target>`

4. Update changelog
   - prepend `## [x.y.z] - YYYY-MM-DD`
   - add user-readable bullets by section

5. Validate before commit
   - `git diff -- mobile/app.json mobile/package.json mobile/package-lock.json CHANGELOG.md`
   - ensure versions match

6. Commit
   - include release intent in message
   - example: `release: bump mobile to 1.3.0 and document user-facing changes`

7. Push
   - `git push origin main`

8. Verify GitHub Actions
   - `deploy-truenas` passed
   - if mobile changed, `eas-ota-update` passed

9. Verify production
   - `https://penthouse.blog/` loads
   - `https://penthouse.blog/downloads/the-penthouse.apk` downloads
   - `https://api.penthouse.blog/api/health` returns OK
   - GitHub Release exists for `v<version>` with APK asset

## 7. Failure Handling

If deploy fails:
1. inspect workflow logs first
2. prioritize root-cause fix commit (do not bypass checks silently)
3. re-run failed job only after commit is on `main`
4. record the fix in `CHANGELOG.md` under `Fixed` or `Ops`

If app health fails with SQLite errors:
- verify host `data/` ownership and permissions
- verify container can write `/app/data/penthouse.sqlite`
- redeploy after permissions are corrected

## 8. Definition Of Done

A release is done only when all are true:
- versions aligned (`app.json` + `package.json`)
- `CHANGELOG.md` updated with human-readable notes
- `main` pushed
- `deploy-truenas` successful
- site and APK endpoint are reachable
- GitHub Release tag + APK asset published
