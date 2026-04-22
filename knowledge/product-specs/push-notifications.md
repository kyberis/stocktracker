# push-notifications

> Web + native push notifications.

## 1. Summary
Service worker–based web push plus native Capacitor push on iOS/Android. Device tokens stored per user.

## 2. Status
- **Tier:** Free
- **Feature flag:** `PUSH_NOTIFICATIONS`
- **Health:** B
- **Owning skill:** [`engineer-mobile`](../../.cursor/skills/engineer-mobile/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| API | [`src/app/api/push-subscriptions/`](../../src/app/api/push-subscriptions) | Register/unregister. |
| Library | [`src/lib/push.ts`](../../src/lib/push.ts) | Sender. |
| DB | [`src/lib/db/push.ts`](../../src/lib/db/push.ts) | Storage. |

## 4. Data model
- `push_subscriptions`: user_id, endpoint/token, platform, ua.

## 5. API surface
| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| POST/DELETE | `/api/push-subscriptions` | user | Free | Register / revoke. |

## 6. UI surface
- Prompt to enable push during onboarding; toggle in settings.

## 7. Business logic
- Server fans out notifications from the same worker that writes the in-app notification.
- Quiet hours per user (if set).

## 8. External dependencies
- Web Push (VAPID), Apple/FCM via Capacitor.

## 9. Currency / FX / tax implications
- N/A.

## 10. i18n
- Titles/bodies localized.

## 11. Permissions / tier gating / rate limits
- Respect browser/OS permission; rate-limit per user.

## 12. Telemetry
- `push_sent_total{platform}`, `push_failed_total{reason}`.

## 13. Edge cases & gotchas
- Expired endpoints → revoke.
- Do Not Disturb windows.

## 14. Tests
- Integration mocked.

## 15. Related skills and rules
- [`engineer-mobile`](../../.cursor/skills/engineer-mobile/SKILL.md)
- Related specs: [notifications-inapp](notifications-inapp.md), [capacitor-mobile](capacitor-mobile.md).

## 16. Open questions / planned work
- Rich notifications (images, actions).
