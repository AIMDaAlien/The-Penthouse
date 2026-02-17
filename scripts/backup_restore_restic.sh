#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="${PENTHOUSE_APP_ROOT:-/mnt/Storage_Pool/penthouse/app}"
BACKUP_ENV_FILE="${PENTHOUSE_BACKUP_ENV_FILE:-${APP_ROOT}/.backup.env}"
RESTIC_IMAGE="${RESTIC_IMAGE:-restic/restic:0.17.3}"
SNAPSHOT="${1:-latest}"
TARGET_DIR="${2:-${APP_ROOT}/restore-${SNAPSHOT}}"

if [ ! -f "$BACKUP_ENV_FILE" ]; then
  echo "Missing backup env file: $BACKUP_ENV_FILE"
  exit 1
fi

mkdir -p "$TARGET_DIR"

echo "Restoring snapshot '$SNAPSHOT' into '$TARGET_DIR'"
docker run --rm \
  --env-file "$BACKUP_ENV_FILE" \
  -v "$TARGET_DIR:/restore" \
  "$RESTIC_IMAGE" \
  restore "$SNAPSHOT" --target /restore

echo "Restore complete at $TARGET_DIR"
