# add-crypto-modal

> Modal to search crypto and add a holding.

## 1. Summary
Search → select → specify quantity + purchase price → add a `holding` with `asset_type = 'crypto'`.

## 2. Status
- **Tier:** Free
- **Feature flag:** _none_
- **Health:** green
- **Owning skill:** [`engineer-data`](../../.cursor/skills/engineer-data/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| Component | [`src/components/AddCryptoModal.tsx`](../../src/components/AddCryptoModal.tsx) | UI. |

## 4. Data model
- Writes `holdings` + optional `transactions`.

## 5. API surface
- Uses `/api/crypto/search` + `/api/holdings`.

## 6. UI surface
- Modal with debounced search.

## 7. Business logic
- Quantity validated > 0.
- Price defaults to current quote.

## 8. External dependencies
- CoinLore.

## 9. Currency / FX / tax implications
- Purchase price converted to EUR at transaction time.

## 10. i18n
- All locales.

## 11. Permissions / tier gating / rate limits
- Holdings cap for Bifolio.

## 12. Telemetry
- `analytics_events`: `crypto.added`.

## 13. Edge cases & gotchas
- Duplicate add merges into existing crypto holding.

## 14. Tests
- E2E flow.

## 15. Related skills and rules
- [`engineer-data`](../../.cursor/skills/engineer-data/SKILL.md)
- Related specs: [crypto-page](crypto-page.md).

## 16. Open questions / planned work
- Quick-add from market movers list.
