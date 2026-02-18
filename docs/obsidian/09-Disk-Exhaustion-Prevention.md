# Disk Exhaustion Prevention (Home Server, Docker)

## Why This Matters

On a home TrueNAS box, the most common “random outage” causes are:

- docker logs growing without bounds
- build cache growth from frequent rebuilds
- cron logs in `/var/log` growing forever

## What We Implemented

### 1. Docker Log Rotation (Preferred)

In `docker-compose.yml`, both services use the default `json-file` log driver with:

- `max-size: 10m`
- `max-file: 3`

That caps each container to about ~30MB of logs.

### 2. Host Cron Log Rotation

Cron jobs we install redirect output to `/var/log/penthouse-*.log`.

We added:

- `scripts/rotate_penthouse_logs.sh`

It rotates `/var/log/penthouse-*.log` once they exceed 10 MiB, keeps a small history, and gzips rotated files when possible.

### 3. Safe Docker Pruning

We added:

- `scripts/docker_prune_safe.sh`

It prunes:

- build cache older than 7 days
- unused images older than 7 days

It does not remove volumes.

## Cron Installation

`./scripts/enable_autostart.sh` installs:

- weekly host log rotation
- weekly docker prune

## Verification

On the TrueNAS host:

```bash
crontab -l | egrep -n "rotate_penthouse_logs|docker_prune_safe" || true
ls -lh /var/log/penthouse-*.log 2>/dev/null || true
```

