# notifications-inapp

> In-app notification center.

## 1. Summary
Bell icon top-right opens a drawer with notification list (unread, read, archived). Produced by alerts, chat, social, and system events.

## 2. Status
- **Tier:** Free
- **Feature flag:** _none_
- **Health:** green
- **Owning skill:** [`engineer-data`](../../.cursor/skills/engineer-data/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| API | [`src/app/api/notifications/`](../../src/app/api/notifications) | CRUD + unread counts. |
| DB | [`src/lib/db/notifications.ts`](../../src/lib/db/notifications.ts) | Storage. |

## 4. Data model
- `notifications`: user_id, kind, payload, state, created_at.

## 5. API surface
| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| GET | `/api/notifications` | user | Free | List. |
| PATCH | `/api/notifications` | user | Free | Mark read/archived. |

## 6. UI surface
- Bell icon with unread badge; drawer with kind icons.

## 7. Business logic
- Batched unread counts (60s polling) to avoid thundering herd.
- Price alerts always create an in-app row on fire (`type: alert`), regardless of email/push/Telegram/device preferences.
- Other system events (welcome, upgrade, social, broker sync) already write via `createNotification`.

## 8. External dependencies
- None.

## 9. Currency / FX / tax implications
- N/A.

## 10. i18n
- Templates localized.

## 11. Permissions / tier gating / rate limits
- Poll rate limited.

## 12. Telemetry
- `notifications_delivered_total{kind}`.

## 13. Edge cases & gotchas
- Large backlog — keep UI paginated.

## 14. Tests
- DB tests.

## 15. Related skills and rules
- [`engineer-data`](../../.cursor/skills/engineer-data/SKILL.md)
- Related specs: [alerts](alerts.md), [push-notifications](push-notifications.md), [email-system](email-system.md).

## 16. Open questions / planned work
- Preference matrix for optional channels by kind (in-app remains always-on).
