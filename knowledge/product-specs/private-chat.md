# private-chat

> 1:1 private chat between connected users with 24h TTL.

## 1. Summary
Short-lived direct messages: typing indicators, presence, read receipts, portfolio share cards. Messages expire after 24h.

## 2. Status
- **Tier:** Bifolio+
- **Feature flag:** `SOCIAL_CHAT`
- **Health:** B
- **Owning skill:** [`engineer-chat`](../../.cursor/skills/engineer-chat/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| Page | `src/app/(app)/chat/page.tsx` | UI. |
| API | [`src/app/api/chat/`](../../src/app/api/chat) | Messaging + presence. |
| DB | [`src/lib/db/chat-messages.ts`](../../src/lib/db/chat-messages.ts), [`chat-presence.ts`](../../src/lib/db/chat-presence.ts), [`chat-rooms.ts`](../../src/lib/db/chat-rooms.ts) | Storage. |

## 4. Data model
- `chat_rooms`, `chat_messages` (TTL 24h), `chat_presence`.

## 5. API surface
| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| GET/POST | `/api/chat/rooms` | user | Pro | List/open rooms. |
| GET/POST | `/api/chat/messages` | user | Pro | Polled fetch + send. |
| POST | `/api/chat/presence` | user | Pro | Heartbeat + typing. |

## 6. UI surface
- Room list, message pane, typing indicator, share portfolio card button.

## 7. Business logic
- Polling ~3s in foreground, back-off in background.
- Read receipts on view.
- Portfolio cards snapshot values at share time (not live).

## 8. External dependencies
- None (polling-based, no realtime infra).

## 9. Currency / FX / tax implications
- Cards respect viewer currency.

## 10. i18n
- All locales.

## 11. Permissions / tier gating / rate limits
- Must be connected; per-room message rate-limit.

## 12. Telemetry
- `chat_messages_sent_total`, `chat_presence_heartbeats_total`.

## 13. Edge cases & gotchas
- Blocked users cannot send or see presence.

## 14. Tests
- DB tests.

## 15. Related skills and rules
- [`engineer-chat`](../../.cursor/skills/engineer-chat/SKILL.md)
- Related specs: [connections](connections.md), [chat-portfolio-share](chat-portfolio-share.md).

## 16. Open questions / planned work
- WebSockets for realtime.
