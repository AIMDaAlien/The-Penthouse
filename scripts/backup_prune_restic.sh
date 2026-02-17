#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="${PENTHOUSE_APP_ROOT:-/mnt/Storage_Pool/penthouse/app}"
BACKUP_ENV_FILE="${PENTHOUSE_BACKUP_ENV_FILE:-${APP_ROOT}/.backup.env}"
RESTIC_IMAGE="${RESTIC_IMAGE:-restic/restic:0.17.3}"

KEEP_DAILY="${RESTIC_KEEP_DAILY:-7}"
KEEP_WEEKLY="${RESTIC_KEEP_WEEKLY:-4}"
KEEP_MONTHLY="${RESTIC_KEEP_MONTHLY:-6}"

if [ ! -f "$BACKUP_ENV_FILE" ]; then
  echo "Missing backup env file: $BACKUP_ENV_FILE"
  exit 1
fi

repo_value="$(grep -E '^RESTIC_REPOSITORY=' "$BACKUP_ENV_FILE" | tail -n1 | cut -d= -f2- || true)"
extra_mount=()
if [[ "$repo_value" == /* ]]; then
  mkdir -p "$repo_value"
  extra_mount=(-v "${repo_value}:${repo_value}")
fi

echo "Pruning old snapshots (daily=${KEEP_DAILY}, weekly=${KEEP_WEEKLY}, monthly=${KEEP_MONTHLY})"
docker run --rm \
  "${extra_mount[@]}" \
  --env-file "$BACKUP_ENV_FILE" \
  "$RESTIC_IMAGE" \
  forget \
  --keep-daily "$KEEP_DAILY" \
  --keep-weekly "$KEEP_WEEKLY" \
  --keep-monthly "$KEEP_MONTHLY" \
  --prune

echo "Prune complete."
