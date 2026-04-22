# crypto-portfolio-tab

> Crypto-only view of holdings and cash.

## 1. Summary
Filters the portfolio to crypto holdings, adds 24h / 7d / 30d change columns from CoinLore.

## 2. Status
- **Tier:** Bifolio+ (via `crypto-portfolio` feature).
- **Feature flag:** _none_
- **Health:** C (symbol mapping fragile)
- **Owning skill:** [`engineer-data`](../../.cursor/skills/engineer-data/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| Component | [`src/components/CryptoPortfolioTab.tsx`](../../src/components/CryptoPortfolioTab.tsx) | UI. |

## 4. Data model
- Holdings with `asset_type = 'crypto'`.

## 5. API surface
- Uses `/api/crypto/quote` and `/api/holdings`.

## 6. UI surface
- Table with sparkline + momentum indicators.

## 7. Business logic
- Symbol-to-CoinLore id mapping via static map (see provider).

## 8. External dependencies
- CoinLore.

## 9. Currency / FX / tax implications
- Stablecoins fixed at par.

## 10. i18n
- All locales.

## 11. Permissions / tier gating / rate limits
- Gated by `requireSubscriptionFeature('crypto-portfolio')`.

## 12. Telemetry
- `analytics_events`: `crypto.tab.viewed`.

## 13. Edge cases & gotchas
- Unknown tickers fall back to "N/A" rather than failing.

## 14. Tests
- [`src/lib/api-providers/coinlore.test.ts`](../../src/lib/api-providers/coinlore.test.ts)

## 15. Related skills and rules
- [`engineer-data`](../../.cursor/skills/engineer-data/SKILL.md)
- Related specs: [crypto-page](crypto-page.md), [crypto-market](crypto-market.md).

## 16. Open questions / planned work
- Expand symbol map with admin UI.
