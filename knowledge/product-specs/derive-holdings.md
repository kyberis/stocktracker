# derive-holdings

> Pure function: a user's transactions + splits → current `holdings` rows.

## 1. Summary

`deriveHoldings()` is the canonical transformation from the ledger to positions. It handles buys, sells, dividends (cash), splits, and mergers. Output matches the `holdings` table shape exactly so we can upsert it.

## 2. Status

- **Tier:** system
- **Feature flag:** _none_
- **Health:** B (edge cases on partial sells + splits)
- **Owning skill:** [`engineer-data`](../../.cursor/skills/engineer-data/SKILL.md)

## 3. Entry points

| Type | Path | Notes |
|------|------|-------|
| Library | [`src/lib/derive-holdings.ts`](../../src/lib/derive-holdings.ts) | Pure function. |
| Call sites | `src/app/api/transactions/**`, `src/app/api/cron/refresh-holdings/` | Runs after writes. |

## 4. Data model

- Input: `Transaction[]`.
- Output: `Holding[]`.

## 5. API surface

Not an API; invoked by services after transaction writes or syncs.

## 6. UI surface

None directly.

## 7. Business logic

- FIFO cost-basis accounting by default.
- Splits adjust historical quantity and cost basis for the affected holding only.
- Dividends are recorded but do not affect share count (cash effect only).
- Currency conversion uses FX at transaction date.

## 8. External dependencies

- None (pure).

## 9. Currency / FX / tax implications

- All cost basis normalized to EUR.
- Native amounts preserved for display.

## 10. i18n

N/A.

## 11. Permissions / tier gating / rate limits

N/A (not called client-side).

## 12. Telemetry

- Errors logged; counters pushed on partial-sell edge cases.

## 13. Edge cases & gotchas

- Selling more than held raises an error — callers must handle.
- Partial sells: cost basis reduced proportionally.
- Currency-change events (ADR redenomination) require manual cleanup today.

## 14. Tests

- [`src/lib/derive-holdings.test.ts`](../../src/lib/derive-holdings.test.ts) — extensive table-driven tests.

## 15. Related skills and rules

- [`engineer-data`](../../.cursor/skills/engineer-data/SKILL.md)
- [`financial-calculations`](../../.cursor/skills/financial-calculations/SKILL.md)
- Related specs: [transactions](transactions.md), [holdings-crud](holdings-crud.md).

## 16. Open questions / planned work

- HIFO/LIFO options.
- Automatic split detection from Yahoo actions feed.
