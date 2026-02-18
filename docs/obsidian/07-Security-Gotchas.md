# Security Gotchas (Self-Hosted, Public Internet)

This is a grab-bag of mistakes that are common in “first internet deployment” setups.

## 1. Token Leaks (Screenshots, Chat Logs)

If an API token gets pasted into chat or a screenshot:

- assume compromise
- revoke immediately
- rotate and scope down

In this project, that happened with a Cloudflare API token during DDNS setup. The correct response is always revoke + re-issue.

## 2. CORS With Credentials + Wildcard

If you set:

- `credentials: true`
- `origin: *`

Browsers will reject it or behave unexpectedly. In production, use an explicit allowlist and error loudly if misconfigured.

## 3. Reverse Proxy Client IP

Without `app.set('trust proxy', 1)` behind Caddy, your app sees the proxy IP for every request.

This breaks:

- rate limiting (all clients share a bucket)
- logging and abuse correlation

## 4. Home IP Drift

The "server is down" symptom is often just:

- DNS points to old IP

Fix:

- DDNS updater
- logs/alerting

## 5. WebSocket Authorization

It is easy to forget that “HTTP auth” does not automatically protect Socket.IO events.

Minimum safe posture:

- authenticate the socket
- verify membership/authorization per event (or cache briefly)

## 6. IDOR in Message Endpoints

Routes like `/messages/:messageId/...` must re-check:

- what chat that message belongs to
- whether the user is a member of that chat

Ownership checks alone are not enough.

## 7. Upload Deletion Paths

Never delete paths directly from DB/user input.

Use:

- `path.basename()`
- fixed upload root

So `../../etc/passwd` style paths cannot escape.

