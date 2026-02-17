#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="${PENTHOUSE_APP_ROOT:-/mnt/Storage_Pool/penthouse/app}"

cd "$APP_ROOT"
mkdir -p data/uploads data/downloads

if [ "$(id -u)" -eq 0 ]; then
  # Ensure app container can write to SQLite/uploads after capability hardening.
  chown -R 0:0 data
  chmod -R u+rwX,g+rX,o-rwx data
fi

echo "Data directories prepared."
