#!/usr/bin/env bash
# Factory reset + original app + SPIFFS — one shot.
#
# - Full chip erase (NVS, Wi‑Fi, stored token, preferences)
# - Flash lilygo-t4-s3 (main.cpp + bootloader + partitions)
# - Populate SPIFFS from data/
#
# Usage (from lilygo root or anywhere):
#   cd lilygo-t4s3 && bash scripts/factory-reflash.sh
#
# SERIAL_PORT=/dev/cu.usbmodem123456 bash scripts/factory-reflash.sh
#
# SPIFFS on Apple Silicon: install host mkspiffs once:
#   bash scripts/build-host-mkspiffs.sh
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if ! command -v pio >/dev/null 2>&1; then
  echo "pio (PlatformIO) not found in PATH. Example: export PATH=\$HOME/Library/Python/3.9/bin:\$PATH" >&2
  exit 1
fi

ENV="${ENV:-lilygo-t4-s3}"
SERIAL_PORT="${SERIAL_PORT:-}"

if [[ -z "$SERIAL_PORT" ]]; then
  shopt -s nullglob
  ports=(/dev/cu.usbmodem*)
  shopt -u nullglob
  if [[ ${#ports[@]} -eq 1 ]]; then
    SERIAL_PORT="${ports[0]}"
  fi
fi
if [[ -z "$SERIAL_PORT" ]]; then
  echo "Specify SERIAL_PORT=/dev/cu.usbmodem... (several CDC devices)." >&2
  exit 1
fi

echo "== Erase entire flash → $SERIAL_PORT"
pio run -e "$ENV" -t erase --upload-port "$SERIAL_PORT"

echo "== Firmware (original app)"
pio run -e "$ENV" --target upload --upload-port "$SERIAL_PORT"

SPIFFS_NOTE=""
if [[ -x "${ROOT}/tools/host-mkspiffs/mkspiffs" ]]; then
  echo "== SPIFFS (host mkspiffs, Apple Silicon)"
  SERIAL_PORT="$SERIAL_PORT" bash "${ROOT}/scripts/upload-spiffs-macos-host.sh"
  SPIFFS_NOTE="SPIFFS uploaded."
else
  echo "== SPIFFS: trying PlatformIO uploadfs (may fail on Apple Silicon mkspiffs)"
  if pio run -e "$ENV" -t uploadfs --upload-port "$SERIAL_PORT"; then
    SPIFFS_NOTE="SPIFFS uploaded (pio uploadfs)."
  else
    SPIFFS_NOTE="SPIFFS skipped — run: bash scripts/build-host-mkspiffs.sh && SERIAL_PORT=$SERIAL_PORT bash scripts/upload-spiffs-macos-host.sh"
    echo "Warning: $SPIFFS_NOTE" >&2
  fi
fi

echo "Done. $SPIFFS_NOTE"
echo "After erase: no Wi‑Fi credentials; app should show provisioning if the panel works."
