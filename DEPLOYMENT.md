# Deploying The Penthouse on TrueNAS (Production)

This guide is the hardened baseline for your on-prem setup:
- Public entry on `https://penthouse.blog`
- API/WebSocket on `https://api.penthouse.blog`
- Git-push auto deploy to TrueNAS with self-hosted runner
- Encrypted offsite backups with `restic`
- DNS failover automation via Cloudflare workflow

---

## 1. Prerequisites

- TrueNAS SCALE host with Docker Compose
- Repo: `https://github.com/AIMDaAlien/The-Penthouse`
- DNS control for `penthouse.blog` and `api.penthouse.blog`
- Router/NAT control for inbound forwarding
- GitHub repo admin access (for Actions secrets)

---

## 2. Clone + Environment

```bash
ssh root@your-truenas-ip
cd /mnt/Storage_Pool/penthouse
git clone https://github.com/AIMDaAlien/The-Penthouse.git app
cd app
cp server/.env.example .env
```

Set required production values in `.env`:

```env
NODE_ENV=production
PORT=3000
JWT_SECRET=<openssl rand -base64 32>
CORS_ORIGIN=https://penthouse.blog,https://api.penthouse.blog
DOMAIN=penthouse.blog
ENABLE_DEBUG_ENDPOINTS=false
```

Notes:
- `JWT_SECRET` must be set.
- `CORS_ORIGIN` must be set.
- Wildcard defaults are blocked by compose hardening.

---

## 3. DNS + Port Forwarding

Create DNS records:
- `A penthouse.blog -> <your public IP>`
- `A api.penthouse.blog -> <your public IP>`

Router forwards:
- WAN `80 -> TrueNAS:9080`
- WAN `443 -> TrueNAS:9443`

---

## 4. Start and Validate

```bash
./scripts/start_stack.sh
```

Validate health:

```bash
docker compose exec -T penthouse-app wget -q --spider http://localhost:3000/api/health && echo ok
```

View running services:

```bash
docker compose ps
```

---

## 5. Auto-Start + Self-Heal

Install cron jobs for reboot start, watchdog, and backup schedule:

```bash
./scripts/enable_autostart.sh
crontab -l
```

Installed jobs:
- `@reboot` stack start
- `*/5` watchdog health check + recovery
- `*/5` Cloudflare DDNS updater (when `.cloudflare-ddns.env` exists)
- `03:17 daily` encrypted backup (when `.backup.env` exists)
- `03:47 Sunday` backup prune (when `.backup.env` exists)
- `04:11 Sunday` rotate host cron logs (`/var/log/penthouse-*.log`)
- `04:23 Sunday` prune docker build cache + unused images (safe defaults)
- `04:33 Sunday` SQLite maintenance (checkpoint + optimize)

### Cloudflare DDNS (Recommended)

This prevents outages when your home ISP changes your public IP.

On TrueNAS, create the env file:

```bash
cd /mnt/Storage_Pool/penthouse/app
cp .cloudflare-ddns.env.example .cloudflare-ddns.env
chmod 600 .cloudflare-ddns.env
```

Edit `.cloudflare-ddns.env` and set `CF_API_TOKEN` (and optionally IDs).

Run once to verify:

```bash
./scripts/cloudflare_ddns.sh
tail -n 50 /var/log/penthouse-ddns.log
```

---

## 6.1 Disk Exhaustion Prevention (Logs + Docker Cache)

Two common disk-growth culprits in small self-hosted setups:

1. Docker container logs
2. Host cron logs (redirected to `/var/log`)

This repo addresses both:

- `docker-compose.yml` sets Docker log rotation for `penthouse-app` and `caddy` (`max-size=10m`, `max-file=3`).
- `scripts/rotate_penthouse_logs.sh` rotates `/var/log/penthouse-*.log`.
- `scripts/docker_prune_safe.sh` prunes old build cache and unused images.

After updating, run on TrueNAS:

```bash
cd /mnt/Storage_Pool/penthouse/app
./scripts/enable_autostart.sh
```

---

## 6. Encrypted Offsite Backups (Restic)

Create backup credential file:

```bash
cp .backup.env.example .backup.env
chmod 600 .backup.env
```

Fill `.backup.env` with your B2/S3 credentials and repository URL.

Initialize repository once:

```bash
./scripts/backup_init_restic.sh
```

Run immediate backup test:

```bash
./scripts/backup_restic.sh
```

Run retention prune manually:

```bash
./scripts/backup_prune_restic.sh
```

Restore test to a temp location:

```bash
./scripts/backup_restore_restic.sh latest /tmp/penthouse-restore-test
```

---

## 7. Git Push Auto-Deploy

Workflow:
- `.github/workflows/deploy-truenas.yml`

Behavior:
- Runs on self-hosted runner labels: `truenas`, `penthouse`
- Pulls `main`, rebuilds, restarts compose
- Verifies health inside container

Runner should be configured on TrueNAS and kept online at boot.

---

## 8. Cloudflare DNS Failover

Workflow:
- `.github/workflows/cloudflare-failover.yml`

Policy:
- Every 5 minutes, check primary health and failover health
- If primary fails and failover is healthy, switch `A` records
- If primary recovers, switch records back to primary

Required GitHub repository secrets:
- `CF_API_TOKEN`
- `CF_ZONE_ID`
- `CF_RECORD_PENTHOUSE_ID`
- `CF_RECORD_API_ID`
- `PRIMARY_IP`
- `FAILOVER_IP`
- `PRIMARY_HEALTH_URL` (recommended: `https://api.penthouse.blog/api/health`)
- `FAILOVER_HEALTH_URL` (health URL for backup site)

Cloudflare API token minimum scope:
- Zone:DNS Edit
- Zone:Zone Read

---

## 9. Collaboration Setup (Remote Contributors)

Recommended model for outside collaborators/testers:
- Give GitHub repo access (not server root access)
- Protect `main` branch (require PR + status checks)
- Deploy only on merged PRs to `main`
- Keep TrueNAS access key-only and restricted to one admin user

For live testing from Reykjavik (or any region):
- Share `https://penthouse.blog` and `https://api.penthouse.blog`
- Create dedicated tester accounts/invite links
- Use a staging branch + optional staging stack for risky tests

---

## 10. Troubleshooting

- `docker compose config` fails: missing required env vars in `.env`
- Backups not running: check `.backup.env` path and cron logs:
  - `/var/log/penthouse-backup.log`
  - `/var/log/penthouse-backup-prune.log`
- Failover workflow errors: verify Cloudflare secret IDs and token scope
- Cert issues: confirm public DNS and WAN forwarding 80/443
