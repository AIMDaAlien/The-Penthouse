# Migration Safety Rule

## Before running migrations

1. Create DB backup:
```bash
pg_dump "$DATABASE_URL" > backup-before-migration.sql
```

2. Apply migration:
```bash
npm run migrate
```

## Rollback

Each migration must include a matching `.down.sql` file.

For `001_initial.sql` rollback:
```bash
psql "$DATABASE_URL" -f src/db/migrations/001_initial.down.sql
```

## Notes

- Never run destructive migrations on production without explicit approval.
- If data loss risk exists, restore from backup first, then rerun migration plan.
