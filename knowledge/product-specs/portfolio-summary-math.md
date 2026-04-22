# portfolio-summary-math

> The set of pure functions that produce the dashboard summary numbers.

## 1. Summary

Total value, total cost, unrealized P/L, realized P/L, daily change, weekly change, cash allocation, top holdings — all derived from `holdings`, `cash`, current quotes, and FX. Pure functions live in `src/lib/*` and are unit-tested.

## 2. Status

- **Tier:** Free
- **Feature flag:** _none_
- **Health:** green
- **Owning skill:** [`engineer-tools`](../../.cursor/skills/engineer-tools/SKILL.md)

## 3. Entry points

| Type | Path | Notes |
|------|------|-------|
| Library | `src/lib/portfolio-summary.ts` (or equivalent) | Summary functions. |
| Call sites | `Dashboard`, `PortfolioValueChart`, admin tooling. |

## 4. Data model

- Reads: `Holding[]`, `CashEntry[]`, `Quote[]`, `ExchangeRates`.

## 5. API surface

Not an API; pure library.

## 6. UI surface

- Dashboard summary header consumes these.

## 7. Business logic

- Full precision math, EUR base, display conversion at UI edge.
- Handles missing quotes gracefully (skip in daily-change aggregation).
- Counts dividends as realized gains in TTWROR/XIRR.

## 8. External dependencies

- None.

## 9. Currency / FX / tax implications

- Always EUR internally. Tax figures are cost-basis-driven.

## 10. i18n

Formatters handle locale-specific thousands/decimal separators.

## 11. Permissions / tier gating / rate limits

N/A.

## 12. Telemetry

N/A.

## 13. Edge cases & gotchas

- Zero-holding users return empty summary but not NaN.
- Negative cash (margin) subtracts from total value.

## 14. Tests

- Unit in `src/lib/*.test.ts`; table-driven cases.

## 15. Related skills and rules

- [`financial-calculations`](../../.cursor/skills/financial-calculations/SKILL.md)
- [`engineer-tools`](../../.cursor/skills/engineer-tools/SKILL.md)
- Related specs: [ttwror-xirr-performance](ttwror-xirr-performance.md).

## 16. Open questions / planned work

- Benchmark-adjusted alpha.
