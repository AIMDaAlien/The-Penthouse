#!/usr/bin/env bash
set -euo pipefail

# TrueNAS SCALE SSH hardening helper.
#
# This script is intentionally "safe by default":
# - Default mode is DRY RUN (prints what it would do).
# - You must pass --apply to actually change anything.
#
# Why: messing up SSH settings can lock you out of your own server.
#
# Recommended flow:
# 1) Create admin user + add SSH key.
# 2) Open a second SSH session as that admin user and confirm it works.
# 3) Only then disable root login + password auth.
#
# Usage:
#   ./scripts/truenas_ssh_hardening.sh --admin-user pentadmin --pubkey-file /root/pentadmin.pub
#   ./scripts/truenas_ssh_hardening.sh --admin-user pentadmin --pubkey-file /root/pentadmin.pub --apply --disable-root --disable-password
#
# Notes:
# - On TrueNAS SCALE, persistent SSH settings are managed by middleware (midclt).
# - This uses midclt if present; otherwise it only prints recommended UI steps.

ADMIN_USER=""
PUBKEY_FILE=""
APPLY="false"
DISABLE_ROOT="false"
DISABLE_PASSWORD="false"

die() { echo "error: $*" >&2; exit 1; }

while [ $# -gt 0 ]; do
  case "$1" in
    --admin-user) ADMIN_USER="${2:-}"; shift 2 ;;
    --pubkey-file) PUBKEY_FILE="${2:-}"; shift 2 ;;
    --apply) APPLY="true"; shift 1 ;;
    --disable-root) DISABLE_ROOT="true"; shift 1 ;;
    --disable-password) DISABLE_PASSWORD="true"; shift 1 ;;
    -h|--help)
      sed -n '1,80p' "$0"
      exit 0
      ;;
    *) die "unknown arg: $1" ;;
  esac
done

[ "$(id -u)" -eq 0 ] || die "run as root"
[ -n "$ADMIN_USER" ] || die "--admin-user is required"
[ -n "$PUBKEY_FILE" ] || die "--pubkey-file is required"
[ -f "$PUBKEY_FILE" ] || die "pubkey file not found: $PUBKEY_FILE"

PUBKEY="$(cat "$PUBKEY_FILE")"
echo "Admin user: $ADMIN_USER"
echo "Apply mode: $APPLY"
echo "Disable root SSH login: $DISABLE_ROOT"
echo "Disable password auth: $DISABLE_PASSWORD"
echo

if ! command -v midclt >/dev/null 2>&1; then
  echo "midclt not found. Use the TrueNAS UI instead:"
  echo "- Credentials -> Local Users: create '$ADMIN_USER', paste SSH public key"
  echo "- System Settings -> Services -> SSH: disable Root Login and Password Authentication"
  exit 0
fi

run() {
  if [ "$APPLY" = "true" ]; then
    eval "$@"
  else
    echo "[dry-run] $*"
  fi
}

echo "Checking if user exists..."
USER_ID="$(midclt call user.query "[[\"username\",\"=\",\"${ADMIN_USER}\"]]" | jq -r '.[0].id // empty' 2>/dev/null || true)"

if [ -z "$USER_ID" ]; then
  echo "User '$ADMIN_USER' does not exist. Creating..."
  # Create a non-root admin with sudo and SSH key. Password login can be disabled after validation.
  # TrueNAS user.create fields vary by version; keep it minimal and set sshpubkey.
  run "midclt call user.create '{\"username\":\"${ADMIN_USER}\",\"full_name\":\"Penthouse Admin\",\"group_create\":true,\"sshpubkey\":\"${PUBKEY}\",\"sudo\":true}'"
else
  echo "User '$ADMIN_USER' exists (id=$USER_ID). Ensuring SSH key is set..."
  run "midclt call user.update ${USER_ID} '{\"sshpubkey\":\"${PUBKEY}\",\"sudo\":true}'"
fi

echo
echo "Current SSH service config (read-only):"
midclt call ssh.config | jq '{rootlogin, passwordauth, tcpport, hostkey, sftp_log_level, sftp_log_facility}' 2>/dev/null || midclt call ssh.config

if [ "$DISABLE_ROOT" = "true" ] || [ "$DISABLE_PASSWORD" = "true" ]; then
  echo
  echo "Planned SSH hardening changes:"
  payload="{"
  first="true"
  if [ "$DISABLE_ROOT" = "true" ]; then
    payload="${payload}\"rootlogin\":false"
    first="false"
  fi
  if [ "$DISABLE_PASSWORD" = "true" ]; then
    if [ "$first" = "false" ]; then payload="${payload},"; fi
    payload="${payload}\"passwordauth\":false"
  fi
  payload="${payload}}"

  run "midclt call ssh.update '${payload}'"
  run "midclt call service.restart ssh"
  echo
  echo "IMPORTANT:"
  echo "- Keep an existing SSH session open."
  echo "- Open a new SSH session as '$ADMIN_USER' and confirm it works BEFORE closing the old one."
fi

