#!/usr/bin/env bash
# Builds a native mkspiffs for SPIFFS_META_LEN=4 (Arduino-ESP32 / PlatformIO default).
# Use on Apple Silicon when PlatformIO's packaged mkspiffs exits with:
#   "Bad CPU type in executable" (no Rosetta/x86 emulation).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$ROOT/tools/host-mkspiffs/mkspiffs"
WORKDIR="${WORKDIR:-$(mktemp -d /tmp/mkspiffs-stocktracker.XXXXXX)}"

cleanup() {
  [[ -z "${WORKDIR_KEEP:-}" ]] && rm -rf "$WORKDIR"
}
trap cleanup EXIT

if [[ "$(uname)" != Darwin ]] || [[ "$(uname -m)" != arm64 ]]; then
  echo "This shortcut build is intended for macOS/arm64 hosts; on other hosts use upstream mkspiffs README or Rosetta+pIO uploadfs." >&2
fi

mkdir -p "$(dirname "$OUT")"
mkdir -p "$WORKDIR"
git clone --depth 1 https://github.com/igrr/mkspiffs.git "$WORKDIR/mkspiffs-src"
(cd "$WORKDIR/mkspiffs-src" && git submodule update --init --recursive)
cd "$WORKDIR/mkspiffs-src"
make clean
make SKIP_TESTS=1 \
  TARGET_CFLAGS= TARGET_CXXFLAGS= TARGET_LDFLAGS= \
  CPPFLAGS='-DSPIFFS_OBJ_META_LEN=4' \
  BUILD_CONFIG_NAME=espressif32-arduino-stocktracker
strip mkspiffs
cp mkspiffs "$OUT"
chmod +x "$OUT"
echo "Installed: $OUT"
"$OUT" --version
