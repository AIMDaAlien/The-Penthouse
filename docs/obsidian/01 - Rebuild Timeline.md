---
tags: [penthouse, timeline, changelog, rebuild]
created: 2026-03-05
---

# Rebuild Timeline

## Why this rebuild exists

The previous iteration accumulated too many intertwined changes. Fixing one thing broke another.  
The rebuild goal is stability first, with a strict order of implementation to prevent future cleanup pain.

## Locked baseline

- Mobile app: Vue 3 + Vite + Capacitor (Android-first)
- Backend: Fastify + PostgreSQL
- Shared contracts: `packages/contracts`
- Process: verify-first evidence, serial gated workflow, explicit owner/reviewer/arbiter

## Timeline of concrete progress

### 2026-03-04 - Stage B/C backend hardening

Commit: `18fc1aa`  
Highlights:
- Added integration tests for auth rotation/logout and chat authorization/idempotency.
- Normalized refresh error messages to avoid token lifecycle leakage.
- Filled OpenAPI spec from stub to full contract coverage.

### 2026-03-04 - Mobile app decomposition

Commit: `93ca6f1`  
Highlights:
- Split monolithic `App.vue` into focused components:
  - `AuthPanel`
  - `ChatListPanel`
  - `MessageList`
  - `MessageComposer`
  - `ConnectionStatus`
- Added mobile-first responsive behavior and clearer chat UI states.

### 2026-03-04 - Mobile review fixes

Commit: `8e38ee2`  
Highlights:
- Socket auth now reads token dynamically on reconnect.
- Re-join chat room on reconnect.
- Queue flush no longer blocks on one failed item.
- Removed dead code/CSS.

### 2026-03-05 - Test harness maturity

Commit: `ca53a8f`  
Highlights:
- Migrated UI tests to Vitest + happy-dom.
- Added optimistic-message flow tests in `App.test.ts`.
- Landed 17 passing mobile tests.

### 2026-03-05 - Race hardening pass (working tree)

Current uncommitted hardening pass:
- Atomic refresh rotation to prevent concurrent replay minting multiple refresh tokens.
- Atomic message idempotency handling for REST and Socket paths using conflict-safe insert.
- Added concurrent regression tests for both cases.
- Added safe parsing for stored user data to prevent boot crash on corrupt localStorage.

## Where this leaves us

- Stages A-C are effectively in place.
- Stage D (reliability layer hardening and non-skipped DB integration in CI) is the next focus.
- Stage E (release gate) starts after Stage D exits cleanly.

### 2026-03-08 - User management backend foundation

Current working tree:
- Added user profile fields, roles, statuses, avatar linkage, and forced-password-change support.
- Added member self-service APIs for profile update, password change, and recovery code rotation.
- Added member directory APIs.
- Added admin backend APIs for invite rotation, member search, remove, ban, temp password, and chat audit history.
- Tightened auth so protected requests reload live user state from the database.
- Added integration coverage for admin bootstrap, invite rotation, temp-password flow, access revocation, and moderation-hidden messages.
