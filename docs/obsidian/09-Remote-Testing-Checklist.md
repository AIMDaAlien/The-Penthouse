# Remote Testing Checklist (Across the Sea)

Goal: a tester in another region can install the app, sign up, join your server, and use chat without weird failures.

## Preflight (Owner)

- DNS:
  - `penthouse.blog` -> your current public IP
  - `api.penthouse.blog` -> your current public IP
- Router port forwards:
  - WAN `80` -> TrueNAS `9080`
  - WAN `443` -> TrueNAS `9443`
- TrueNAS stack is up:
  - `docker compose ps` shows `penthouse-app` healthy and `caddy` running.

## API Reachability (Owner)

From TrueNAS:

```bash
curl -I https://api.penthouse.blog/api/health
```

Expected:
- `HTTP/2 200`
- `X-Response-Time: <ms>ms`
- `Server-Timing: app;dur=<ms>`

From another network (phone LTE or a friend’s internet):

```bash
curl -I https://api.penthouse.blog/api/health
```

If the server is down, the mobile app should show the offline banner.

## APK Delivery (Owner)

- Confirm the download URL works:
  - `https://penthouse.blog/downloads/the-penthouse.apk`
- Optional update feed:
  - `https://api.penthouse.blog/api/app/update`

## Tester Flow (Remote Tester)

1. Install APK from `penthouse.blog`.
2. Register a new account (or use credentials you give them).
3. Join the server via an invite code.
4. Verify core chat:
   - send/receive messages
   - reactions
   - read receipts
   - pins
5. Verify media:
   - upload image
   - upload voice
6. Verify presence:
   - background app and reopen (WebSocket reconnect)

## Bug Report Minimums (Tester)

Ask testers to provide:
- their rough location + ISP type (wifi vs LTE)
- timestamp (include timezone)
- what screen they were on
- screenshot/video
- whether the “server offline” banner appeared

## Owner Debug Commands (TrueNAS)

```bash
cd /mnt/Storage_Pool/penthouse/app
docker compose logs --tail=200 penthouse-app
docker compose logs --tail=200 caddy
```

