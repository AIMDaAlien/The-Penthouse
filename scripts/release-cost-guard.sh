#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "usage: $0 <git-range>"
  exit 1
fi

RANGE="$1"
NATIVE_IMPACT='^(apps/mobile/capacitor\.config\.(ts|json)|apps/mobile/android/|apps/mobile/ios/|apps/mobile/package\.json|apps/mobile/package-lock\.json)'

if git diff --name-only "$RANGE" | grep -E "$NATIVE_IMPACT" >/dev/null; then
  echo "native-impact-change=true"
else
  echo "native-impact-change=false"
fi
