#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="${PENTHOUSE_APP_ROOT:-/mnt/Storage_Pool/penthouse/app}"
BACKUP_ENV_FILE="${PENTHOUSE_BACKUP_ENV_FILE:-${APP_ROOT}/.backup.env}"
RESTIC_IMAGE="${RESTIC_IMAGE:-restic/restic:0.17.3}"
DOTENV_DATA_PATH=""
if [ -z "${PENTHOUSE_DATA_PATH:-}" ] && [ -f "${APP_ROOT}/.env" ]; then
  DOTENV_DATA_PATH="$(grep -E '^PENTHOUSE_DATA_PATH=' "${APP_ROOT}/.env" | tail -n 1 | cut -d= -f2- | tr -d '"' || true)"
fi
RAW_DATA_PATH="${PENTHOUSE_DATA_PATH:-${DOTENV_DATA_PATH:-${APP_ROOT}/data}}"

if [[ "$RAW_DATA_PATH" == /* ]]; then
  DATA_PATH="$RAW_DATA_PATH"
else
  DATA_PATH="${APP_ROOT}/${RAW_DATA_PATH}"
fi

if [ ! -f "$BACKUP_ENV_FILE" ]; then
  echo "Missing backup env file: $BACKUP_ENV_FILE"
  exit 1
fi

example_file="$(dirname "$BACKUP_ENV_FILE")/.backup.env.example"
if [ -f "$example_file" ] && cmp -s "$BACKUP_ENV_FILE" "$example_file"; then
  echo "Backup is not configured yet (.backup.env matches .backup.env.example); skipping."
  exit 0
fi

if [ ! -d "$DATA_PATH" ]; then
  echo "Missing app data directory: $DATA_PATH"
  exit 1
fi

repo_value="$(grep -E '^RESTIC_REPOSITORY=' "$BACKUP_ENV_FILE" | tail -n1 | cut -d= -f2- || true)"
extra_mount=()
if [[ "$repo_value" == /* ]]; then
  mkdir -p "$repo_value"
  extra_mount=(-v "${repo_value}:${repo_value}")
fi

HOST_TAG="$(hostname)"
STAMP="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

echo "Starting encrypted backup at $STAMP"
docker run --rm \
  "${extra_mount[@]}" \
  --env-file "$BACKUP_ENV_FILE" \
  -v "$APP_ROOT:/backup/src:ro" \
  -v "$DATA_PATH:/backup/data:ro" \
  "$RESTIC_IMAGE" \
  backup \
  /backup/data \
  /backup/src/.env \
  /backup/src/docker-compose.yml \
  /backup/src/Caddyfile \
  --host "$HOST_TAG" \
  --tag penthouse \
  --tag truenas

echo "Backup complete."
