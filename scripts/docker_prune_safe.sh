#!/usr/bin/env bash
set -euo pipefail

# Safe-ish Docker cleanup for a small self-hosted box.
#
# What it does:
# - prune builder cache older than PRUNE_UNTIL_HOURS (default: 168h = 7d)
# - prune unused images older than PRUNE_UNTIL_HOURS
#
# What it does NOT do:
# - prune volumes
# - prune networks in use
#
# Usage (TrueNAS host, root):
#   ./scripts/docker_prune_safe.sh

PRUNE_UNTIL_HOURS="${PRUNE_UNTIL_HOURS:-168}"

if ! command -v docker >/dev/null 2>&1; then
  echo "docker not found"
  exit 1
fi

echo "$(date -Is) docker prune start (until=${PRUNE_UNTIL_HOURS}h)"

# Builder cache can explode over time on auto-deploy hosts.
docker builder prune -f --filter "until=${PRUNE_UNTIL_HOURS}h" || true

# Remove images not used by any container.
docker image prune -f --filter "until=${PRUNE_UNTIL_HOURS}h" || true

echo "$(date -Is) docker prune done"

