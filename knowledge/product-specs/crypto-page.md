# crypto-page

> `/crypto` — crypto-focused page (market + portfolio).

## 1. Summary
Standalone page that lists crypto market movers and the user's crypto holdings. Under Trefolio for full access; Free tier sees a limited discovery view.

## 2. Status
- **Tier:** Free (limited); Trefolio (full).
- **Feature flag:** _none_
- **Health:** C
- **Owning skill:** [`engineer-data`](../../.cursor/skills/engineer-data/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| Page | [`src/app/(app)/crypto/`](../../src/app/(app)/crypto) | Page. |
| API | [`src/app/api/crypto/`](../../src/app/api/crypto) | Market + movers. |

## 4. Data model
- Crypto holdings live in `holdings` with `asset_type = 'crypto'`.

## 5. API surface
| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| GET | `/api/crypto/quote` | user | Free | Quote via CoinLore. |
| GET | `/api/crypto/movers` | user | Pro | Top gainers/losers. |

## 6. UI surface
- Market overview cards + user's holdings list.

## 7. Business logic
- Quote caching per-minute.

## 8. External dependencies
- CoinLore.

## 9. Currency / FX / tax implications
- Stablecoins fixed at par; USD-base crypto quotes converted to EUR on render.

## 10. i18n
- All locales.

## 11. Permissions / tier gating / rate limits
- `crypto-pro` for movers.

## 12. Telemetry
- `analytics_events`: `crypto.page.viewed`.

## 13. Edge cases & gotchas
- Missing CoinLore symbol → graceful null row.

## 14. Tests
- Provider tests.

## 15. Related skills and rules
- [`engineer-data`](../../.cursor/skills/engineer-data/SKILL.md)
- Related specs: [add-crypto-modal](add-crypto-modal.md), [crypto-market](crypto-market.md), [crypto-portfolio-tab](crypto-portfolio-tab.md).

## 16. Open questions / planned work
- Exchange-specific order book view (later).
