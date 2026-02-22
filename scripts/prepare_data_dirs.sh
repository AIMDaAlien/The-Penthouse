#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="${PENTHOUSE_APP_ROOT:-/mnt/Storage_Pool/penthouse/app}"
DATA_DIR="${APP_ROOT}/data"

cd "$APP_ROOT"
mkdir -p "${DATA_DIR}/uploads" "${DATA_DIR}/downloads"

if [ "$(id -u)" -eq 0 ]; then
  TARGET_UID="${PENTHOUSE_DATA_UID:-0}"
  TARGET_GID="${PENTHOUSE_DATA_GID:-0}"
  # Keep ownership explicit/configurable so mounted data works across host setups.
  chown -R "${TARGET_UID}:${TARGET_GID}" "${DATA_DIR}"
fi

# SQLite needs directory write + execute, and file write for WAL/journal files.
find "${DATA_DIR}" -type d -exec chmod 0775 {} \;
find "${DATA_DIR}" -type f -exec chmod 0664 {} \;

echo "Data directories prepared."
