#!/usr/bin/env bash
set -euo pipefail

# Run this on the TrueNAS host as root to auto-start the stack after reboot.
# Optional env override:
#   PENTHOUSE_APP_ROOT=/mnt/Storage_Pool/penthouse/app

APP_ROOT="${PENTHOUSE_APP_ROOT:-/mnt/Storage_Pool/penthouse/app}"
LOG_FILE="/var/log/penthouse-autostart.log"
START_CMD="cd ${APP_ROOT} && /usr/bin/docker compose up -d"
CRON_ENTRY="@reboot ${START_CMD} >> ${LOG_FILE} 2>&1"
WATCHDOG_LOG="/var/log/penthouse-watchdog.log"
WATCHDOG_CMD="cd ${APP_ROOT} && ./scripts/watchdog_stack.sh"
WATCHDOG_CRON="*/5 * * * * ${WATCHDOG_CMD} >> ${WATCHDOG_LOG} 2>&1"

if [ "${EUID}" -ne 0 ]; then
  echo "Run as root"
  exit 1
fi

existing_crontab="$(crontab -l 2>/dev/null || true)"
updated="$existing_crontab"

if ! echo "$updated" | grep -Fq "$START_CMD"; then
  updated="$(printf '%s\n%s\n' "$updated" "$CRON_ENTRY")"
fi

if ! echo "$updated" | grep -Fq "$WATCHDOG_CMD"; then
  updated="$(printf '%s\n%s\n' "$updated" "$WATCHDOG_CRON")"
fi

printf '%s\n' "$updated" | sed '/^\s*$/d' | crontab -

echo "Autostart + watchdog enabled."
echo "Entry: $CRON_ENTRY"
echo "Entry: $WATCHDOG_CRON"
