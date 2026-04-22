# capacitor-mobile

> Native iOS/Android apps via Capacitor (hosted mode).

## 1. Summary
Web app wrapped in Capacitor shell for App Store + Play Store. Native features: push, biometrics, share sheet, status bar styling.

## 2. Status
- **Tier:** public
- **Feature flag:** _none_
- **Health:** B
- **Owning skill:** [`engineer-mobile`](../../.cursor/skills/engineer-mobile/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| Config | `capacitor.config.ts`, `ios/`, `android/` | Native projects. |

## 4. Data model
- N/A.

## 5. API surface
- Uses web endpoints.

## 6. UI surface
- Same as web with native polish.

## 7. Business logic
- `SafeArea` + `StatusBar` plugins; push tokens registered via `/api/push-subscriptions`.

## 8. External dependencies
- Capacitor plugins, APNs/FCM.

## 9. Currency / FX / tax implications
- N/A.

## 10. i18n
- Matches web.

## 11. Permissions / tier gating / rate limits
- Native permission prompts.

## 12. Telemetry
- `analytics_events`: `mobile.open_total`.

## 13. Edge cases & gotchas
- Review rules: no direct "subscribe via web"; hide CTA on iOS if required.

## 14. Tests
- Manual device testing.

## 15. Related skills and rules
- [`engineer-mobile`](../../.cursor/skills/engineer-mobile/SKILL.md)
- Related specs: [push-notifications](push-notifications.md), [pwa](pwa.md).

## 16. Open questions / planned work
- In-app purchase integration.
