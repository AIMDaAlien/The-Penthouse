#!/usr/bin/env bash
set -euo pipefail

# Run this on the TrueNAS host as root to auto-start the stack after reboot.
# Optional env override:
#   PENTHOUSE_APP_ROOT=/mnt/Storage_Pool/penthouse/app

APP_ROOT="${PENTHOUSE_APP_ROOT:-/mnt/Storage_Pool/penthouse/app}"
LOG_FILE="/var/log/penthouse-autostart.log"
START_CMD="cd ${APP_ROOT} && ./scripts/prepare_data_dirs.sh && /usr/bin/docker compose up -d"
CRON_ENTRY="@reboot ${START_CMD} >> ${LOG_FILE} 2>&1"

WATCHDOG_LOG="/var/log/penthouse-watchdog.log"
WATCHDOG_CMD="cd ${APP_ROOT} && ./scripts/watchdog_stack.sh"
WATCHDOG_CRON="*/5 * * * * ${WATCHDOG_CMD} >> ${WATCHDOG_LOG} 2>&1"

BACKUP_LOG="/var/log/penthouse-backup.log"
BACKUP_CMD="[ -f ${APP_ROOT}/.backup.env ] && cd ${APP_ROOT} && ./scripts/backup_restic.sh"
BACKUP_CRON="17 3 * * * ${BACKUP_CMD} >> ${BACKUP_LOG} 2>&1"

PRUNE_LOG="/var/log/penthouse-backup-prune.log"
PRUNE_CMD="[ -f ${APP_ROOT}/.backup.env ] && cd ${APP_ROOT} && ./scripts/backup_prune_restic.sh"
PRUNE_CRON="47 3 * * 0 ${PRUNE_CMD} >> ${PRUNE_LOG} 2>&1"

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

if ! echo "$updated" | grep -Fq "$BACKUP_CMD"; then
  updated="$(printf '%s\n%s\n' "$updated" "$BACKUP_CRON")"
fi

if ! echo "$updated" | grep -Fq "$PRUNE_CMD"; then
  updated="$(printf '%s\n%s\n' "$updated" "$PRUNE_CRON")"
fi

printf '%s\n' "$updated" | sed '/^\s*$/d' | crontab -

echo "Autostart + watchdog + backup jobs enabled."
echo "Entry: $CRON_ENTRY"
echo "Entry: $WATCHDOG_CRON"
echo "Entry: $BACKUP_CRON"
echo "Entry: $PRUNE_CRON"
