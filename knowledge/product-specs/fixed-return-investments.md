# fixed-return-investments

> Custom fixed-return positions (e.g. Civislend) with linear accrual into portfolio totals.

## 1. Summary

Users record principal, start date, term (months), and total return %. trefolio projects value linearly from principal to `principal × (1 + r)` until maturity, then locks. Hybrid placement: included in investment cash totals and chart overlays without Yahoo quotes.

## 2. Status

- **Tier:** Free (counts toward `SOFT_CAPS.manualAssets`; not gated by net-worth Bifolio entitlement)
- **Feature flag:** _none_
- **Health:** green
- **Owning skill:** [`engineer-data`](../../.cursor/skills/engineer-data/SKILL.md)

## 3. Entry points

| Type | Path | Notes |
|------|------|-------|
| Modal | [`src/components/AddManualAssetModal.tsx`](../../src/components/AddManualAssetModal.tsx) | Type tile “Fixed return”. |
| List | [`src/components/MarketAndCash.tsx`](../../src/components/MarketAndCash.tsx) | Progress / matured badge. |
| API | [`src/app/api/cash/route.ts`](../../src/app/api/cash/route.ts) | Create/update via cash endpoints. |

## 4. Data model

Stored as `cash_entries` with `type = 'fixed_return'`:

- `display_amount` — principal (native currency)
- `display_currency`
- `amount_eur` — accrued value (recomputed on read/write)
- `start_date`, `term_months`, `total_return_pct` (migration v123)
- `CashEntry` fields in [`src/lib/types.ts`](../../src/lib/types.ts)

## 5. API surface

| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| POST | `/api/cash` | user | Free + soft cap | Create; `type=fixed_return` requires schedule fields |
| PUT | `/api/cash` | user | Free | Update schedule / name |
| GET | `/api/cash` | user | Free | List; accrued `amountEUR` enriched |

Zod: `createCashSchema` / `updateCashSchema` in [`src/lib/schemas.ts`](../../src/lib/schemas.ts).

## 6. UI surface

- Add modal with live preview (maturity date/value, accrued today, implied annualized %).
- Assets & Accounts group with progress % and maturity date.
- Portfolio evolution chart overlays deterministic value-at-date.

## 7. Business logic

- Pure valuation: [`src/lib/fixed-return.ts`](../../src/lib/fixed-return.ts)
- Cash enrich helpers: [`src/lib/fixed-return-cash.ts`](../../src/lib/fixed-return-cash.ts)
- Included in [`investmentCashEntries`](../../src/lib/portfolio-summary-cash.ts) for portfolio totals / charts
- **Not** in [`liquidCashEntries`](../../src/lib/portfolio-summary-cash.ts) — hero “Cash available for investment” is liquid cash only; fixed-return counts toward **Invested assets**
- Portfolio P/L: cost = principal, current = accrued, day change = daily accrual delta ([`portfolio-summary.ts`](../../src/lib/portfolio-summary.ts))

Formula (linear):

```
maturityValue = principal × (1 + totalReturnPct/100)
progress = clamp((asOf − start) / (maturity − start), 0, 1)
value = principal + (maturityValue − principal) × progress
```

Before start → 0; on/after maturity → maturityValue.

## 8. External dependencies

- None (no market data providers).

## 9. Currency / FX / tax implications

- Principal stored in display currency; EUR accrual uses native amount when currency is EUR (non-EUR without rates mirrors native, same as other manual assets).
- Not tax-engine aware in v1.

## 10. i18n

- Keys in `en.ts` / `es.ts` (`assetTypeFixedReturn`, `fixedReturn*`).

## 11. Permissions / tier gating / rate limits

- Soft cap via `getManualAssetCount` / `getManualAssetLimit`.
- Does **not** require Bifolio `net-worth` feature (unlike savings/pension/real estate).

## 12. Telemetry

- Reuses existing cash/manual asset events where present; no new events required for MVP.

## 13. Edge cases & gotchas

- Leap years: progress is day-based between start and maturity.
- Editing accrued amount in the cash quick-edit UI does not change the schedule; prefer delete/re-add or PUT with schedule fields.
- Chart overlay is client-side; snapshot cron remains holdings-only.
- Accrual “as of” must use the **browser local calendar date** (`todayLocal()`), not the Vercel UTC date — otherwise a start date of “today” can show €0 until UTC midnight. Client context + portfolio totals re-enrich on read.
- Home v2 must render `MarketAndCash` (Assets & Accounts); the holdings table alone never lists fixed-return rows.
- Breakdown strip (`MarketAwareBreakdown`): fixed-return is its own filterable card and is included in **All Assets** value/allocation (not liquid cash).

## 14. Tests

- [`src/lib/fixed-return.test.ts`](../../src/lib/fixed-return.test.ts)
- Schema + `investmentCashEntries` + portfolio totals coverage

## 15. Related skills and rules

- [`engineer-data`](../../.cursor/skills/engineer-data/SKILL.md)
- [`financial-calculations`](../../.cursor/skills/financial-calculations/SKILL.md)
- Related: [manual-assets](manual-assets.md), [cash-balances](cash-balances.md), [portfolio-summary-math](portfolio-summary-math.md)

## 16. Open questions / planned work

- Compound accrual option
- Early withdrawal / partial redemption
- Persist fixed_return bucket in snapshot cron
