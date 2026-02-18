#!/usr/bin/env bash
set -euo pipefail

# Lightweight log rotation for host-side cron logs in /var/log.
# This is separate from Docker log rotation (handled via docker-compose logging options).
#
# Rotates:
# - /var/log/penthouse-*.log
#
# Policy:
# - if file > MAX_BYTES: shift .1..KEEP, gzip rotated files
# - if file missing: ignore
#
# Usage (TrueNAS host, root):
#   ./scripts/rotate_penthouse_logs.sh

MAX_BYTES="${MAX_BYTES:-10485760}" # 10 MiB
KEEP="${KEEP:-5}"
PATTERN="${PATTERN:-/var/log/penthouse-*.log}"

rotate_one() {
  local f="$1"
  [ -f "$f" ] || return 0

  local size
  size="$(stat -c %s "$f" 2>/dev/null || echo 0)"
  if [ "$size" -lt "$MAX_BYTES" ]; then
    return 0
  fi

  echo "$(date -Is) rotating $f (size=${size})"

  # Shift older rotations
  for ((i=KEEP; i>=1; i--)); do
    if [ -f "${f}.${i}.gz" ]; then
      if [ "$i" -eq "$KEEP" ]; then
        rm -f -- "${f}.${i}.gz"
      else
        mv -f -- "${f}.${i}.gz" "${f}.$((i+1)).gz"
      fi
    fi
    if [ -f "${f}.${i}" ]; then
      if [ "$i" -eq "$KEEP" ]; then
        rm -f -- "${f}.${i}"
      else
        mv -f -- "${f}.${i}" "${f}.$((i+1))"
      fi
    fi
  done

  mv -f -- "$f" "${f}.1"
  : > "$f"

  if command -v gzip >/dev/null 2>&1; then
    gzip -f "${f}.1" || true
  fi
}

shopt -s nullglob
for f in $PATTERN; do
  rotate_one "$f"
done

