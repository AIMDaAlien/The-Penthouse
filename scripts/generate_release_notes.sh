#!/usr/bin/env bash
set -euo pipefail

FROM_SHA="${1:-}"
TO_SHA="${2:-HEAD}"
MAX_ITEMS="${MAX_ITEMS:-8}"

is_zero_sha() {
  [ "$1" = "0000000000000000000000000000000000000000" ]
}

if [ -n "${FROM_SHA}" ] && ! is_zero_sha "${FROM_SHA}"; then
  RANGE="${FROM_SHA}..${TO_SHA}"
else
  if git rev-parse --verify "${TO_SHA}^" >/dev/null 2>&1; then
    RANGE="${TO_SHA}^..${TO_SHA}"
  else
    RANGE="${TO_SHA}"
  fi
fi

RAW_NOTES="$(
  git log --no-merges --pretty=format:'%s' "${RANGE}" \
    | sed 's/^[[:space:]]*//; s/[[:space:]]*$//' \
    | sed '/^$/d' \
    | head -n "${MAX_ITEMS}"
)"

if [ -z "${RAW_NOTES}" ]; then
  RAW_NOTES="$(git show -s --format='%s' "${TO_SHA}")"
fi

NOTES="$(
  printf '%s\n' "${RAW_NOTES}" \
    | awk '
      {
        line=$0;
        sub(/^[[:space:]]+/, "", line);
        sub(/^(feat|fix|docs|ci|chore|perf|refactor|test|build|ops)[[:space:]]*:[[:space:]]*/, "", line);
        if (length(line) > 0) print "- " line;
      }
    '
)"

echo "what changed in this build:"
echo "${NOTES}"
