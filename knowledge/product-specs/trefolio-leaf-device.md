# trefolio-leaf-device

> trefolio Leaf hardware (LILYGO T4-S3 ESP32-S3 AMOLED).

## 1. Summary
A physical desk device that polls the user's portfolio API and displays value / chart / ticker data on a 2.41" AMOLED. Configured via Wi-Fi + API key.

## 2. Status
- **Tier:** Hardware (one-off purchase + Pro subscription for features).
- **Feature flag:** `DEVICE_INTEREST` (waitlist).
- **Health:** B
- **Owning skill:** [`engineer-device`](../../.cursor/skills/engineer-device/SKILL.md), [`designer-device`](../../.cursor/skills/designer-device/SKILL.md), [`pm-device`](../../.cursor/skills/pm-device/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| Firmware | Separate repo / `device/` folder. | PlatformIO. |
| API | [`src/app/api/device-interest/`](../../src/app/api/device-interest), `/api/device-api-key/*` | Waitlist + auth. |
| DB | [`src/lib/db/device-interest.ts`](../../src/lib/db/device-interest.ts), `device-api-keys.ts` | Storage. |

## 4. Data model
- `device_interest` (waitlist), `device_api_keys` (per-device token).

## 5. API surface
- Device-facing endpoints return portfolio deltas in compact JSON.

## 6. UI surface
- Settings page to provision device, status LEDs/indicators on device.

## 7. Business logic
- Firmware polls every N minutes; respects rate limits.
- OTA firmware update via `firmware-release` skill.

## 8. External dependencies
- None beyond Wi-Fi.

## 9. Currency / FX / tax implications
- Values shown in preferred currency.

## 10. i18n
- Device shows numbers; labels minimal.

## 11. Permissions / tier gating / rate limits
- API key scoped; revocable.

## 12. Telemetry
- `device_polls_total`, `device_errors_total`.

## 13. Edge cases & gotchas
- Wi-Fi provisioning flow (BLE fallback).

## 14. Tests
- SDL simulator for LVGL UI.

## 15. Related skills and rules
- [`engineer-device`](../../.cursor/skills/engineer-device/SKILL.md)
- [`firmware-release`](../../.cursor/skills/firmware-release/SKILL.md)
- [`architect-hardware`](../../.cursor/skills/architect-hardware/SKILL.md)
- Related specs: [device-firmware-ota](device-firmware-ota.md), [device-lvgl-ui](device-lvgl-ui.md), [sdl-simulator](sdl-simulator.md).

## 16. Open questions / planned work
- E-ink variant.
