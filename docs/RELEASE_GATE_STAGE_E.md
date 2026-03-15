# Stage E Release Gate

Use this command to run release-readiness checks in one pass:

```bash
npm run release:gate
```

What it runs:

1. `npm run validate`
2. `npm run scenario:test`
3. `npm --workspace services/api run test:integration` (only when `DATABASE_URL` is set)

## Strict production mode

For production-impact releases, force integration tests:

```bash
DATABASE_URL=postgresql://penthouse:penthouse@localhost:5432/penthouse_test \
JWT_SECRET=local-test-jwt-secret-long-enough \
  npm run release:gate -- --require-db
```

If `DATABASE_URL` is missing in strict mode, the gate fails.

## Why this exists

- Prevents "forgot to run one command" releases.
- Makes release checks repeatable for contributors and reviewers.
- Keeps the project aligned with stability-first and rollback-first execution.
