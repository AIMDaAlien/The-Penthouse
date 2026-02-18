#!/usr/bin/env bash
set -euo pipefail

echo "Running secret guard..."

FAIL=0

GREP_EXCLUDES=(
  --exclude-dir=.git
  --exclude-dir=node_modules
  --exclude-dir=dist
  --exclude-dir=build
  --exclude=\*.png
  --exclude=\*.jpg
  --exclude=\*.jpeg
  --exclude=\*.gif
  --exclude=\*.webp
  --exclude=\*.mp4
  --exclude=\*.apk
  --exclude=\*.sqlite
  --exclude=\*.db
  --exclude=\*.zip
  --exclude=\*.tgz
)

print_match() {
  local title="$1"
  shift
  echo ""
  echo "ERROR: ${title}"
  echo "----"
  # shellcheck disable=SC2068
  grep -RIn ${GREP_EXCLUDES[@]} -E "$@" . || true
  echo "----"
  echo ""
}

# 1) Hardcoded sshpass password (literal string after -p).
# Allow variable-based forms like: sshpass -p "$SSHPASS" ...
if grep -RIn "${GREP_EXCLUDES[@]}" -E "sshpass[[:space:]]+-p[[:space:]]+['\"][^$][^'\"]+['\"]" . >/dev/null 2>&1; then
  print_match "Hardcoded sshpass password found (use SSHPASS env var or SSH keys)" \
    "sshpass[[:space:]]+-p[[:space:]]+['\"][^$][^'\"]+['\"]"
  FAIL=1
fi

# 2) Hardcoded SERVER_PASS assignment
if grep -RIn "${GREP_EXCLUDES[@]}" -E "SERVER_PASS[[:space:]]*=[[:space:]]*['\"][^'\"]+['\"]" . >/dev/null 2>&1; then
  print_match "Hardcoded SERVER_PASS found (do not commit passwords)" \
    "SERVER_PASS[[:space:]]*=[[:space:]]*['\"][^'\"]+['\"]"
  FAIL=1
fi

# 3) Secret env files should never be tracked
TRACKED_SECRET_FILES="$(git ls-files -- .env .backup.env .cloudflare-ddns.env 2>/dev/null || true)"
if [ -n "${TRACKED_SECRET_FILES}" ]; then
  echo ""
  echo "ERROR: Secret env files are tracked by git (remove + add to .gitignore):"
  echo "${TRACKED_SECRET_FILES}"
  echo ""
  FAIL=1
fi

# 4) Cloudflare API token literal assignment (long token-like value)
# This intentionally ignores placeholders like '...' and env var expansions.
if grep -RIn "${GREP_EXCLUDES[@]}" --exclude=\*.example -E "CF_API_TOKEN[[:space:]]*=[[:space:]]*[A-Za-z0-9_-]{20,}" . >/dev/null 2>&1; then
  print_match "Potential literal CF_API_TOKEN detected (do not commit API tokens)" \
    "CF_API_TOKEN[[:space:]]*=[[:space:]]*[A-Za-z0-9_-]{20,}"
  FAIL=1
fi

if [ "${FAIL}" -ne 0 ]; then
  echo "Secret guard failed."
  exit 1
fi

echo "Secret guard passed."
