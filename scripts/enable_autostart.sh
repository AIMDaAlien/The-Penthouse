#!/usr/bin/env bash
set -euo pipefail

# Run this on the TrueNAS host as root to auto-start the stack after reboot.
# Optional env override:
#   PENTHOUSE_APP_ROOT=/mnt/Storage_Pool/penthouse/app

APP_ROOT="${PENTHOUSE_APP_ROOT:-/mnt/Storage_Pool/penthouse/app}"
LOG_FILE="/var/log/penthouse-autostart.log"
START_CMD="cd ${APP_ROOT} && ./scripts/prepare_data_dirs.sh && /usr/bin/docker compose up -d"
LEGACY_START_CMD="cd ${APP_ROOT} && /usr/bin/docker compose up -d"
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

DDNS_LOG="/var/log/penthouse-ddns.log"
DDNS_CMD="[ -f ${APP_ROOT}/.cloudflare-ddns.env ] && cd ${APP_ROOT} && ./scripts/cloudflare_ddns.sh"
DDNS_CRON="*/5 * * * * ${DDNS_CMD} >> ${DDNS_LOG} 2>&1"

ROTATE_LOG="/var/log/penthouse-logrotate.log"
ROTATE_CMD="cd ${APP_ROOT} && ./scripts/rotate_penthouse_logs.sh"
ROTATE_CRON="11 4 * * 0 ${ROTATE_CMD} >> ${ROTATE_LOG} 2>&1"

DOCKER_PRUNE_LOG="/var/log/penthouse-docker-prune.log"
DOCKER_PRUNE_CMD="cd ${APP_ROOT} && ./scripts/docker_prune_safe.sh"
DOCKER_PRUNE_CRON="23 4 * * 0 ${DOCKER_PRUNE_CMD} >> ${DOCKER_PRUNE_LOG} 2>&1"

SQLITE_MAINT_LOG="/var/log/penthouse-sqlite-maint.log"
SQLITE_MAINT_CMD="cd ${APP_ROOT} && ./scripts/sqlite_maintenance.sh"
SQLITE_MAINT_CRON="33 4 * * 0 ${SQLITE_MAINT_CMD} >> ${SQLITE_MAINT_LOG} 2>&1"

if [ "${EUID}" -ne 0 ]; then
  echo "Run as root"
  exit 1
fi

existing_crontab="$(crontab -l 2>/dev/null || true)"
updated="$existing_crontab"

# Remove legacy reboot entry if present.
updated="$(printf '%s\n' "$updated" | grep -Fv "$LEGACY_START_CMD" || true)"

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

if ! echo "$updated" | grep -Fq "$DDNS_CMD"; then
  updated="$(printf '%s\n%s\n' "$updated" "$DDNS_CRON")"
fi

if ! echo "$updated" | grep -Fq "$ROTATE_CMD"; then
  updated="$(printf '%s\n%s\n' "$updated" "$ROTATE_CRON")"
fi

if ! echo "$updated" | grep -Fq "$DOCKER_PRUNE_CMD"; then
  updated="$(printf '%s\n%s\n' "$updated" "$DOCKER_PRUNE_CRON")"
fi

if ! echo "$updated" | grep -Fq "$SQLITE_MAINT_CMD"; then
  updated="$(printf '%s\n%s\n' "$updated" "$SQLITE_MAINT_CRON")"
fi

printf '%s\n' "$updated" | sed '/^\s*$/d' | crontab -

echo "Autostart + watchdog + backup jobs enabled."
echo "Entry: $CRON_ENTRY"
echo "Entry: $WATCHDOG_CRON"
echo "Entry: $BACKUP_CRON"
echo "Entry: $PRUNE_CRON"
echo "Entry: $DDNS_CRON"
echo "Entry: $ROTATE_CRON"
echo "Entry: $DOCKER_PRUNE_CRON"
echo "Entry: $SQLITE_MAINT_CRON"
