# device-interest

> Waitlist for the trefolio Leaf device.

## 1. Summary
Email signup form that collects interest. Count shown publicly for social proof.

## 2. Status
- **Tier:** public
- **Feature flag:** `DEVICE_INTEREST`
- **Health:** green
- **Owning skill:** [`marketing-device`](../../.cursor/skills/marketing-device/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| API | [`src/app/api/device-interest/`](../../src/app/api/device-interest) | Signup + count. |
| DB | [`src/lib/db/device-interest.ts`](../../src/lib/db/device-interest.ts) | Storage. |

## 4. Data model
- `device_interest`: email, created_at, source.

## 5. API surface
| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| POST | `/api/device-interest` | public | Public | Signup. |
| GET | `/api/device-interest/count` | public | Public | Public count. |

## 6. UI surface
- Banner + dedicated page on landing.

## 7. Business logic
- Email validated, deduped.

## 8. External dependencies
- Resend (confirmation).

## 9. Currency / FX / tax implications
- N/A.

## 10. i18n
- All locales.

## 11. Permissions / tier gating / rate limits
- Rate-limited.

## 12. Telemetry
- `device_interest_signups_total`.

## 13. Edge cases & gotchas
- Suppress disposable emails.

## 14. Tests
- DB tests.

## 15. Related skills and rules
- [`marketing-device`](../../.cursor/skills/marketing-device/SKILL.md)
- Related specs: [trefolio-leaf-device](trefolio-leaf-device.md).

## 16. Open questions / planned work
- Pre-order integration.
