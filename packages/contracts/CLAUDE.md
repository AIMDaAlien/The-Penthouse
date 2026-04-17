# packages/contracts — Shared Schemas & Types

## Owned by: Both agents (coordination required)
Changes here affect BOTH the frontend and backend.
Before changing a schema, confirm both sides can absorb the change.
Document every non-trivial change with a comment explaining why.

---

## What this package is
The single source of truth for request/response shapes, event payloads, and shared types.
Both `apps/web` and `services/api` import from here.
If the contracts are wrong, both sides break simultaneously.

---

## Files
```
src/
├── api.ts       ← REST request/response Zod schemas (login, register, messages, etc.)
├── events.ts    ← Socket.IO event payload types
├── workflow.ts  ← Workflow/task types (used by admin suite)
└── index.ts     ← Re-exports everything
```

---

## Rules for editing contracts

1. **Never remove a field that either side still uses.** Mark it optional before removal.
2. **Never rename a field without updating both sides simultaneously.**
3. **Add fields as optional (`z.string().optional()`) unless both sides are updated in the same task.**
4. **Schema names follow the pattern:** `[Resource][Action]RequestSchema` / `[Resource][Action]ResponseSchema`

---

## How to add a new endpoint contract
1. Add the Zod schema to `src/api.ts`
2. Export it from `src/index.ts`
3. Leave a HANDOFF comment indicating which agent needs to implement which side:
```typescript
// HANDOFF → Claude: apps/web/src/services/api.ts — consume this schema
// HANDOFF → Codex: services/api/src/routes/chats.ts — implement this route
```

---

## What this package does NOT contain
- No business logic
- No database queries
- No UI components
- No environment-specific configuration
