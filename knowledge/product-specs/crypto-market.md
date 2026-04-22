# crypto-market

> Crypto market movers + discovery, backed by CoinLore.

## 1. Summary
The data layer behind the crypto page's movers + the AddCryptoModal search.

## 2. Status
- **Tier:** Free (read); Pro for movers.
- **Feature flag:** _none_
- **Health:** C
- **Owning skill:** [`engineer-data`](../../.cursor/skills/engineer-data/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| API | [`src/app/api/crypto/`](../../src/app/api/crypto) | Endpoints. |
| Library | [`src/lib/api-providers/coinlore.ts`](../../src/lib/api-providers/coinlore.ts) | Client. |

## 4. Data model
- No storage; SWR-cached responses.

## 5. API surface
| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| GET | `/api/crypto/search?q=` | user | Free | Symbol search. |
| GET | `/api/crypto/movers` | user | Pro | Top gainers/losers. |

## 6. UI surface
- `AddCryptoModal` and `crypto-page`.

## 7. Business logic
- Symbol → CoinLore `id` map; case-insensitive search.

## 8. External dependencies
- CoinLore.

## 9. Currency / FX / tax implications
- Quotes in USD; converted to EUR/pref on render.

## 10. i18n
- Labels only.

## 11. Permissions / tier gating / rate limits
- 60/hour/user.

## 12. Telemetry
- `analytics_events`: `crypto.search`.

## 13. Edge cases & gotchas
- CoinLore rate limits: respond with cached snapshot.

## 14. Tests
- [`src/lib/api-providers/coinlore.test.ts`](../../src/lib/api-providers/coinlore.test.ts)

## 15. Related skills and rules
- [`engineer-data`](../../.cursor/skills/engineer-data/SKILL.md)
- Related specs: [crypto-page](crypto-page.md), [add-crypto-modal](add-crypto-modal.md).

## 16. Open questions / planned work
- Backup provider (CoinGecko) behind a feature flag.
