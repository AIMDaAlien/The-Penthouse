#!/usr/bin/env bash
set -euo pipefail

# Cloudflare DDNS updater for home-hosted Penthouse.
# Updates A records for:
# - penthouse.blog
# - api.penthouse.blog
#
# Runs safely under cron. Only changes DNS when IP drift is detected.
#
# Config (recommended via env file at repo root):
#   .cloudflare-ddns.env with:
#     CF_API_TOKEN=...
#     CF_ZONE_NAME=penthouse.blog
#     CF_RECORD_PENTHOUSE_NAME=penthouse.blog
#     CF_RECORD_API_NAME=api.penthouse.blog
#
# Optional (if you want to avoid lookups):
#   CF_ZONE_ID=...
#   CF_RECORD_PENTHOUSE_ID=...
#   CF_RECORD_API_ID=...
#
# Minimum token scopes:
# - Zone:Zone Read
# - Zone:DNS Edit

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${CLOUDFLARE_DDNS_ENV_FILE:-${ROOT_DIR}/.cloudflare-ddns.env}"

if [ -f "${ENV_FILE}" ]; then
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
fi

CF_API_TOKEN="${CF_API_TOKEN:-}"
CF_ZONE_NAME="${CF_ZONE_NAME:-penthouse.blog}"
CF_RECORD_PENTHOUSE_NAME="${CF_RECORD_PENTHOUSE_NAME:-penthouse.blog}"
CF_RECORD_API_NAME="${CF_RECORD_API_NAME:-api.${CF_ZONE_NAME}}"

if [ -z "${CF_API_TOKEN}" ]; then
  echo "Cloudflare DDNS skipped; missing CF_API_TOKEN (set in ${ENV_FILE})."
  exit 0
fi

cf_api() {
  local method="$1"
  local url="$2"
  local data="${3:-}"

  local resp http_code body
  if [ -n "${data}" ]; then
    resp="$(
      curl -sS --max-time 12 -X "${method}" \
        -H "Authorization: Bearer ${CF_API_TOKEN}" \
        -H "Content-Type: application/json" \
        --data "${data}" \
        -w '\n__HTTP_STATUS__:%{http_code}' \
        "${url}"
    )"
  else
    resp="$(
      curl -sS --max-time 12 -X "${method}" \
        -H "Authorization: Bearer ${CF_API_TOKEN}" \
        -H "Content-Type: application/json" \
        -w '\n__HTTP_STATUS__:%{http_code}' \
        "${url}"
    )"
  fi

  http_code="$(printf '%s' "${resp}" | awk -F: '/^__HTTP_STATUS__:/ {print $2}' | tail -n 1)"
  body="$(printf '%s' "${resp}" | sed '/^__HTTP_STATUS__:/d')"

  # curl succeeded but Cloudflare returned an error status code
  if [ -z "${http_code}" ] || [ "${http_code}" -lt 200 ] || [ "${http_code}" -ge 300 ]; then
    echo "Cloudflare API HTTP ${http_code:-unknown} for ${method} ${url}"
    echo "${body}"
    return 1
  fi

  printf '%s' "${body}"
}

get_public_ip() {
  local ip=""
  ip="$(curl -fsSL --max-time 6 https://api.ipify.org 2>/dev/null || true)"
  if [[ ! "${ip}" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    ip="$(curl -fsSL --max-time 6 https://ifconfig.me/ip 2>/dev/null || true)"
  fi
  if [[ ! "${ip}" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    ip="$(curl -fsSL --max-time 6 https://1.1.1.1/cdn-cgi/trace 2>/dev/null | awk -F= '$1=="ip"{print $2}' || true)"
  fi
  if [[ ! "${ip}" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "Failed to determine public IPv4 address"
    return 1
  fi
  echo "${ip}"
}

# Extract a string field from Cloudflare JSON in the common success shape.
# Prefers jq if present; falls back to a conservative regex extraction.
json_extract() {
  local json="$1"
  local jq_expr="$2"
  local fallback_regex="$3"

  if command -v jq >/dev/null 2>&1; then
    jq -r "${jq_expr}" <<<"${json}"
    return 0
  fi

  # fallback: pull the first match of fallback_regex
  # shellcheck disable=SC2001
  sed -nE "s/${fallback_regex}/\\1/p" <<<"${json}" | head -n 1
}

require_success() {
  local json="$1"
  if command -v jq >/dev/null 2>&1; then
    local ok
    ok="$(jq -r '.success' <<<"${json}" 2>/dev/null || echo "false")"
    [ "${ok}" = "true" ] && return 0
  else
    echo "${json}" | grep -q '"success":true' && return 0
  fi
  echo "Cloudflare API error: ${json}"
  return 1
}

get_zone_id() {
  if [ -n "${CF_ZONE_ID:-}" ]; then
    echo "${CF_ZONE_ID}"
    return 0
  fi
  local json
  json="$(cf_api GET "https://api.cloudflare.com/client/v4/zones?name=${CF_ZONE_NAME}&status=active&page=1&per_page=1")"
  require_success "${json}"
  local id
  id="$(json_extract "${json}" '.result[0].id // empty' '.*\"result\"\\s*:\\s*\\[\\s*\\{[^}]*\"id\"\\s*:\\s*\"([^\"]+)\".*')"
  if [ -z "${id}" ] || [ "${id}" = "null" ]; then
    echo "Could not resolve zone id for ${CF_ZONE_NAME}"
    return 1
  fi
  echo "${id}"
}

get_record_by_name() {
  local zone_id="$1"
  local fqdn="$2"
  local json
  json="$(cf_api GET "https://api.cloudflare.com/client/v4/zones/${zone_id}/dns_records?type=A&name=${fqdn}&page=1&per_page=1")"
  require_success "${json}"
  echo "${json}"
}

update_record_if_needed() {
  local zone_id="$1"
  local record_id="$2"
  local fqdn="$3"
  local desired_ip="$4"

  local get_json
  get_json="$(cf_api GET "https://api.cloudflare.com/client/v4/zones/${zone_id}/dns_records/${record_id}")"
  require_success "${get_json}"

  local current_ip ttl proxied
  current_ip="$(json_extract "${get_json}" '.result.content // empty' '.*\"content\"\\s*:\\s*\"([0-9\\.]+)\".*')"
  ttl="$(json_extract "${get_json}" '.result.ttl // 1' '.*\"ttl\"\\s*:\\s*([0-9]+).*')"
  proxied="$(json_extract "${get_json}" '.result.proxied // false' '.*\"proxied\"\\s*:\\s*(true|false).*')"
  if [ -z "${ttl}" ] || [ "${ttl}" = "null" ]; then ttl="1"; fi
  if [ -z "${proxied}" ] || [ "${proxied}" = "null" ]; then proxied="false"; fi

  if [ "${current_ip}" = "${desired_ip}" ]; then
    echo "$(date -Is) ${fqdn} already ${desired_ip}"
    return 0
  fi

  echo "$(date -Is) updating ${fqdn}: ${current_ip:-<unknown>} -> ${desired_ip}"
  local payload
  payload="$(printf '{"type":"A","name":"%s","content":"%s","ttl":%s,"proxied":%s}' "${fqdn}" "${desired_ip}" "${ttl}" "${proxied}")"
  local put_json
  put_json="$(cf_api PUT "https://api.cloudflare.com/client/v4/zones/${zone_id}/dns_records/${record_id}" "${payload}")"
  require_success "${put_json}"
}

main() {
  local ip zone_id
  ip="$(get_public_ip)"
  zone_id="$(get_zone_id)"

  local penthouse_id api_id
  if [ -n "${CF_RECORD_PENTHOUSE_ID:-}" ]; then
    penthouse_id="${CF_RECORD_PENTHOUSE_ID}"
  else
    local json
    json="$(get_record_by_name "${zone_id}" "${CF_RECORD_PENTHOUSE_NAME}")"
    penthouse_id="$(json_extract "${json}" '.result[0].id // empty' '.*\"result\"\\s*:\\s*\\[\\s*\\{[^}]*\"id\"\\s*:\\s*\"([^\"]+)\".*')"
  fi

  if [ -n "${CF_RECORD_API_ID:-}" ]; then
    api_id="${CF_RECORD_API_ID}"
  else
    local json
    json="$(get_record_by_name "${zone_id}" "${CF_RECORD_API_NAME}")"
    api_id="$(json_extract "${json}" '.result[0].id // empty' '.*\"result\"\\s*:\\s*\\[\\s*\\{[^}]*\"id\"\\s*:\\s*\"([^\"]+)\".*')"
  fi

  if [ -z "${penthouse_id:-}" ] || [ "${penthouse_id}" = "null" ]; then
    echo "Could not resolve record id for ${CF_RECORD_PENTHOUSE_NAME}"
    exit 1
  fi
  if [ -z "${api_id:-}" ] || [ "${api_id}" = "null" ]; then
    echo "Could not resolve record id for ${CF_RECORD_API_NAME}"
    exit 1
  fi

  update_record_if_needed "${zone_id}" "${penthouse_id}" "${CF_RECORD_PENTHOUSE_NAME}" "${ip}"
  update_record_if_needed "${zone_id}" "${api_id}" "${CF_RECORD_API_NAME}" "${ip}"
}

main "$@"
