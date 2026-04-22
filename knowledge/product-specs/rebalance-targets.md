# rebalance-targets

> Set target allocations and compute trades to reach them.

## 1. Summary
Users define percentages per holding or category; tool outputs the buy/sell amounts to reach target weights, given current value and a cash budget.

## 2. Status
- **Tier:** Bifolio+
- **Feature flag:** _none_
- **Health:** green
- **Owning skill:** [`engineer-tools`](../../.cursor/skills/engineer-tools/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| Page | [`src/app/(app)/tools/rebalance/`](../../src/app/(app)/tools/rebalance) | Page. |
| API | [`src/app/api/rebalance-targets/`](../../src/app/api/rebalance-targets) | CRUD + compute. |
| DB | [`src/lib/db/rebalance.ts`](../../src/lib/db/rebalance.ts) | Storage. |

## 4. Data model
- `rebalance_targets`: user_id, portfolio_id, entries (ticker/pct).

## 5. API surface
| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| GET/POST/PATCH | `/api/rebalance-targets` | user | Bifolio+ | CRUD targets. |
| POST | `/api/rebalance-targets/compute` | user | Bifolio+ | Output trades. |

## 6. UI surface
- Target editor with pie preview + suggested trades table.

## 7. Business logic
- Integer-friendly rounding (whole shares when requested).
- Uses current quotes + FX.

## 8. External dependencies
- Quote provider.

## 9. Currency / FX / tax implications
- Target pcts on EUR basis; trade suggestions include FX cost caveat.

## 10. i18n
- All locales.

## 11. Permissions / tier gating / rate limits
- `requireSubscriptionFeature('simulator')` or similar.

## 12. Telemetry
- `rebalance_computed_total`.

## 13. Edge cases & gotchas
- Percentages must sum to 100 ± tolerance.

## 14. Tests
- Unit on allocation math.

## 15. Related skills and rules
- [`engineer-tools`](../../.cursor/skills/engineer-tools/SKILL.md)
- Related specs: [strategies](strategies.md).

## 16. Open questions / planned work
- Tax-aware rebalancing that prefers losses.
