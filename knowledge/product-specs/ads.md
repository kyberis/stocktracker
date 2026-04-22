# ads

> Free-tier ad placements.

## 1. Summary
Optional monetization of the Free tier via banner ads. Admin-configurable slots and targeting.

## 2. Status
- **Tier:** Free
- **Feature flag:** `ADS`
- **Health:** C
- **Owning skill:** [`engineer-dashboard`](../../.cursor/skills/engineer-dashboard/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| Component | `AdSlot.tsx` (if present) | Slot. |
| API | `/api/admin/ad-config` | Admin config. |

## 4. Data model
- `platform_settings.ad_config`.

## 5. API surface
- Read config.

## 6. UI surface
- Sidebar + footer slots on Free tier only.

## 7. Business logic
- Slots auto-disabled on Pro.
- Respect GDPR/consent banner.

## 8. External dependencies
- Ad network if used.

## 9. Currency / FX / tax implications
- N/A.

## 10. i18n
- Creatives localized.

## 11. Permissions / tier gating / rate limits
- Opt-out available.

## 12. Telemetry
- `ads_impressions_total`.

## 13. Edge cases & gotchas
- Consent required before loading external scripts.

## 14. Tests
- Smoke.

## 15. Related skills and rules
- [`legal-advisor`](../../.cursor/skills/legal-advisor/SKILL.md)
- Related specs: [cookies-consent](cookies-consent.md).

## 16. Open questions / planned work
- House ads vs network.
