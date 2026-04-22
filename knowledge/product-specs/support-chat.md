# support-chat

> In-app user-to-support chat.

## 1. Summary
Users can reach admin support via the help bubble. Admins respond from the admin panel. Messages persist (no 24h TTL).

## 2. Status
- **Tier:** Free
- **Feature flag:** _none_
- **Health:** green
- **Owning skill:** [`engineer-chat`](../../.cursor/skills/engineer-chat/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| API | [`src/app/api/support-chat/`](../../src/app/api/support-chat) | User side. |
| Admin | [`src/app/api/admin/support-chat/`](../../src/app/api/admin/support-chat) | Admin side. |
| DB | [`src/lib/db/support-chat.ts`](../../src/lib/db/support-chat.ts) | Storage. |

## 4. Data model
- `support_chat_messages`: sender, receiver, content, created_at.

## 5. API surface
| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| GET/POST | `/api/support-chat` | user | Free | User messaging. |
| GET/POST | `/api/admin/support-chat` | admin | Admin | Admin messaging. |

## 6. UI surface
- Help bubble launcher; admin inbox with threads.

## 7. Business logic
- User sees unread badge; admin replies trigger notification.

## 8. External dependencies
- None.

## 9. Currency / FX / tax implications
- N/A.

## 10. i18n
- User side localized, admin side English.

## 11. Permissions / tier gating / rate limits
- Rate-limit send.

## 12. Telemetry
- `support_chat_messages_total`.

## 13. Edge cases & gotchas
- Do not leak PII in public telemetry.

## 14. Tests
- DB tests.

## 15. Related skills and rules
- [`engineer-chat`](../../.cursor/skills/engineer-chat/SKILL.md)
- Related specs: [private-chat](private-chat.md).

## 16. Open questions / planned work
- SLA dashboards for admin.
