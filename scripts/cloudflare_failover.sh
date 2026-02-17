#!/usr/bin/env bash
set -euo pipefail

required_vars=(
  CF_API_TOKEN
  CF_ZONE_ID
  CF_RECORD_PENTHOUSE_ID
  CF_RECORD_API_ID
  PRIMARY_IP
  FAILOVER_IP
)

for var in "${required_vars[@]}"; do
  if [ -z "${!var:-}" ]; then
    echo "Missing required env var: $var"
    exit 1
  fi
done

PRIMARY_HEALTH_URL="${PRIMARY_HEALTH_URL:-https://api.penthouse.blog/api/health}"
FAILOVER_HEALTH_URL="${FAILOVER_HEALTH_URL:-http://${FAILOVER_IP}/api/health}"

CF_BASE_URL="https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}"

cf_api() {
  local method="$1"
  local path="$2"
  local data="${3:-}"
  local response

  if [ -n "$data" ]; then
    response="$(curl -fsS -X "$method" \
      -H "Authorization: Bearer ${CF_API_TOKEN}" \
      -H "Content-Type: application/json" \
      "${CF_BASE_URL}/${path}" \
      --data "$data")"
  else
    response="$(curl -fsS -X "$method" \
      -H "Authorization: Bearer ${CF_API_TOKEN}" \
      -H "Content-Type: application/json" \
      "${CF_BASE_URL}/${path}")"
  fi

  if ! echo "$response" | jq -e '.success == true' >/dev/null; then
    echo "Cloudflare API error"
    echo "$response" | jq -c '.errors'
    exit 1
  fi

  echo "$response"
}

is_healthy() {
  local url="$1"
  curl -fsS --max-time 8 --connect-timeout 4 "$url" >/dev/null 2>&1
}

get_record() {
  local record_id="$1"
  cf_api GET "dns_records/${record_id}"
}

update_record_content() {
  local record_id="$1"
  local target_ip="$2"

  local record_json name type proxied ttl current
  record_json="$(get_record "$record_id")"

  name="$(echo "$record_json" | jq -r '.result.name')"
  type="$(echo "$record_json" | jq -r '.result.type')"
  proxied="$(echo "$record_json" | jq -r '.result.proxied')"
  ttl="$(echo "$record_json" | jq -r '.result.ttl')"
  current="$(echo "$record_json" | jq -r '.result.content')"

  if [ "$current" = "$target_ip" ]; then
    echo "Record already points to ${target_ip}: ${name}"
    return
  fi

  local payload
  payload="$(jq -n \
    --arg type "$type" \
    --arg name "$name" \
    --arg content "$target_ip" \
    --argjson ttl "$ttl" \
    --argjson proxied "$proxied" \
    '{type:$type,name:$name,content:$content,ttl:$ttl,proxied:$proxied}')"

  cf_api PUT "dns_records/${record_id}" "$payload" >/dev/null
  echo "Updated ${name}: ${current} -> ${target_ip}"
}

if is_healthy "$PRIMARY_HEALTH_URL"; then
  TARGET_IP="$PRIMARY_IP"
  DECISION="primary_healthy"
elif is_healthy "$FAILOVER_HEALTH_URL"; then
  TARGET_IP="$FAILOVER_IP"
  DECISION="primary_down_failover_healthy"
else
  echo "Both primary and failover health checks failed. No DNS changes applied."
  exit 0
fi

echo "Decision: ${DECISION}; target=${TARGET_IP}"
update_record_content "$CF_RECORD_PENTHOUSE_ID" "$TARGET_IP"
update_record_content "$CF_RECORD_API_ID" "$TARGET_IP"
