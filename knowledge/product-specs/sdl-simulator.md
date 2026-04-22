# sdl-simulator

> Desktop simulator for the Leaf firmware.

## 1. Summary
Runs the LVGL UI locally with SDL2; speeds iteration without flashing hardware.

## 2. Status
- **Tier:** internal
- **Feature flag:** _none_
- **Health:** green
- **Owning skill:** [`engineer-device`](../../.cursor/skills/engineer-device/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| Firmware | `device/sim/` | SDL entry. |

## 4. Data model
- Mocked API client.

## 5. API surface
- None.

## 6. UI surface
- Desktop window rendering LVGL canvas.

## 7. Business logic
- Shared UI code between firmware and simulator.

## 8. External dependencies
- SDL2.

## 9. Currency / FX / tax implications
- N/A.

## 10. i18n
- As firmware.

## 11. Permissions / tier gating / rate limits
- N/A.

## 12. Telemetry
- N/A.

## 13. Edge cases & gotchas
- Threading differences vs ESP32.

## 14. Tests
- Visual snapshots.

## 15. Related skills and rules
- [`engineer-device`](../../.cursor/skills/engineer-device/SKILL.md)

## 16. Open questions / planned work
- Input recording for regression.
