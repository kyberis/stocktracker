# ibkr-flex

> IBKR Flex Query token-based import.

## 1. Summary
Users paste their Flex query token; we pull activity reports and reconcile into transactions.

## 2. Status
- **Tier:** Trefolio
- **Feature flag:** `BROKER_INTEGRATIONS`
- **Health:** B
- **Owning skill:** [`engineer-integrations`](../../.cursor/skills/engineer-integrations/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| API | [`src/app/api/ibkr-flex/`](../../src/app/api/ibkr-flex) | Token and sync. |
| DB | [`src/lib/db/ibkr-flex.ts`](../../src/lib/db/ibkr-flex.ts) | Token store (encrypted). |

## 4. Data model
- `ibkr_flex_tokens`: per-user encrypted token + last sync.

## 5. API surface
| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| POST | `/api/ibkr-flex/token` | user | Pro | Save token. |
| POST | `/api/ibkr-flex/sync` | user | Pro | Sync now. |

## 6. UI surface
- Token input with test-connection button.

## 7. Business logic
- XML reports parsed into the shared transaction schema.
- Idempotency via report-line IDs.

## 8. External dependencies
- IBKR Flex service.

## 9. Currency / FX / tax implications
- Captures trade and home currency + FX rate.

## 10. i18n
- All locales.

## 11. Permissions / tier gating / rate limits
- Pro-only; one token per user.

## 12. Telemetry
- `ibkr_flex_sync_total`.

## 13. Edge cases & gotchas
- Flex query has ≤7-day lag in some reports — communicate to user.

## 14. Tests
- XML fixture tests.

## 15. Related skills and rules
- [`engineer-integrations`](../../.cursor/skills/engineer-integrations/SKILL.md)
- Related specs: [import-hub](import-hub.md), [snaptrade-import](snaptrade-import.md).

## 16. Open questions / planned work
- Automatic daily sync.
