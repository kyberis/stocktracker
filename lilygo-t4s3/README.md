# trefolio Leaf Firmware

PlatformIO project for the trefolio Leaf device (LILYGO T4-S3 board).

## Board

- **MCU**: ESP32-S3R8, dual-core LX7 @ 240 MHz
- **Memory**: 16 MB Flash, 8 MB PSRAM
- **Display**: 2.41" AMOLED 450x600 (RM690B0)
- **Touch**: Capacitive (CST226SE)
- **Connectivity**: WiFi 2.4 GHz, Bluetooth 5 LE

## Quick Start

```bash
# Optional: STA Wi‑Fi bootstrap when NVS has no SSID yet (locals only; gitignored):
# cp src/wifi_preset_secret.example.h src/wifi_preset_secret.h  # edit TRE_WIFI_PRESET_* macros

pio run -e lilygo-t4-s3 --target upload

pio device monitor   # 115200 baud
```

## Debugging

The ESP32-S3 has built-in USB JTAG. Press **F5** in VS Code/Cursor to start a debug session with breakpoints and variable inspection.

If the board is not detected, hold **Boot** while pressing **Reset**, then release Boot to enter download mode.

## Resources

- [LilyGo-AMOLED-Series](https://github.com/Xinyuan-LilyGO/LilyGo-AMOLED-Series) — official library and examples
- [T4-S3 product page](https://lilygo.cc/en-us/products/t4-s3)
- [PlatformIO docs](https://docs.platformio.org/)
