#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

APK_SOURCE="${1:-${REPO_ROOT}/artifacts/the-penthouse.apk}"
APK_FILE_NAME="${MOBILE_APK_FILENAME:-the-penthouse.apk}"
DOTENV_DATA_PATH=""
if [ -z "${PENTHOUSE_DATA_PATH:-}" ] && [ -f "${REPO_ROOT}/.env" ]; then
    DOTENV_DATA_PATH="$(grep -E '^PENTHOUSE_DATA_PATH=' "${REPO_ROOT}/.env" | tail -n 1 | cut -d= -f2- | tr -d '"' || true)"
fi
RAW_DATA_PATH="${PENTHOUSE_DATA_PATH:-${DOTENV_DATA_PATH:-${REPO_ROOT}/data}}"
if [[ "$RAW_DATA_PATH" = /* ]]; then
    DATA_ROOT="$RAW_DATA_PATH"
else
    DATA_ROOT="${REPO_ROOT}/${RAW_DATA_PATH}"
fi
DOWNLOADS_DIR="${DOWNLOADS_DIR:-${DATA_ROOT}/downloads}"
TARGET_APK_PATH="${DOWNLOADS_DIR}/${APK_FILE_NAME}"
MANIFEST_PATH="${DOWNLOADS_DIR}/app-update.json"

if [ ! -f "${APK_SOURCE}" ]; then
    echo "Error: APK source file not found: ${APK_SOURCE}"
    exit 1
fi

mkdir -p "${DOWNLOADS_DIR}"
install -m 0644 "${APK_SOURCE}" "${TARGET_APK_PATH}"

if command -v sha256sum >/dev/null 2>&1; then
    CHECKSUM_SHA256="$(sha256sum "${TARGET_APK_PATH}" | awk '{print $1}')"
elif command -v shasum >/dev/null 2>&1; then
    CHECKSUM_SHA256="$(shasum -a 256 "${TARGET_APK_PATH}" | awk '{print $1}')"
else
    CHECKSUM_SHA256="$(openssl dgst -sha256 "${TARGET_APK_PATH}" | awk '{print $NF}')"
fi

LATEST_VERSION="${MOBILE_LATEST_VERSION:-}"
if [ -z "${LATEST_VERSION}" ] && [ -f "${REPO_ROOT}/mobile/app.json" ]; then
    LATEST_VERSION="$(sed -n 's/.*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "${REPO_ROOT}/mobile/app.json" | head -n 1)"
fi
LATEST_VERSION="${LATEST_VERSION:-1.0.0}"

MANDATORY="${MOBILE_UPDATE_MANDATORY:-false}"
if [ "${MANDATORY}" != "true" ] && [ "${MANDATORY}" != "false" ]; then
    echo "Error: MOBILE_UPDATE_MANDATORY must be either 'true' or 'false'."
    exit 1
fi

NOTES="${MOBILE_UPDATE_NOTES:-}"
if [ -z "${NOTES}" ] && [ -n "${MOBILE_UPDATE_NOTES_FILE:-}" ] && [ -f "${MOBILE_UPDATE_NOTES_FILE}" ]; then
    NOTES="$(cat "${MOBILE_UPDATE_NOTES_FILE}")"
fi
if [ -z "${NOTES}" ] && [ -n "${GITHUB_SHA:-}" ]; then
    NOTES="Automated build from commit ${GITHUB_SHA}"
fi
MIN_SUPPORTED_VERSION="${MOBILE_MIN_SUPPORTED_VERSION:-}"
PUBLISHED_AT="${MOBILE_PUBLISHED_AT:-$(date -u +"%Y-%m-%dT%H:%M:%SZ")}"

json_escape() {
    printf '%s' "$1" | awk 'BEGIN { ORS=""; } { gsub(/\\/,"\\\\"); gsub(/"/,"\\\""); gsub(/\n/,"\\n"); print; }'
}

{
    printf '{\n'
    printf '  "latestVersion": "%s",\n' "$(json_escape "${LATEST_VERSION}")"
    printf '  "fileName": "%s",\n' "$(json_escape "${APK_FILE_NAME}")"
    printf '  "mandatory": %s,\n' "${MANDATORY}"
    printf '  "notes": "%s",\n' "$(json_escape "${NOTES}")"
    if [ -n "${MIN_SUPPORTED_VERSION}" ]; then
        printf '  "minSupportedVersion": "%s",\n' "$(json_escape "${MIN_SUPPORTED_VERSION}")"
    fi
    printf '  "publishedAt": "%s",\n' "$(json_escape "${PUBLISHED_AT}")"
    printf '  "checksumSha256": "%s"\n' "$(json_escape "${CHECKSUM_SHA256}")"
    printf '}\n'
} > "${MANIFEST_PATH}"

echo "Published APK:"
echo "  source:   ${APK_SOURCE}"
echo "  target:   ${TARGET_APK_PATH}"
echo "  manifest: ${MANIFEST_PATH}"
echo "  sha256:   ${CHECKSUM_SHA256}"
