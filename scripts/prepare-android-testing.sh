#!/bin/sh
set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname "$0")" && pwd)"
REPO_DIR="$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)"

if [ -z "${JAVA_HOME:-}" ] && command -v /usr/libexec/java_home >/dev/null 2>&1; then
  JAVA17_HOME="$(/usr/libexec/java_home -v 17 2>/dev/null || true)"
  if [ -n "$JAVA17_HOME" ]; then
    export JAVA_HOME="$JAVA17_HOME"
  fi
fi

if [ -z "${ANDROID_SDK_ROOT:-}" ]; then
  for candidate in "/opt/homebrew/share/android-commandlinetools" "$HOME/Library/Android/sdk" "$HOME/Android/Sdk"; do
    if [ -d "$candidate" ]; then
      export ANDROID_SDK_ROOT="$candidate"
      break
    fi
  done
fi

if [ -z "${ANDROID_HOME:-}" ] && [ -n "${ANDROID_SDK_ROOT:-}" ]; then
  export ANDROID_HOME="$ANDROID_SDK_ROOT"
fi

cd "$REPO_DIR"

printf '%s\n' '[android-prep] building mobile web assets'
npm --workspace apps/mobile run build

if [ ! -d "$REPO_DIR/apps/mobile/android" ]; then
  printf '%s\n' '[android-prep] adding Capacitor Android project'
  npm --workspace apps/mobile exec cap add android
fi

printf '%s\n' '[android-prep] syncing Capacitor Android project'
npm --workspace apps/mobile exec cap sync android

if [ -n "${ANDROID_SDK_ROOT:-}" ]; then
  SDK_ESCAPED=$(printf '%s' "$ANDROID_SDK_ROOT" | sed 's/\\/\\\\/g')
  printf 'sdk.dir=%s\n' "$SDK_ESCAPED" > "$REPO_DIR/apps/mobile/android/local.properties"
  printf '%s\n' "[android-prep] wrote apps/mobile/android/local.properties"
else
  printf '%s\n' '[android-prep] ANDROID_SDK_ROOT not found. Build/install will fail until SDK path is configured.'
fi

if command -v adb >/dev/null 2>&1; then
  SERIALS="$(adb devices | awk 'NR>1 && $2 == "device" { print $1 }')"
  if [ -n "$SERIALS" ]; then
    printf '%s\n' "$SERIALS" | while IFS= read -r serial; do
      if adb -s "$serial" reverse tcp:3000 tcp:3000 >/dev/null 2>&1; then
        printf '%s\n' "[android-prep] adb reverse configured for $serial: device localhost:3000 -> host localhost:3000"
      else
        printf '%s\n' "[android-prep] adb reverse failed for $serial. Android app may not reach the local API until port 3000 is forwarded."
      fi
    done
  else
    printf '%s\n' '[android-prep] no Android device/emulator connected; skipped adb reverse'
  fi
fi

printf '%s\n' '[android-prep] done'
