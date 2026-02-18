#!/usr/bin/env bash
set -euo pipefail

# SQLite maintenance for the Penthouse app.
# Runs inside the app container so it doesn't depend on host sqlite3 binaries.
#
# What it does:
# - WAL checkpoint (TRUNCATE) to prevent WAL files growing forever
# - PRAGMA optimize (lightweight)
#
# Usage (TrueNAS host):
#   cd /mnt/Storage_Pool/penthouse/app
#   ./scripts/sqlite_maintenance.sh

APP_ROOT="${PENTHOUSE_APP_ROOT:-/mnt/Storage_Pool/penthouse/app}"
cd "$APP_ROOT"

if ! command -v docker >/dev/null 2>&1; then
  echo "docker not found"
  exit 1
fi

echo "$(date -Is) sqlite maintenance start"

docker compose exec -T penthouse-app node - <<'NODE'
const Database = require('better-sqlite3');

const dbPath = '/app/data/penthouse.sqlite';
const db = new Database(dbPath);
try {
  db.pragma('busy_timeout = 5000');
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // WAL checkpoint to keep disk usage stable.
  db.pragma('wal_checkpoint(TRUNCATE)');

  // Let SQLite update stats for query planner.
  db.pragma('optimize');
  console.log('ok');
} finally {
  db.close();
}
NODE

echo "$(date -Is) sqlite maintenance done"

