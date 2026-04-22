# pwa

> Progressive Web App install + service worker.

## 1. Summary
Manifest + service worker enable "Add to Home Screen" on mobile web. Offline mode shows a cached empty state + last-known portfolio.

## 2. Status
- **Tier:** public
- **Feature flag:** _none_
- **Health:** B
- **Owning skill:** [`engineer-mobile`](../../.cursor/skills/engineer-mobile/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| Manifest | `public/manifest.webmanifest` | Icon + scope. |
| SW | `public/sw.js` (if present) | Service worker. |

## 4. Data model
- Cache in SW + IDB.

## 5. API surface
- Web Push.

## 6. UI surface
- Install prompt; offline fallback.

## 7. Business logic
- SW precaches shell; dynamic requests cache-first with SWR.

## 8. External dependencies
- None.

## 9. Currency / FX / tax implications
- N/A.

## 10. i18n
- All locales.

## 11. Permissions / tier gating / rate limits
- Respect quiet hours.

## 12. Telemetry
- `pwa_install_total`.

## 13. Edge cases & gotchas
- Version SW to avoid stuck clients.

## 14. Tests
- Lighthouse PWA audit.

## 15. Related skills and rules
- [`engineer-mobile`](../../.cursor/skills/engineer-mobile/SKILL.md)
- Related specs: [capacitor-mobile](capacitor-mobile.md), [push-notifications](push-notifications.md).

## 16. Open questions / planned work
- Full-offline mode with queue writes.
