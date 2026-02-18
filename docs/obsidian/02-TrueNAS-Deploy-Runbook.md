# TrueNAS Deploy Runbook (SCALE 25.x + Compose)

These steps assume a hardened baseline with:

- Docker Compose
- Caddy edge proxy
- `.env` file for secrets/config

## Paths (Example)

- App root: `/mnt/Storage_Pool/penthouse/app`
- Data: `/mnt/Storage_Pool/penthouse/app/data`

## One-Time Setup

1. Clone repo into the dataset

```bash
cd /mnt/Storage_Pool/penthouse
git clone https://github.com/AIMDaAlien/The-Penthouse.git app
cd app
```

2. Create `.env`

```bash
cp server/.env.example .env
chmod 600 .env
```

Set required values:

```env
NODE_ENV=production
PORT=3000
JWT_SECRET=<strong random secret>
CORS_ORIGIN=https://penthouse.blog,https://api.penthouse.blog
DOMAIN=penthouse.blog
ENABLE_DEBUG_ENDPOINTS=false
```

3. Start stack

```bash
./scripts/start_stack.sh
docker compose ps
```

4. Validate internal health

```bash
docker compose exec -T penthouse-app wget -q --spider http://localhost:3000/api/health && echo ok
```

5. Validate external health

```bash
curl -fsSL https://penthouse.blog/api/health
curl -fsSL https://api.penthouse.blog/api/health
```

## Auto Start

Two common ways:

### Option A: TrueNAS UI (Init/Shutdown Scripts)

- System Settings -> Advanced -> Init/Shutdown Scripts
- Add a **Post Init** command to run:

`/mnt/Storage_Pool/penthouse/app/scripts/start_stack.sh`

### Option B: Cron `@reboot` + Watchdog

```bash
cd /mnt/Storage_Pool/penthouse/app
./scripts/enable_autostart.sh
crontab -l
```

This installs:

- `@reboot` start
- `*/5` watchdog self-heal
- optional backups (restic) when `.backup.env` exists
- optional Cloudflare DDNS when `.cloudflare-ddns.env` exists

## Common Checks

- Containers:

```bash
docker compose ps
docker compose logs --tail=200 penthouse-app
docker compose logs --tail=200 caddy
```

- If TLS fails:
  - Check Cloudflare `A` records match the real public IP.
  - Check router forwards WAN 80/443 correctly.
  - Check you are not behind CGNAT.

