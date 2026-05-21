#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
COMPOSE_DIR="${PENTHOUSE_COMPOSE_DIR:-${REPO_ROOT}/infra/compose}"
ENV_FILE="${PENTHOUSE_ENV_FILE:-}"
if [[ -z "${ENV_FILE}" ]]; then
  for candidate in "${COMPOSE_DIR}/.env.unraid" "${COMPOSE_DIR}/.env.truenas" "${COMPOSE_DIR}/.env.production"; do
    if [[ -f "${candidate}" ]]; then
      ENV_FILE="${candidate}"
      break
    fi
  done
  ENV_FILE="${ENV_FILE:-${COMPOSE_DIR}/.env.truenas}"
fi

RETENTION_DAYS="${PENTHOUSE_UPLOADS_BACKUP_RETENTION_DAYS:-14}"

read_env_value() {
  local key="$1"
  [[ -f "${ENV_FILE}" ]] || return 1
  awk -F= -v key="${key}" '
    $1 == key {
      value = substr($0, length(key) + 2)
      gsub(/^"|"$/, "", value)
      print value
    }
  ' "${ENV_FILE}" | tail -n 1
}

TRUENAS_UPLOADS_PATH_VALUE="$(read_env_value TRUENAS_UPLOADS_PATH || true)"
UNRAID_UPLOADS_PATH_VALUE="$(read_env_value UNRAID_UPLOADS_PATH || true)"

UPLOADS_DIR="${PENTHOUSE_UPLOADS_DIR:-${UNRAID_UPLOADS_PATH:-${UNRAID_UPLOADS_PATH_VALUE:-${TRUENAS_UPLOADS_PATH:-${TRUENAS_UPLOADS_PATH_VALUE:-}}}}}"
BACKUP_DIR="${PENTHOUSE_UPLOADS_BACKUP_DIR:-}"
if [[ -z "${BACKUP_DIR}" && -n "${UPLOADS_DIR}" ]]; then
  BACKUP_DIR="$(dirname "${UPLOADS_DIR}")/backups/uploads"
fi
BACKUP_DIR="${BACKUP_DIR:-/mnt/Backup/penthouse-rebuild/backups/uploads}"

fail() {
  printf 'uploads backup failed: %s\n' "$1" >&2
  exit 1
}

[[ -f "${ENV_FILE}" ]] || fail "Compose env file not found: ${ENV_FILE}"
[[ -n "${UPLOADS_DIR}" ]] || fail "Uploads path not configured; set PENTHOUSE_UPLOADS_DIR, UNRAID_UPLOADS_PATH, or TRUENAS_UPLOADS_PATH"
[[ -d "${UPLOADS_DIR}" ]] || fail "Uploads directory not found: ${UPLOADS_DIR}"

mkdir -p "${BACKUP_DIR}"

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup_path="${BACKUP_DIR}/penthouse-uploads-${timestamp}.tar.gz"
tmp_path="${backup_path}.tmp"
rm -f "${tmp_path}"

cleanup_tmp() {
  rm -f "${tmp_path}"
}
trap cleanup_tmp EXIT

if ! tar -C "$(dirname "${UPLOADS_DIR}")" -czf "${tmp_path}" "$(basename "${UPLOADS_DIR}")"; then
  fail "tar command failed"
fi

if ! gzip -t "${tmp_path}"; then
  fail "backup gzip integrity check failed"
fi

mv "${tmp_path}" "${backup_path}"
find "${BACKUP_DIR}" -type f -name 'penthouse-uploads-*.tar.gz' -mtime "+${RETENTION_DAYS}" -delete
printf 'uploads backup ok: %s\n' "${backup_path}"
