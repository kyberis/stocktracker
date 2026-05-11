# warren-screener

> Value-style list: low P/E, capped market size, with moat evaluation columns.

## 1. Summary
Dedicated `/tools/warren-screener` tool that reuses the Moat Screener UI with presets (positive P/E &lt; 15, market cap ≤ ~5B in screener-feed units) and a higher page size (`limit` 100). Rows always come from `moat_cache` joined to `screener_cache` for price and `market_cap`.

## 2. Status
- **Tier:** Trefolio (Pro badge on catalog)
- **Feature flag:** _none_
- **Health:** B
- **Owning skill:** [`engineer-integrations`](../../.cursor/skills/engineer-integrations/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|------|
| Page | [`src/app/(app)/tools/warren-screener/page.tsx`](../../src/app/(app)/tools/warren-screener/page.tsx) | `ToolsPageGate initialTab="warren"`. |
| UI | [`src/components/WarrenScreener.tsx`](../../src/components/WarrenScreener.tsx) → [`MoatScreener`](../../src/components/MoatScreener.tsx) `variant="warren"`. |
| API | [`src/app/api/moat-screener/route.ts`](../../src/app/api/moat-screener/route.ts) | `marketCapMin` / `marketCapMax` query params. |
| DB | [`src/lib/db/moat-cache.ts`](../../src/lib/db/moat-cache.ts) | `queryMoatCache` filters on `sc.market_cap`. |

## 4. Data model
- `moat_cache` (evaluation rows) `LEFT JOIN screener_cache` for `regular_market_price`, `currency`, `market_cap`.

## 5. API surface
| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| GET | `/api/moat-screener` | user | session | Same as moat screener; supports `marketCapMin`, `marketCapMax`, `limit` (max 100). |

## 6. UI surface
- Full-screen tool from `/tools` hub; reuses moat screener table, sort chips, save-to-library.

## 7. Business logic
- Market cap filters require `sc.market_cap IS NOT NULL` and compare raw values from the screener sync (not EUR-normalized).
- Warren preset uses positive P/E floor (`peMin` 0.01), `peMax` 15, `marketCapMax` 5e9, `limit` 100.
- Universe size is limited to symbols that already have moat evaluations populated (see moat sync / screener universe).

## 8. External dependencies
- Screener cache sync for `market_cap` and quote fields.

## 9. Currency / FX / tax implications
- Market cap is not converted to EUR in filters or display suffix (compact number only).

## 10. i18n
- Keys: `warrenScreener*`, `moatScreenerMarketCap*`; parity locales inherit from `en` where applicable.

## 11. Permissions / tier gating / rate limits
- Catalog `tierBadge: pro`; same session gate as `/api/moat-screener`.

## 12. Telemetry
- None specific (inherits moat-screener metrics if instrumented).

## 13. Edge cases & gotchas
- Symbols in `moat_cache` without `screener_cache.market_cap` drop out when cap filters apply.
- Negative or missing P/E: preset `peMin` reduces junk matches but does not guarantee fundamentals quality.

## 14. Tests
- `src/lib/db/moat-cache.test.ts` (market cap predicates).

## 15. Related skills and rules
- [`engineer-integrations`](../../.cursor/skills/engineer-integrations/SKILL.md)
- Related specs: [moat-reports](moat-reports.md), [stock-screener](stock-screener.md), [moat-screener](moat-screener.md).

## 16. Open questions / planned work
- Optional EUR-normalized cap filter if product demands cross-region comparability.
