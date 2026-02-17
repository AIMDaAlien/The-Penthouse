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

example_file="$(dirname "$BACKUP_ENV_FILE")/.backup.env.example"
if [ -f "$example_file" ] && cmp -s "$BACKUP_ENV_FILE" "$example_file"; then
  echo "Backup is not configured yet (.backup.env matches .backup.env.example)."
  echo "Edit $BACKUP_ENV_FILE, then re-run init."
  exit 1
fi

repo_value="$(grep -E '^RESTIC_REPOSITORY=' "$BACKUP_ENV_FILE" | tail -n1 | cut -d= -f2- || true)"
extra_mount=()
if [[ "$repo_value" == /* ]]; then
  mkdir -p "$repo_value"
  extra_mount=(-v "${repo_value}:${repo_value}")
fi

echo "Checking restic repository..."
if docker run --rm "${extra_mount[@]}" --env-file "$BACKUP_ENV_FILE" "$RESTIC_IMAGE" snapshots >/dev/null 2>&1; then
  echo "Restic repository is already initialized."
  exit 0
fi

echo "Initializing restic repository..."
docker run --rm "${extra_mount[@]}" --env-file "$BACKUP_ENV_FILE" "$RESTIC_IMAGE" init

echo "Restic repository initialized."
