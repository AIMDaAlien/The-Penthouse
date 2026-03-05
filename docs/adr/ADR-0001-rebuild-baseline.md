# ADR-0001: Rebuild Baseline

## Status
Accepted (2026-03-05)

## Decision
Use a clean-room rebuild with:
- Vue + Vite + Capacitor (Android first)
- Fastify + PostgreSQL backend
- Contract-first development via shared schemas
- Serial gated delivery with verify-first evidence policy

## Why
- Reduces entropy from previous iteration
- Keeps architecture understandable for non-engineering operation
- Minimizes infrastructure demands on unstable bare-metal host

## Consequences
- First release intentionally constrained to auth + core chat + light offline
- Data starts fresh; migration tooling is deferred
- High-risk changes require explicit approval + rollback path
