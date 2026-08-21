# holdings-explorer

> Sort and inspect your own holdings by valuation, dividends, sector, and size — with forward P/E on stocks and ETFs.

## 1. Summary

Trefolio users open `/tools/holdings-explorer` to list **their** positions (not the market universe) ranked by P/E, weight, dividend yield, sector + market cap, and other research criteria. Live quotes drive value and return; `screener_cache` plus a capped Yahoo overview fill supplies ratios. Informational only — not investment advice.

## 2. Status

- **Tier:** Trefolio (quota: `screener`; Free keeps a small monthly cap)
- **Feature flag:** _none_
- **Health:** green
- **Owning skill:** [`.cursor/skills/engineer-dashboard/SKILL.md`](../../.cursor/skills/engineer-dashboard/SKILL.md)

## 3. Entry points

| Type | Path | Notes |
|------|------|-------|
| Page | [`src/app/(app)/tools/holdings-explorer/page.tsx`](../../src/app/(app)/tools/holdings-explorer/page.tsx) | Nested tools route |
| API | [`src/app/api/holdings-research/route.ts`](../../src/app/api/holdings-research/route.ts) | Fundamentals join |
| Modal/Component | [`src/components/HoldingsExplorer.tsx`](../../src/components/HoldingsExplorer.tsx) | Table + presets |
| Registry | [`src/lib/tools-registry.ts`](../../src/lib/tools-registry.ts) | Hub card, Pro badge |

## 4. Data model

No new tables. Reads:

- `holdings` — user positions (`Holding` in [`src/lib/types.ts`](../../src/lib/types.ts))
- `screener_cache` — PE, forward PE, yield, beta, 52w, sector, market cap (`ScreenerCacheRow`)
- Live `QuoteData` on the client for price, day change, market cap fallback

`HoldingsResearchFundamentals` lives in [`src/lib/holdings-research.ts`](../../src/lib/holdings-research.ts).

## 5. API surface

| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| GET | `/api/holdings-research` | user | quota `screener` | Fundamentals keyed by holding id |

Query: `portfolioId` (optional). Response: `{ rows, metricsPartial, staleAt }`. Zod not used (GET, no body). Overview miss-fill capped at 8 tickers per request.

## 6. UI surface

- Page: `/tools/holdings-explorer`
- Component: `HoldingsExplorer`
- Context: `PortfolioProvider` (quotes, FX, holdings), `StockDetailDrawer` on row click
- Hub: Tools → Analysis, Pro badge

## 7. Business logic

- Cache hit by Yahoo symbol (`marketDataSymbolForHolding` + ticker).
- Cache miss on stock/ETF: Yahoo `getOverview`, max 8 parallel.
- Client computes EUR value, weight %, return, estimated dividend income (`yield × value`).
- Sort nulls last. Non-positive trailing P/E ignored for “cheap P/E”.
- Crypto / funds: ratios shown as em dash; still sortable by name, value, day change.

## 8. External dependencies

- Yahoo Finance via existing `YahooProvider.getOverview` (miss fill only).
- No new env vars. Counts toward `screener` quota (same Yahoo overview class as the market screener).

## 9. Currency / FX / tax implications

- Storage remains EUR. Display uses quotes + `convertToEUR` then `defaultCurrency`.
- Dividend income is estimated from trailing yield × position value in EUR — not a tax lot or cash forecast.
- Market cap stays in provider units (typically USD), same as the stock screener.

## 10. i18n

- Keys in [`src/locales/en.ts`](../../src/locales/en.ts) and [`src/locales/es.ts`](../../src/locales/es.ts). Other locales fall back to English.

## 11. Permissions / tier gating / rate limits

- `requireFeatureQuota(req, "screener")` — admins bypass.
- Hub card `tierBadge: "pro"`.

## 12. Telemetry

- Server: `holdings_explorer_open` (`analytics_events`)
- Client (gtag): `holdings_explorer_sort` with `sort_by`

## 13. Edge cases & gotchas

- Empty portfolio: CTA toward import.
- Tickers outside the ~600-name `screener_cache` may show `metricsPartial`.
- Demo `/demo` does not embed this tool.
- Stealth mode masks monetary columns.

## 14. Tests

- Unit: [`src/lib/holdings-research.test.ts`](../../src/lib/holdings-research.test.ts), [`src/lib/db/screener-by-symbols.test.ts`](../../src/lib/db/screener-by-symbols.test.ts), API route test.
- E2E: [`e2e/holdings-explorer.spec.ts`](../../e2e/holdings-explorer.spec.ts)

## 15. Related skills and rules

- Skills: `.cursor/skills/engineer-dashboard/SKILL.md`, `.cursor/skills/engineer-tools/SKILL.md`, `.cursor/skills/legal-advisor/SKILL.md`
- Rules: `.cursor/rules/release-notes.mdc`, `.cursor/rules/legal-compliance.mdc`
- Related specs: [stock-screener](stock-screener.md), [holdings-crud](holdings-crud.md), [tools-index](tools-index.md), [fundamentals](fundamentals.md)

## 16. Open questions / planned work

- Dedicated `holdings_research` quota (today shares `screener`).
- P/B, EV/EBITDA, FCF yield when overview is extended.
- ETF look-through columns (already in stock drawer via `/api/etf-holdings`).
