# device-firmware-ota

> OTA firmware updates.

## 1. Summary
Devices check for updated firmware at startup + daily. Downloads signed binary from a stable GitHub Release URL served via Vercel env var.

## 2. Status
- **Tier:** Hardware
- **Feature flag:** _none_
- **Health:** B
- **Owning skill:** [`firmware-release`](../../.cursor/skills/firmware-release/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| API | `/api/device/firmware` (if present) | Version pointer. |
| Env | `FW_VERSION`, `FW_URL` | Configured per environment. |

## 4. Data model
- None in DB (env-driven).

## 5. API surface
- GET current version + signed URL.

## 6. UI surface
- Device status indicator during update.

## 7. Business logic
- Signed image verified on device before flash.
- Rollback on boot failure.

## 8. External dependencies
- GitHub Releases.

## 9. Currency / FX / tax implications
- N/A.

## 10. i18n
- N/A.

## 11. Permissions / tier gating / rate limits
- Public but token-scoped per device.

## 12. Telemetry
- `fw_update_success_total`, `fw_update_failed_total`.

## 13. Edge cases & gotchas
- Power loss during flash → boot partition A/B.

## 14. Tests
- Hardware-in-loop.

## 15. Related skills and rules
- [`firmware-release`](../../.cursor/skills/firmware-release/SKILL.md)
- Related specs: [trefolio-leaf-device](trefolio-leaf-device.md).

## 16. Open questions / planned work
- Phased rollouts.
