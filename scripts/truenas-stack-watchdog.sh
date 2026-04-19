#!/usr/bin/env bash

set -uo pipefail

PATH="${PATH:-/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin}"

STACK_DIR="${STACK_DIR:-/mnt/Backup/penthouse-rebuild/app/infra/compose}"
ROOT_DOMAIN="${ROOT_DOMAIN:-penthouse.blog}"
API_DOMAIN="${API_DOMAIN:-api.penthouse.blog}"
TRUENAS_HOST_IP="${TRUENAS_HOST_IP:-127.0.0.1}"
HTTP_PORT="${HTTP_PORT:-9080}"
HTTPS_PORT="${HTTPS_PORT:-9443}"
CURL_CONNECT_TIMEOUT="${CURL_CONNECT_TIMEOUT:-5}"
CURL_MAX_TIME="${CURL_MAX_TIME:-12}"
VERIFY_DELAY_SECONDS="${VERIFY_DELAY_SECONDS:-10}"
BOOT_MAX_SECONDS="${BOOT_MAX_SECONDS:-900}"
BOOT_RETRY_SECONDS="${BOOT_RETRY_SECONDS:-15}"
STATUS_PATH="${STATUS_PATH:-/mnt/Backup/penthouse-rebuild/uploads/ops/stack-watchdog-status.json}"
REPORT_PATH="${REPORT_PATH:-${STATUS_PATH%.*}.txt}"
LOG_PATH="${LOG_PATH:-/mnt/Backup/penthouse-rebuild/uploads/ops/stack-watchdog.log}"
LOCK_DIR="${LOCK_DIR:-/tmp/penthouse-stack-watchdog.lock}"

ENV_FILE="${COMPOSE_ENV_FILE:-}"
if [ -z "$ENV_FILE" ]; then
  if [ -f "$STACK_DIR/.env" ]; then
    ENV_FILE="$STACK_DIR/.env"
  elif [ -f "$STACK_DIR/.env.truenas" ]; then
    ENV_FILE="$STACK_DIR/.env.truenas"
  fi
fi

COMPOSE_FILES=(-f docker-compose.production.yml -f docker-compose.truenas.yml)
if [ -n "$ENV_FILE" ]; then
  COMPOSE_FILES+=(--env-file "$ENV_FILE")
fi

CAUSE_ID="unknown"
CAUSE_SUMMARY="The stack did not become healthy. Check the report for captured command output."
RECOVERY_STEPS="Run docker compose ps and logs for caddy api postgres from the compose directory."

usage() {
  cat <<'EOF'
Usage: truenas-stack-watchdog.sh [--once|--boot|--diagnose-only|--help]

Checks the Penthouse TrueNAS Compose stack through local Caddy, attempts a safe
docker compose up -d --remove-orphans recovery when unhealthy, and writes a
status JSON plus a human-readable diagnosis report.

Modes:
  --once           Check once, recover once if needed, then exit.
  --boot           Retry --once until healthy/recovered or BOOT_MAX_SECONDS pass.
  --diagnose-only  Write diagnostics without attempting a restart.

Useful environment overrides:
  STACK_DIR=/mnt/Backup/penthouse-rebuild/app/infra/compose
  COMPOSE_ENV_FILE=/mnt/Backup/penthouse-rebuild/app/infra/compose/.env
  TRUENAS_HOST_IP=127.0.0.1
  STATUS_PATH=/mnt/Backup/penthouse-rebuild/uploads/ops/stack-watchdog-status.json
  LOG_PATH=/mnt/Backup/penthouse-rebuild/uploads/ops/stack-watchdog.log
  BOOT_MAX_SECONDS=900
  BOOT_RETRY_SECONDS=15
EOF
}

MODE="once"
case "${1:-}" in
  ""|--once)
    MODE="once"
    ;;
  --boot)
    MODE="boot"
    ;;
  --diagnose-only)
    MODE="diagnose-only"
    ;;
  --help|-h)
    usage
    exit 0
    ;;
  *)
    usage >&2
    exit 64
    ;;
esac

mkdir -p "$(dirname "$STATUS_PATH")" "$(dirname "$REPORT_PATH")" "$(dirname "$LOG_PATH")"

log() {
  local line
  line="$(date -u '+%Y-%m-%dT%H:%M:%SZ') $*"
  printf '%s\n' "$line" | tee -a "$LOG_PATH" >&2
}

json_escape() {
  printf '%s' "$1" | tr '\n\r\t' '   ' | sed 's/\\/\\\\/g; s/"/\\"/g'
}

compose() {
  (cd "$STACK_DIR" && docker compose "${COMPOSE_FILES[@]}" "$@")
}

curl_status() {
  local url="$1"
  local host="$2"
  local port="$3"

  curl -kfsS \
    --connect-timeout "$CURL_CONNECT_TIMEOUT" \
    --max-time "$CURL_MAX_TIME" \
    --resolve "${host}:${port}:${TRUENAS_HOST_IP}" \
    -o /dev/null \
    -w '%{http_code}' \
    "$url" 2>/dev/null || true
}

api_health_body() {
  curl -kfsS \
    --connect-timeout "$CURL_CONNECT_TIMEOUT" \
    --max-time "$CURL_MAX_TIME" \
    --resolve "${API_DOMAIN}:${HTTPS_PORT}:${TRUENAS_HOST_IP}" \
    "https://${API_DOMAIN}:${HTTPS_PORT}/api/v1/health" 2>/dev/null || true
}

root_ok() {
  local code
  code="$(curl_status "https://${ROOT_DOMAIN}:${HTTPS_PORT}/" "$ROOT_DOMAIN" "$HTTPS_PORT")"
  [ "$code" = "200" ] || [ "$code" = "308" ] || [ "$code" = "301" ] || [ "$code" = "302" ]
}

api_ok() {
  local body
  body="$(api_health_body)"
  printf '%s' "$body" | grep -q '"status":"ok"'
}

health_summary() {
  local root_code api_body api_state
  root_code="$(curl_status "https://${ROOT_DOMAIN}:${HTTPS_PORT}/" "$ROOT_DOMAIN" "$HTTPS_PORT")"
  api_body="$(api_health_body)"
  if printf '%s' "$api_body" | grep -q '"status":"ok"'; then
    api_state="ok"
  elif [ -n "$api_body" ]; then
    api_state="unexpected-response"
  else
    api_state="unreachable"
  fi
  printf 'root_https_code=%s api_health=%s api_body=%s' "${root_code:-none}" "$api_state" "$(printf '%s' "$api_body" | tr '\n\r\t' '   ')"
}

is_healthy() {
  root_ok && api_ok
}

classify_failure() {
  local text lower
  text="$1"
  lower="$(printf '%s' "$text" | tr '[:upper:]' '[:lower:]')"

  if printf '%s' "$lower" | grep -q '/mnt/.ix-apps/docker/overlay2/.*no such file or directory'; then
    CAUSE_ID="docker-overlay-store-missing-layer"
    CAUSE_SUMMARY="Docker has container/image metadata that points at a missing overlay2 layer under /mnt/.ix-apps/docker. A normal container restart cannot repair that missing layer."
    RECOVERY_STEPS="From the compose directory: docker compose -f docker-compose.production.yml -f docker-compose.truenas.yml --env-file .env down --remove-orphans; then docker compose -f docker-compose.production.yml -f docker-compose.truenas.yml --env-file .env build --no-cache api; then docker compose -f docker-compose.production.yml -f docker-compose.truenas.yml --env-file .env up -d --force-recreate. Do not use docker system prune --volumes. If the same overlay2 error returns, check the TrueNAS Apps/Docker pool and restart the Docker service or reboot TrueNAS after confirming the Backup pool is healthy."
    return
  fi

  if printf '%s' "$lower" | grep -q 'cannot connect to the docker daemon\|is the docker daemon running\|docker daemon'; then
    CAUSE_ID="docker-daemon-unavailable"
    CAUSE_SUMMARY="The Docker daemon is not answering, so Compose cannot inspect or start the stack."
    RECOVERY_STEPS="Check the TrueNAS Docker/Apps service from the UI. If the service is stopped, start it. If it is wedged, restart the service or reboot TrueNAS, then rerun this watchdog."
    return
  fi

  if printf '%s' "$lower" | grep -q 'bind: address already in use\|port is already allocated\|ports are not available'; then
    CAUSE_ID="host-port-conflict"
    CAUSE_SUMMARY="A host port needed by Caddy is already in use, so Caddy cannot bind the public listener."
    RECOVERY_STEPS="Check what owns the port with ss -ltnp or netstat. The Penthouse TrueNAS stack expects host 9080->80 and 9443->443. Stop the conflicting service or fix CADDY_HTTP_PORT/CADDY_HTTPS_PORT in the compose env file."
    return
  fi

  if printf '%s' "$lower" | grep -q 'postgres.*unhealthy\|database system is shut down\|connection refused.*5432\|password authentication failed'; then
    CAUSE_ID="postgres-unhealthy"
    CAUSE_SUMMARY="Postgres is not healthy or the API cannot authenticate to it."
    RECOVERY_STEPS="Run docker compose logs --tail=200 postgres and confirm /mnt/Backup/penthouse-rebuild/postgres is mounted and writable. Check POSTGRES_PASSWORD and DATABASE_URL-derived values in the compose env file."
    return
  fi

  if printf '%s' "$lower" | grep -q 'api.*unhealthy\|api.*exited\|jwt_secret\|altcha_hmac_key\|module not found\|migration'; then
    CAUSE_ID="api-unhealthy"
    CAUSE_SUMMARY="The API container did not become healthy. Caddy may be fine, but it has no healthy backend to proxy to."
    RECOVERY_STEPS="Run docker compose logs --tail=200 api. Check required env values, pending migrations, DB connectivity, and recent image rebuild output."
    return
  fi

  if printf '%s' "$lower" | grep -q 'caddy.*unhealthy\|caddyfile\|certificate\|acme\|tls'; then
    CAUSE_ID="caddy-unhealthy"
    CAUSE_SUMMARY="Caddy did not become healthy or could not load its config/certificates."
    RECOVERY_STEPS="Run docker compose logs --tail=200 caddy. Check Caddyfile syntax, ROOT_SITE_ADDRESS/API_SITE_ADDRESS, Caddy data/config mounts, and whether ports 80/443 are forwarded to 9080/9443."
    return
  fi

  if ! printf '%s' "$lower" | grep -q 'compose'; then
    CAUSE_ID="local-healthcheck-failed"
    CAUSE_SUMMARY="The local Caddy/API health checks failed, but no specific Compose failure pattern was captured."
    RECOVERY_STEPS="Run this script with --diagnose-only, then inspect stack-watchdog-status.json and stack-watchdog-status.txt. Check docker compose ps plus logs for caddy api postgres."
    return
  fi

  CAUSE_ID="unknown-compose-failure"
  CAUSE_SUMMARY="Compose or the local health checks failed, but the captured output did not match a known failure pattern."
  RECOVERY_STEPS="Read the report file, then run docker compose ps and docker compose logs --tail=200 caddy api postgres from the compose directory."
}

write_report() {
  local state="$1"
  local action="$2"
  local health="$3"
  local compose_ps="$4"
  local command_output="$5"
  local logs_tail="$6"
  local now
  now="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"

  cat >"$REPORT_PATH" <<EOF
Penthouse TrueNAS stack watchdog
generatedAt: $now
state: $state
causeId: $CAUSE_ID
summary: $CAUSE_SUMMARY
lastAction: $action
health: $health

Recovery steps:
$RECOVERY_STEPS

Compose directory:
$STACK_DIR

Compose env file:
${ENV_FILE:-not configured}

docker compose ps:
$compose_ps

Command output:
$command_output

Recent logs:
$logs_tail
EOF

  cat >"$STATUS_PATH" <<EOF
{
  "generatedAt": "$(json_escape "$now")",
  "state": "$(json_escape "$state")",
  "causeId": "$(json_escape "$CAUSE_ID")",
  "summary": "$(json_escape "$CAUSE_SUMMARY")",
  "lastAction": "$(json_escape "$action")",
  "health": "$(json_escape "$health")",
  "recoverySteps": "$(json_escape "$RECOVERY_STEPS")",
  "stackDir": "$(json_escape "$STACK_DIR")",
  "envFile": "$(json_escape "${ENV_FILE:-}")",
  "reportPath": "$(json_escape "$REPORT_PATH")"
}
EOF
}

boot_loop() {
  local start now elapsed attempt child_code
  start="$(date +%s)"
  attempt=1

  log "boot mode started; retrying for up to ${BOOT_MAX_SECONDS}s every ${BOOT_RETRY_SECONDS}s"

  while true; do
    log "boot mode attempt ${attempt}"
    "$0" --once
    child_code=$?
    if [ "$child_code" -eq 0 ]; then
      log "boot mode finished successfully after ${attempt} attempt(s)"
      exit 0
    fi

    now="$(date +%s)"
    elapsed=$((now - start))
    if [ "$elapsed" -ge "$BOOT_MAX_SECONDS" ]; then
      CAUSE_ID="boot-recovery-timeout"
      CAUSE_SUMMARY="The watchdog could not restore local Caddy/API health before the boot retry window expired."
      RECOVERY_STEPS="Open $REPORT_PATH for the latest root cause and recovery steps. Then check TrueNAS Docker/Apps service health, the Backup pool, and docker compose logs for caddy api postgres."
      write_report "failed" "boot retry timeout after ${elapsed}s" "$(health_summary)" "" "" ""
      log "$CAUSE_ID: $CAUSE_SUMMARY"
      exit 2
    fi

    sleep "$BOOT_RETRY_SECONDS"
    attempt=$((attempt + 1))
  done
}

if [ "$MODE" = "boot" ]; then
  boot_loop
fi

if ! mkdir "$LOCK_DIR" 2>/dev/null; then
  log "another watchdog run is already active; exiting"
  exit 0
fi
trap 'rmdir "$LOCK_DIR" 2>/dev/null || true' EXIT

if [ ! -d "$STACK_DIR" ]; then
  CAUSE_ID="compose-directory-missing"
  CAUSE_SUMMARY="The configured Compose directory does not exist."
  RECOVERY_STEPS="Set STACK_DIR to the live TrueNAS compose path, normally /mnt/Backup/penthouse-rebuild/app/infra/compose, or restore the deployment checkout."
  write_report "failed" "no restart attempted" "$(health_summary)" "" "missing directory: $STACK_DIR" ""
  log "$CAUSE_ID: $CAUSE_SUMMARY"
  exit 2
fi

if [ -z "$ENV_FILE" ] || [ ! -f "$ENV_FILE" ]; then
  CAUSE_ID="compose-env-missing"
  CAUSE_SUMMARY="No compose env file was found. The stack cannot be started safely without production env values."
  RECOVERY_STEPS="Restore $STACK_DIR/.env or set COMPOSE_ENV_FILE to the live env file before running the watchdog."
  write_report "failed" "no restart attempted" "$(health_summary)" "" "missing env file" ""
  log "$CAUSE_ID: $CAUSE_SUMMARY"
  exit 2
fi

initial_health="$(health_summary)"
if is_healthy; then
  ps_output="$(compose ps 2>&1 || true)"
  CAUSE_ID="none"
  CAUSE_SUMMARY="Local Caddy and API health checks are passing."
  RECOVERY_STEPS="No recovery needed."
  write_report "healthy" "none" "$initial_health" "$ps_output" "" ""
  log "healthy: $initial_health"
  exit 0
fi

log "unhealthy before recovery: $initial_health"
ps_before="$(compose ps 2>&1 || true)"

if [ "$MODE" = "diagnose-only" ]; then
  logs_tail="$(compose logs --tail=120 caddy api postgres 2>&1 || true)"
  classify_failure "$initial_health $ps_before $logs_tail"
  write_report "failed" "diagnose-only" "$initial_health" "$ps_before" "" "$logs_tail"
  log "$CAUSE_ID: $CAUSE_SUMMARY"
  exit 2
fi

docker_info="$(docker info 2>&1 || true)"
if ! printf '%s' "$docker_info" | grep -q 'Server Version'; then
  classify_failure "$docker_info"
  write_report "failed" "docker info" "$initial_health" "$ps_before" "$docker_info" ""
  log "$CAUSE_ID: $CAUSE_SUMMARY"
  exit 2
fi

log "attempting docker compose up -d --remove-orphans"
up_output="$(compose up -d --remove-orphans 2>&1)"
up_code=$?
if [ "$up_code" -ne 0 ]; then
  logs_tail="$(compose logs --tail=120 caddy api postgres 2>&1 || true)"
  classify_failure "$up_output $logs_tail"
  write_report "failed" "compose up -d --remove-orphans exited $up_code" "$initial_health" "$ps_before" "$up_output" "$logs_tail"
  log "$CAUSE_ID: $CAUSE_SUMMARY"
  exit 2
fi

sleep "$VERIFY_DELAY_SECONDS"
after_health="$(health_summary)"
ps_after="$(compose ps 2>&1 || true)"
if is_healthy; then
  CAUSE_ID="recovered-by-compose-up"
  CAUSE_SUMMARY="The stack was unhealthy, and docker compose up -d --remove-orphans restored local Caddy/API health."
  RECOVERY_STEPS="No manual recovery needed. Inspect the report if this repeats."
  write_report "recovered" "compose up -d --remove-orphans" "$after_health" "$ps_after" "$up_output" ""
  log "recovered: $after_health"
  exit 0
fi

logs_tail="$(compose logs --tail=160 caddy api postgres 2>&1 || true)"
classify_failure "$after_health $ps_after $up_output $logs_tail"
write_report "failed" "compose up completed but health still failed" "$after_health" "$ps_after" "$up_output" "$logs_tail"
log "$CAUSE_ID: $CAUSE_SUMMARY"
exit 2
