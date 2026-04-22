# chat-portfolio-share

> Share portfolio snapshots inside chat.

## 1. Summary
A chat card that captures a portfolio summary (value, top holdings, 1M change) at the moment of send. Receiver sees a rich card, not a live view.

## 2. Status
- **Tier:** Bifolio+
- **Feature flag:** `SOCIAL_CHAT`
- **Health:** green
- **Owning skill:** [`engineer-chat`](../../.cursor/skills/engineer-chat/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| Library | `src/lib/chat-portfolio-cards.ts` (if present) | Snapshot composer. |

## 4. Data model
- Embedded in `chat_messages` payload.

## 5. API surface
- Via `POST /api/chat/messages`.

## 6. UI surface
- Card with avatar, value, chart sparkline.

## 7. Business logic
- Anonymize holdings if sender chose to.

## 8. External dependencies
- Quote/FX.

## 9. Currency / FX / tax implications
- Card values in sender's preferred currency; viewer sees same.

## 10. i18n
- All locales.

## 11. Permissions / tier gating / rate limits
- As chat.

## 12. Telemetry
- `chat_portfolio_shares_total`.

## 13. Edge cases & gotchas
- Expired message → card becomes a placeholder.

## 14. Tests
- Snapshot.

## 15. Related skills and rules
- [`engineer-chat`](../../.cursor/skills/engineer-chat/SKILL.md)
- Related specs: [private-chat](private-chat.md).

## 16. Open questions / planned work
- Shareable link previews for external clients.
