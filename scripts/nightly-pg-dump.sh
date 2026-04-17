#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
COMPOSE_DIR="${PENTHOUSE_COMPOSE_DIR:-${REPO_ROOT}/infra/compose}"
ENV_FILE="${PENTHOUSE_ENV_FILE:-${COMPOSE_DIR}/.env.truenas}"
if [[ ! -f "${ENV_FILE}" && -f "${COMPOSE_DIR}/.env.production" ]]; then
  ENV_FILE="${COMPOSE_DIR}/.env.production"
fi

POSTGRES_SERVICE="${PENTHOUSE_POSTGRES_SERVICE:-postgres}"
RETENTION_DAYS="${PENTHOUSE_BACKUP_RETENTION_DAYS:-14}"

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

TRUENAS_BACKUP_PATH_VALUE="$(read_env_value TRUENAS_BACKUP_PATH || true)"
TRUENAS_UPLOADS_PATH_VALUE="$(read_env_value TRUENAS_UPLOADS_PATH || true)"
BACKUP_STATUS_HOST_PATH_VALUE="$(read_env_value BACKUP_STATUS_HOST_PATH || true)"

BACKUP_DIR="${PENTHOUSE_BACKUP_DIR:-${TRUENAS_BACKUP_PATH:-${TRUENAS_BACKUP_PATH_VALUE:-/mnt/Backup/penthouse-rebuild/backups/postgres}}}"
STATUS_PATH="${PENTHOUSE_BACKUP_STATUS_PATH:-${BACKUP_STATUS_HOST_PATH:-${BACKUP_STATUS_HOST_PATH_VALUE:-}}}"
if [[ -z "${STATUS_PATH}" && -n "${TRUENAS_UPLOADS_PATH_VALUE}" ]]; then
  STATUS_PATH="${TRUENAS_UPLOADS_PATH_VALUE}/ops/backup-status.json"
fi
STATUS_PATH="${STATUS_PATH:-${BACKUP_DIR}/backup-status.json}"

POSTGRES_USER="${POSTGRES_USER:-$(read_env_value POSTGRES_USER || true)}"
POSTGRES_DB="${POSTGRES_DB:-$(read_env_value POSTGRES_DB || true)}"
POSTGRES_USER="${POSTGRES_USER:-penthouse}"
POSTGRES_DB="${POSTGRES_DB:-penthouse}"

previous_success_at() {
  [[ -f "${STATUS_PATH}" ]] || return 0
  sed -n 's/.*"lastSuccessfulBackupAt"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "${STATUS_PATH}" | tail -n 1
}

json_string() {
  local value="$1"
  value="${value//\\/\\\\}"
  value="${value//\"/\\\"}"
  printf '"%s"' "${value}"
}

write_status() {
  local status="$1"
  local target="$2"
  local last_success="$3"
  local message="${4:-}"
  local status_dir
  status_dir="$(dirname "${STATUS_PATH}")"
  mkdir -p "${status_dir}"

  {
    printf '{\n'
    printf '  "status": %s,\n' "$(json_string "${status}")"
    printf '  "target": %s,\n' "$(json_string "${target}")"
    if [[ -n "${last_success}" ]]; then
      printf '  "lastSuccessfulBackupAt": %s' "$(json_string "${last_success}")"
    else
      printf '  "lastSuccessfulBackupAt": null'
    fi
    if [[ -n "${message}" ]]; then
      printf ',\n  "message": %s\n' "$(json_string "${message}")"
    else
      printf '\n'
    fi
    printf '}\n'
  } > "${STATUS_PATH}.tmp"
  mv "${STATUS_PATH}.tmp" "${STATUS_PATH}"
}

fail() {
  local message="$1"
  write_status "failed" "${BACKUP_DIR}" "$(previous_success_at)" "${message}"
  printf 'backup failed: %s\n' "${message}" >&2
  exit 1
}

[[ -f "${ENV_FILE}" ]] || fail "Compose env file not found: ${ENV_FILE}"
mkdir -p "${BACKUP_DIR}"

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
completed_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
backup_path="${BACKUP_DIR}/penthouse-${timestamp}.sql.gz"
tmp_path="${backup_path}.tmp"
rm -f "${tmp_path}"

compose_args=(-f docker-compose.production.yml -f docker-compose.truenas.yml --env-file "${ENV_FILE}")
if [[ -n "${PENTHOUSE_COMPOSE_FILES:-}" ]]; then
  # shellcheck disable=SC2206
  compose_args=(${PENTHOUSE_COMPOSE_FILES} --env-file "${ENV_FILE}")
fi

cleanup_tmp() {
  rm -f "${tmp_path}"
}
trap cleanup_tmp EXIT

if ! (
  cd "${COMPOSE_DIR}"
  docker compose "${compose_args[@]}" exec -T "${POSTGRES_SERVICE}" \
    pg_dump -U "${POSTGRES_USER}" "${POSTGRES_DB}"
) | gzip -c > "${tmp_path}"; then
  fail "pg_dump command failed"
fi

if ! gunzip -t "${tmp_path}"; then
  fail "backup gzip integrity check failed"
fi

mv "${tmp_path}" "${backup_path}"
find "${BACKUP_DIR}" -type f -name 'penthouse-*.sql.gz' -mtime "+${RETENTION_DAYS}" -delete
write_status "ok" "${backup_path}" "${completed_at}"
printf 'backup ok: %s\n' "${backup_path}"
