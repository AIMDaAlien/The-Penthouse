#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="${PENTHOUSE_APP_ROOT:-/mnt/Storage_Pool/penthouse/app}"
DOTENV_DATA_PATH=""
if [ -z "${PENTHOUSE_DATA_PATH:-}" ] && [ -f "${APP_ROOT}/.env" ]; then
  DOTENV_DATA_PATH="$(grep -E '^PENTHOUSE_DATA_PATH=' "${APP_ROOT}/.env" | tail -n 1 | cut -d= -f2- | tr -d '"' || true)"
fi
RAW_DATA_PATH="${PENTHOUSE_DATA_PATH:-${DOTENV_DATA_PATH:-${APP_ROOT}/data}}"
if [[ "$RAW_DATA_PATH" = /* ]]; then
  DATA_DIR="$RAW_DATA_PATH"
else
  DATA_DIR="${APP_ROOT}/${RAW_DATA_PATH}"
fi
LEGACY_DATA_DIR="${APP_ROOT}/data"

cd "$APP_ROOT"
mkdir -p "${DATA_DIR}/uploads" "${DATA_DIR}/downloads"

if [ "$DATA_DIR" != "$LEGACY_DATA_DIR" ] && [ -d "$LEGACY_DATA_DIR" ]; then
  if [ ! -f "${DATA_DIR}/penthouse.sqlite" ] && [ -f "${LEGACY_DATA_DIR}/penthouse.sqlite" ]; then
    echo "Migrating existing app data from ${LEGACY_DATA_DIR} to ${DATA_DIR}"
    if command -v rsync >/dev/null 2>&1; then
      rsync -a "${LEGACY_DATA_DIR}/" "${DATA_DIR}/"
    else
      cp -a "${LEGACY_DATA_DIR}/." "${DATA_DIR}/"
    fi
  fi
fi

if [ "$(id -u)" -eq 0 ]; then
  TARGET_UID="${PENTHOUSE_DATA_UID:-0}"
  TARGET_GID="${PENTHOUSE_DATA_GID:-0}"
  # Keep ownership explicit/configurable so mounted data works across host setups.
  chown -R "${TARGET_UID}:${TARGET_GID}" "${DATA_DIR}"
fi

# SQLite needs directory write + execute, and file write for WAL/journal files.
find "${DATA_DIR}" -type d -exec chmod 0775 {} \;
find "${DATA_DIR}" -type f -exec chmod 0664 {} \;

echo "Data directories prepared at ${DATA_DIR}."
