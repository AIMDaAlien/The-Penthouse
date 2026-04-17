# Agent Handoff Format

When a frontend change requires a backend change (or vice versa), leave a handoff note in the task description or as a comment in the relevant contracts file.

## Format

```
HANDOFF → [target agent] [target file]
Needs: [exact endpoint shape / event name / type change]
Why: [one sentence]
```

## Example

```
HANDOFF → Codex services/api/src/routes/chats.ts
Needs: GET /api/v1/chats/:chatId/messages to return `cursor` field in response
Why: Frontend pagination uses cursor-based scroll
```

## Rules

- Be exact — name the file, the field, the type
- One handoff note per change needed
- The receiving agent must acknowledge before implementing
