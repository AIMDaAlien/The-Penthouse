#!/usr/bin/env bash
set -euo pipefail

# Lightweight self-healing watchdog for TrueNAS cron.
# - Ensures required compose services are running
# - Verifies app health endpoint from inside app container
# - Brings stack back up when needed

APP_ROOT="${PENTHOUSE_APP_ROOT:-/mnt/Storage_Pool/penthouse/app}"
REQUIRED_SERVICES=("penthouse-app" "caddy")

if ! command -v docker >/dev/null 2>&1; then
  echo "docker not found"
  exit 1
fi

cd "$APP_ROOT"

running_services="$(docker compose ps --services --filter status=running || true)"
needs_restart=0

for svc in "${REQUIRED_SERVICES[@]}"; do
  if ! printf '%s\n' "$running_services" | grep -Fx -- "$svc" >/dev/null; then
    echo "Service not running: $svc"
    needs_restart=1
  fi
done

if [ "$needs_restart" -eq 0 ]; then
  if ! docker compose exec -T penthouse-app wget -q --spider http://localhost:3000/api/health >/dev/null 2>&1; then
    echo "Health check failed"
    needs_restart=1
  fi
fi

if [ "$needs_restart" -eq 1 ]; then
  echo "Recovering stack..."
  ./scripts/prepare_data_dirs.sh
  docker compose up -d
fi
