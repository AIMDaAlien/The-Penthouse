#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="${PENTHOUSE_APP_ROOT:-/mnt/Storage_Pool/penthouse/app}"
BACKUP_ENV_FILE="${PENTHOUSE_BACKUP_ENV_FILE:-${APP_ROOT}/.backup.env}"
RESTIC_IMAGE="${RESTIC_IMAGE:-restic/restic:0.17.3}"

if [ ! -f "$BACKUP_ENV_FILE" ]; then
  echo "Missing backup env file: $BACKUP_ENV_FILE"
  exit 1
fi

if [ ! -d "$APP_ROOT/data" ]; then
  echo "Missing app data directory: $APP_ROOT/data"
  exit 1
fi

HOST_TAG="$(hostname)"
STAMP="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

echo "Starting encrypted backup at $STAMP"
docker run --rm \
  --env-file "$BACKUP_ENV_FILE" \
  -v "$APP_ROOT:/backup/src:ro" \
  "$RESTIC_IMAGE" \
  backup \
  /backup/src/data \
  /backup/src/.env \
  /backup/src/docker-compose.yml \
  /backup/src/Caddyfile \
  --host "$HOST_TAG" \
  --tag penthouse \
  --tag truenas

echo "Backup complete."
