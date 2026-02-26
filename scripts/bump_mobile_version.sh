#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  ./scripts/bump_mobile_version.sh <patch|minor|major|x.y.z|x.y|vx.y.z|vx.y>

Examples:
  ./scripts/bump_mobile_version.sh patch
  ./scripts/bump_mobile_version.sh minor
  ./scripts/bump_mobile_version.sh 1.2
  ./scripts/bump_mobile_version.sh v2.0.0
EOF
}

if [ $# -ne 1 ]; then
  usage
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "Error: jq is required."
  exit 1
fi

INPUT="$1"
INPUT="${INPUT#v}"

if [ "${INPUT}" = "patch" ] || [ "${INPUT}" = "minor" ] || [ "${INPUT}" = "major" ]; then
  TARGET="${INPUT}"
elif [[ "${INPUT}" =~ ^[0-9]+\.[0-9]+$ ]]; then
  TARGET="${INPUT}.0"
elif [[ "${INPUT}" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  TARGET="${INPUT}"
else
  echo "Error: invalid version argument: ${1}"
  usage
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
MOBILE_DIR="${REPO_ROOT}/mobile"

cd "${MOBILE_DIR}"
npm version "${TARGET}" --no-git-tag-version >/dev/null
NEW_VERSION="$(jq -r '.version' package.json)"

TMP_FILE="$(mktemp)"
jq --arg version "${NEW_VERSION}" '.expo.version = $version' app.json > "${TMP_FILE}"
mv "${TMP_FILE}" app.json

echo "Mobile version set to ${NEW_VERSION}"
