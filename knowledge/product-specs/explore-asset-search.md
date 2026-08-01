# explore-asset-search

> Asset search used across Add-stock and explore surfaces.

## 1. Summary
Debounced search against Yahoo (EQUITY, ETF, **MUTUALFUND**) + ISIN + FIGI; returns a normalized list of candidates.

## 2. Status
- **Tier:** Free
- **Feature flag:** _none_
- **Health:** green
- **Owning skill:** [`engineer-integrations`](../../.cursor/skills/engineer-integrations/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| API | [`src/app/api/search/`](../../src/app/api/search) | Search endpoint. |
| Component | [`src/components/ExploreAssetSearch.tsx`](../../src/components/ExploreAssetSearch.tsx) | UI. |
| Library | [`src/lib/api-providers/isin-resolver.ts`](../../src/lib/api-providers/isin-resolver.ts), [`openfigi.ts`](../../src/lib/api-providers/openfigi.ts) | Resolution. |

## 4. Data model
- No storage; response cached per query.

## 5. API surface
| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| GET | `/api/search?q=` | user | Free | Returns candidate list. |

## 6. UI surface
- Autocomplete dropdown with exchange badges.

## 7. Business logic
- ISIN-matching prioritized for European tickers.
- Falls back to Yahoo name search.

## 8. External dependencies
- Yahoo, OpenFIGI.

## 9. Currency / FX / tax implications
- Shows native currency on results.

## 10. i18n
- All locales.

## 11. Permissions / tier gating / rate limits
- 120/hour/user.

## 12. Telemetry
- `search_requests_total`.

## 13. Edge cases & gotchas
- Empty query returns nothing.

## 14. Tests
- Unit on the resolvers.

## 15. Related skills and rules
- [`engineer-integrations`](../../.cursor/skills/engineer-integrations/SKILL.md)
- Related specs: [global-search](global-search.md).

## 16. Open questions / planned work
- Per-user search history.
