# eur-base-fx

> EUR as the internal base currency.

## Why
Portfolio math (performance, net worth, aggregations) is deterministic only in one base. EUR was chosen because:
- Our primary market is the EU.
- Most FX providers quote pairs against EUR consistently (via `exchange_rates`).

## Where it applies
- Portfolio snapshots' `total_eur` fields.
- Net-worth aggregation.
- TTWROR / XIRR computation.
- Benchmark comparison on the chart.

## Where it does NOT apply
- Display: user's `preferredCurrency` governs what's shown.
- Per-transaction storage: we keep the native currency + FX rate at date.
- Tax reports: country-specific rules convert at their own reference rates.

## How conversion works
`amountPreferred = amountEUR * eurTo(preferredCurrency, date)`.
The rate lookup is date-keyed; the most recent non-null value is used with a configurable staleness tolerance.

## GBX quirk
London-quoted pences (GBX). Normalize to GBP by dividing by 100 **once**, at the parser boundary. No downstream code should ever see GBX.

## Related
- [quotes-provider-abstraction](../product-specs/quotes-provider-abstraction.md)
- [exchange-rates](../product-specs/exchange-rates.md)
- [financial-calculations skill](../../.cursor/skills/financial-calculations/SKILL.md)
