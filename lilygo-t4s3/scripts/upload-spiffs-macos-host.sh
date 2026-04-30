#!/usr/bin/env bash
# Builds data/ into a SPIFFS image and uploads to SPIFFS partition (default_16MB.csv).
# Use when `pio run -t uploadfs` fails on Apple Silicon ("Bad CPU type" mkspiffs).
#
# Prerequisites: PlatformIO-installed esptool (Python), device connected USB.
#
# Usage:
#   SERIAL_PORT=/dev/cu.usbmodem123456 bash scripts/upload-spiffs-macos-host.sh
# Defaults SERIAL_PORT from the only cu.usbmodem* if unset and exactly one matches.
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PYTHON="${PYTHON:-python3}"
MKS="${MKS:-$ROOT/tools/host-mkspiffs/mkspiffs}"
ESP="${ESP:-$HOME/.platformio/packages/tool-esptoolpy/esptool.py}"

# Matches platformio.ini [env:lilygo-t4-s3] / default_16MB.csv (16 MB flash boards)
SPIFFS_OFFSET=0xc90000
SPIFFS_SIZE_HEX=0x360000

# Matches espressif32/builder/main.py SPIFFS filesystem layout
FS_PAGE=256
FS_BLOCK=4096

BAUD="${BAUD:-460800}"
FLASH_MODE="${FLASH_MODE:-qio}"
FLASH_FREQ="${FLASH_FREQ:-80m}"
FLASH_SIZE_DETECT="${FLASH_SIZE_DETECT:-16MB}"

if [[ ! -x "$MKS" ]]; then
  echo "Missing host mkspiffs at $MKS – run scripts/build-host-mkspiffs.sh first." >&2
  exit 1
fi

if [[ ! -f "$ESP" ]]; then
  echo "esptool not found at $ESP (PlatformIO toolchain?)." >&2
  exit 1
fi

if [[ -z "${SERIAL_PORT:-}" ]]; then
  shopt -s nullglob
  ports=( /dev/cu.usbmodem* )
  shopt -u nullglob
  if [[ ${#ports[@]} -eq 1 ]]; then
    SERIAL_PORT="${ports[0]}"
  fi
fi
if [[ -z "${SERIAL_PORT:-}" ]]; then
  echo 'Set SERIAL_PORT=/dev/cu.usbmodem... (multiple USB serial devices).' >&2
  exit 1
fi

OUT="$ROOT/.pio/build/spiffs-upload-host.bin"
mkdir -p "$(dirname "$OUT")"

echo "SPIFFS packing $ROOT/data -> $OUT ..."
"$MKS" -c "$ROOT/data" -s "$SPIFFS_SIZE_HEX" -p "$FS_PAGE" -b "$FS_BLOCK" "$OUT"

chip=esp32s3
"$PYTHON" "$ESP" --chip "$chip" --port "$SERIAL_PORT" --baud "$BAUD" \
  --before default_reset --after hard_reset write_flash -z \
  --flash_mode "$FLASH_MODE" --flash_freq "$FLASH_FREQ" \
  --flash_size "$FLASH_SIZE_DETECT" "${SPIFFS_OFFSET}" "$OUT"

echo "SPIFFS uploaded to ${SERIAL_PORT}."
