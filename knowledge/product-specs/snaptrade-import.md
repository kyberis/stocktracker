# snaptrade-import

> OAuth-based import via SnapTrade.

## 1. Summary
Users connect their broker through SnapTrade; we fetch positions and transactions on demand and periodically.

## 2. Status
- **Tier:** Trefolio (broker integrations).
- **Feature flag:** `import_broker_picker_enabled` (broker grid + slug deep-link; default off). SnapTrade connect itself is unchanged when the flag is off.
- **Health:** B
- **Owning skill:** [`engineer-integrations`](../../.cursor/skills/engineer-integrations/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| API | [`src/app/api/snaptrade/`](../../src/app/api/snaptrade) | Connect, sync, disconnect. |
| Library | [`src/lib/snaptrade.ts`](../../src/lib/snaptrade.ts) | Client. |
| DB | [`src/lib/db/snaptrade.ts`](../../src/lib/db/snaptrade.ts) | Connection store. |

## 4. Data model
- `snaptrade_connections`: per user, per brokerage.
- Activities staged then reconciled into `transactions`.

## 5. API surface
| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| POST | `/api/snaptrade/connect` | user | Pro | Create login URL. |
| POST | `/api/snaptrade/sync` | user | Pro | Force sync. |
| DELETE | `/api/snaptrade/disconnect` | user | Pro | Remove connection. |

## 6. UI surface
- OAuth flow + "Connected" status cards.
- When `import_broker_picker_enabled`: searchable grid of SnapTrade brokerages (logos + `broker` deep-link). Trade Republic is CSV-only — see [trade-republic-import](trade-republic-import.md).

## 7. Business logic
- Idempotency keys on synced transactions to prevent duplication.
- Currency/FX preserved from provider.
- After positions upsert, compare SnapTrade `price` vs Yahoo `valueInEUR` and notify on material gaps — [broker-mark-reconciliation](broker-mark-reconciliation.md).

## 8. External dependencies
- SnapTrade API (server secret in env).

## 9. Currency / FX / tax implications
- Activities carry trade currency; FX backfilled.

## 10. i18n
- All locales.

## 11. Permissions / tier gating / rate limits
- Pro only. SnapTrade user provisioning per tier.

## 12. Telemetry
- `snaptrade_sync_total`, `snaptrade_errors_total`.
- `snaptrade_mark_gap_notified`, `snaptrade_mark_gap_detected`.

## 13. Edge cases & gotchas
- Expired connection → prompt user to re-auth.
- Broker-side corporate actions not always reflected.
- Ticker namesakes: an unsuffixed ticker plus a non-US ISIN is quoted by ISIN (Yahoo would otherwise treat the bare ticker as US). Known fallback when ISIN is missing: SnapTrade `BITC` + CoinShares name maps to `BITC.DE` / `GB00BLD4ZL17` (not NYSE Bitwise `BITC`).

## 14. Tests
- Integration with mocked client.

## 15. Related skills and rules
- [`engineer-integrations`](../../.cursor/skills/engineer-integrations/SKILL.md)
- Related specs: [import-hub](import-hub.md), [ibkr-flex](ibkr-flex.md), [broker-integration-requests](broker-integration-requests.md).

## 16. Open questions / planned work
- Real-time position updates via webhooks.
