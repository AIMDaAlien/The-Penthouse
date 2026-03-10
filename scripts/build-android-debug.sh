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

if [ -z "${ANDROID_SDK_ROOT:-}" ] && [ ! -f "$REPO_DIR/apps/mobile/android/local.properties" ]; then
  printf '%s\n' '[android-build] Android SDK not configured.'
  printf '%s\n' '[android-build] Set ANDROID_SDK_ROOT or create apps/mobile/android/local.properties with sdk.dir=...'
  exit 1
fi

"$SCRIPT_DIR/prepare-android-testing.sh"

printf '%s\n' '[android-build] assembling debug APK'
cd "$REPO_DIR/apps/mobile/android"
./gradlew assembleDebug

printf '%s\n' '[android-build] APK ready at apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk'
