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

example_file="$(dirname "$BACKUP_ENV_FILE")/.backup.env.example"
if [ -f "$example_file" ] && cmp -s "$BACKUP_ENV_FILE" "$example_file"; then
  echo "Backup is not configured yet (.backup.env matches .backup.env.example)."
  echo "Edit $BACKUP_ENV_FILE, then re-run restore."
  exit 1
fi

repo_value="$(grep -E '^RESTIC_REPOSITORY=' "$BACKUP_ENV_FILE" | tail -n1 | cut -d= -f2- || true)"
extra_mount=()
if [[ "$repo_value" == /* ]]; then
  mkdir -p "$repo_value"
  extra_mount=(-v "${repo_value}:${repo_value}")
fi

mkdir -p "$TARGET_DIR"

echo "Restoring snapshot '$SNAPSHOT' into '$TARGET_DIR'"
docker run --rm \
  "${extra_mount[@]}" \
  --env-file "$BACKUP_ENV_FILE" \
  -v "$TARGET_DIR:/restore" \
  "$RESTIC_IMAGE" \
  restore "$SNAPSHOT" --target /restore

echo "Restore complete at $TARGET_DIR"
