# broker-mark-reconciliation

> Compare SnapTrade/broker last prices with trefolio market last and tell the user when they diverge.

## 1. Summary

After a broker sync, trefolio still values holdings with live market last (Yahoo). Interactive Brokers (via SnapTrade Flex) can report a different last — stale prints on illiquid ETFs, FX timing, or unadjusted marks. When a position’s broker mark and market mark differ by **≥ 5% and ≥ €100**, we persist the gap, show a Home banner, and send an in-app notification (max once per 24h per ticker set). Copy is informational, not advice.

## 2. Status

- **Tier:** Trefolio (broker sync / SnapTrade)
- **Feature flag:** _none_
- **Health:** green
- **Owning skill:** [`.cursor/skills/engineer-integrations/SKILL.md`](../../.cursor/skills/engineer-integrations/SKILL.md)

## 3. Entry points

| Type | Path | Notes |
|------|------|-------|
| Lib | [`src/lib/snaptrade-mark-reconciliation.ts`](../../src/lib/snaptrade-mark-reconciliation.ts) | Pure compare + fingerprint + notify cooldown. |
| Lib | [`src/lib/snaptrade-mark-gap-notify.ts`](../../src/lib/snaptrade-mark-gap-notify.ts) | Persist + in-app notification after sync. |
| Sync | [`src/lib/snaptrade-fetch.ts`](../../src/lib/snaptrade-fetch.ts) | Manual/OAuth fetch. |
| Cron | [`src/app/api/cron/snaptrade-sync/route.ts`](../../src/app/api/cron/snaptrade-sync/route.ts) | Hourly auto-sync. |
| Home | [`src/components/homepage/HomeBrokerMarkGapBanner.tsx`](../../src/components/homepage/HomeBrokerMarkGapBanner.tsx) | Dismissible status banner. |
| Bootstrap | [`src/lib/homepage/build-home-bootstrap.ts`](../../src/lib/homepage/build-home-bootstrap.ts) | `markGap` on sections payload. |

## 4. Data model

`snaptrade_connections` columns (migration 151):

- `mark_reconciliation_json` — last `MarkReconciliation` JSON, or `''` when no gaps
- `mark_reconciliation_at` — last compare time
- `mark_gap_notified_fingerprint` — sorted tickers last notified
- `mark_gap_notified_at` — last in-app notify time

SnapTrade `position.price` is captured on `ExtractedHolding.brokerPrice`. Market side uses Yahoo-enriched `holding.valueInEUR`.

## 5. API surface

No new route. Home reads the snapshot via existing `GET /api/home-v2/bootstrap?phase=sections` (`markGap` field).

## 6. UI surface

- In-app bell: `brokerMarkGapNotification` (`i18n:notifBrokerMarkGap*`)
- Home (simple and after sections load): amber status banner above the portfolio total card. Session-dismissible per fingerprint.
- Home compact total card: **Invested** vs **Liquid cash** under the combined total (not only in Advanced).

## 7. Business logic

Thresholds (`MARK_GAP_REL_THRESHOLD` = 5%, `MARK_GAP_ABS_EUR` = €100). Both must fire.

Notify when fingerprint (sorted tickers) is new **or** last notify ≥ 24h. Clearing gaps resets the fingerprint so a return of the same gap notifies again.

trefolio does **not** switch valuation to the broker last. Market last remains source of truth for displayed totals.

## 8. External dependencies

- SnapTrade holdings `price` + optional `total_value` (EUR NAV)
- Yahoo quotes / FX (same path as `upsertHoldingsFromPositions` enrichment)

## 9. Currency / FX / tax implications

Broker native `shares × brokerPrice` converted with `convertToEUR` / `EUR{CCY}` keys. Missing FX → skip that position (never treat foreign as EUR). Display uses the portfolio currency via `formatCurrency`.

## 10. i18n

Keys: `notifBrokerMarkGapTitle|Message|Cta`, `homeBrokerMarkGapTitle|Body|Extra`, `homeV2Invested`, `homeV2LiquidCash`. EN + ES authored; other locales inherit English until translated.

## 11. Permissions / tier gating / rate limits

SnapTrade users only (Trefolio broker sync). No extra rate limit. Notify cooldown 24h per fingerprint.

## 12. Telemetry

- `snaptrade_mark_gap_notified` — `{ tickers, count, delta_eur }`
- `snaptrade_mark_gap_detected` — gap present but cooldown skipped

## 13. Edge cases & gotchas

- Empty positions: clear stored JSON; do not wipe holdings (existing SnapTrade empty-snapshot guard).
- Same ticker, different security: unsuffixed ticker + non-US ISIN is quoted by ISIN (e.g. IBKR `BITC` / CoinShares `GB00BLD4ZL17` vs NYSE Bitwise). Do not treat that gap as a stale Flex mark.
- Demo / no SnapTrade connection: `markGap` null, no banner.
- Banner dismiss is session-scoped so a later fingerprint still shows.

## 14. Tests

- Unit: [`src/lib/snaptrade-mark-reconciliation.test.ts`](../../src/lib/snaptrade-mark-reconciliation.test.ts)
- Bootstrap mock includes `getSnapTradeMarkReconciliation`
- E2E: Home compact card exposes invested vs liquid (`e2e/home-v2.spec.ts`)

## 15. Related skills and rules

- [`engineer-integrations`](../../.cursor/skills/engineer-integrations/SKILL.md)
- [`engineer-homepage`](../../.cursor/skills/engineer-homepage/SKILL.md)
- [`financial-calculations`](../../.cursor/skills/financial-calculations/SKILL.md)
- [`legal-advisor`](../../.cursor/skills/legal-advisor/SKILL.md) — informational disclaimer on banner/notification
- Related specs: [snaptrade-import](snaptrade-import.md), [unified-homepage](unified-homepage.md), [notifications-inapp](notifications-inapp.md)

## 16. Open questions / planned work

- Optional: show broker NAV vs trefolio net worth as a second line when `total_value` is present.
- Optional: persist `broker_price` on `holdings` for live (between-sync) comparison.
