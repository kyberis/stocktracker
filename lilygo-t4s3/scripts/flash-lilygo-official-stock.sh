#!/usr/bin/env bash
# Restore the unified stock demo from LilyGo (T4-S3 and other AMOLED boards share one binary).
# Upstream docs: https://github.com/Xinyuan-LilyGO/LilyGo-AMOLED-Series/blob/master/firmware/README.MD
set -euo pipefail

URL="https://raw.githubusercontent.com/Xinyuan-LilyGO/LilyGo-AMOLED-Series/master/firmware/firmware.bin"
BIN="${TMPDIR:-/tmp}/lilygo-stock-firmware.bin"

PORT="${ESPPORT:-}"
if [[ -z "${PORT}" ]] && command -v pio >/dev/null 2>&1; then
  PORT="$(pio device list 2>/dev/null | grep -E 'usbmodem|tty\.usbmodem|ttyACM|wchusb' | head -1 | awk '{print $1}' | tr -d '\r')" || true
fi
if [[ -z "${PORT}" ]]; then
  echo "Set ESPPORT to your ESP32-S3 USB serial (e.g. export ESPPORT=/dev/cu.usbmodem832201)" >&2
  exit 1
fi

if python3 -m esptool version >/dev/null 2>&1; then
  EPY=(python3 -m esptool)
elif [[ -x "${HOME}/.platformio/packages/tool-esptoolpy/esptool.py" ]]; then
  EPY=(python3 "${HOME}/.platformio/packages/tool-esptoolpy/esptool.py")
else
  echo "Need esptool: pip install --user esptool or PlatformIO tool-esptoolpy" >&2
  exit 1
fi

echo "Downloading ${URL} ..."
curl -fsSL -o "${BIN}" "${URL}"
echo "Erasing chip (full wipe; may take ~30–60 s) ..."
"${EPY[@]}" --chip esp32s3 --port "${PORT}" --baud 460800 erase_flash
echo "Writing stock firmware at 0x0 ..."
"${EPY[@]}" --chip esp32s3 --port "${PORT}" --baud 460800 \
  --before default_reset --after hard_reset write_flash -z \
  --flash_mode dio --flash_freq 80m \
  0x0 "${BIN}"
echo "Done. Press RST if nothing appears on boot."
