#!/bin/bash

set -euo pipefail

# Deploy an APK to your TrueNAS host over SSH/SCP.
#
# Security note:
# - Do NOT hardcode passwords/tokens in this repo.
# - Prefer SSH keys.
#
# Usage:
#   SERVER_HOST=192.168.0.120 ./scripts/deploy_apk.sh path/to/the-penthouse.apk
#
# Optional env vars:
#   SERVER_USER=root
#   SERVER_PORT=22
#   DEST_PATH=/mnt/Storage_Pool/penthouse/app/data/downloads/the-penthouse.apk
#   SSHPASS=...   (discouraged; only used if sshpass is installed)

SERVER_HOST="${SERVER_HOST:-}"
SERVER_USER="${SERVER_USER:-root}"
SERVER_PORT="${SERVER_PORT:-22}"
DEST_PATH="${DEST_PATH:-/mnt/Storage_Pool/penthouse/app/data/downloads/the-penthouse.apk}"

if [ -z "${SERVER_HOST}" ]; then
    echo "Error: SERVER_HOST is required."
    echo "Example: SERVER_HOST=192.168.0.120 $0 path/to/the-penthouse.apk"
    exit 1
fi

# Find the latest .apk file in the current directory or arguments
APK_FILE="${1:-}"
if [ -z "$APK_FILE" ]; then
    APK_FILE=$(ls -t *.apk 2>/dev/null | head -n 1)
fi

if [ -z "$APK_FILE" ]; then
    echo "Error: No .apk file found in current directory. Please provide path to APK."
    echo "Usage: ./deploy_apk.sh [path/to/app.apk]"
    exit 1
fi

echo "Deploying $APK_FILE to ${SERVER_USER}@${SERVER_HOST}:${DEST_PATH} ..."

REMOTE_DIR=$(dirname "$DEST_PATH")

SSH_OPTS=(-p "${SERVER_PORT}" -o StrictHostKeyChecking=accept-new)
SCP_OPTS=(-P "${SERVER_PORT}" -o StrictHostKeyChecking=accept-new)

if [ -n "${SSHPASS:-}" ] && command -v sshpass &> /dev/null; then
    sshpass -p "${SSHPASS}" ssh "${SSH_OPTS[@]}" "${SERVER_USER}@${SERVER_HOST}" "mkdir -p '${REMOTE_DIR}'"
    sshpass -p "${SSHPASS}" scp "${SCP_OPTS[@]}" "$APK_FILE" "${SERVER_USER}@${SERVER_HOST}:${DEST_PATH}"
else
    echo "Using SSH keys or interactive auth if needed."
    ssh "${SSH_OPTS[@]}" "${SERVER_USER}@${SERVER_HOST}" "mkdir -p '${REMOTE_DIR}'"
    scp "${SCP_OPTS[@]}" "$APK_FILE" "${SERVER_USER}@${SERVER_HOST}:${DEST_PATH}"
fi

echo "✅ deployment successful!"
echo "Download link (prod default): https://penthouse.blog/downloads/the-penthouse.apk"
