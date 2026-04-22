# device-lvgl-ui

> LVGL-based UI on the Leaf display.

## 1. Summary
Screens: value-big, value-chart, per-holding, watchlist, settings. Navigation via two buttons + accelerometer.

## 2. Status
- **Tier:** Hardware
- **Feature flag:** _none_
- **Health:** B
- **Owning skill:** [`engineer-device`](../../.cursor/skills/engineer-device/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| Firmware | `device/src/ui/*.c` | LVGL screens. |

## 4. Data model
- In-memory structs from API poll.

## 5. API surface
- Consumes portfolio JSON.

## 6. UI surface
- Monochrome + accent theme matching web.

## 7. Business logic
- Screens cycle on a timer; user override with button.

## 8. External dependencies
- LVGL.

## 9. Currency / FX / tax implications
- Numbers in preferred currency.

## 10. i18n
- Labels minimal, localized strings baked.

## 11. Permissions / tier gating / rate limits
- N/A.

## 12. Telemetry
- Via API polls.

## 13. Edge cases & gotchas
- Low-RAM GC handling.

## 14. Tests
- SDL simulator.

## 15. Related skills and rules
- [`engineer-device`](../../.cursor/skills/engineer-device/SKILL.md)
- Related specs: [sdl-simulator](sdl-simulator.md).

## 16. Open questions / planned work
- Touch gestures.
