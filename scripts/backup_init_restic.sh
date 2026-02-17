#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="${PENTHOUSE_APP_ROOT:-/mnt/Storage_Pool/penthouse/app}"
BACKUP_ENV_FILE="${PENTHOUSE_BACKUP_ENV_FILE:-${APP_ROOT}/.backup.env}"
RESTIC_IMAGE="${RESTIC_IMAGE:-restic/restic:0.17.3}"

if [ ! -f "$BACKUP_ENV_FILE" ]; then
  echo "Missing backup env file: $BACKUP_ENV_FILE"
  echo "Copy .backup.env.example to .backup.env and set credentials first."
  exit 1
fi

echo "Checking restic repository..."
if docker run --rm --env-file "$BACKUP_ENV_FILE" "$RESTIC_IMAGE" snapshots >/dev/null 2>&1; then
  echo "Restic repository is already initialized."
  exit 0
fi

echo "Initializing restic repository..."
docker run --rm --env-file "$BACKUP_ENV_FILE" "$RESTIC_IMAGE" init

echo "Restic repository initialized."
