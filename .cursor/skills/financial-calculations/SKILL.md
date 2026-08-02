---
name: financial-calculations
description: Enforces accurate financial calculations across the StockTracker codebase — dividends (DPS, yield, payout ratio, estimated income), taxes (withholding tax, cost basis), exchange rates (EUR-base conversion, GBX handling), performance metrics (TTWROR, XIRR), and currency display rules. Use when working on dividend display, yield calculations, tax handling, exchange rate conversion, portfolio summaries, cost basis logic, performance metrics, or any component that renders monetary values.
---

# Financial Calculations

## Anti-Hallucination Rules — Read First

These rules are mandatory before writing or modifying any calculation code:

1. **Never compute from memory.** Do not write a formula from recall. Always read the source file listed in Core References that owns the logic before touching it.
2. **Never assume a function signature.** Before calling `calculateTTWROR`, `calculateXIRR`, `convertToEUR`, or any lib function, read the actual function in its source file to confirm the current parameter order and return type.
3. **Never assume a field name.** Before reading `tx.taxes`, `tx.exchangeRateEur`, `quote.trailingAnnualDividendRate`, or any data field, read the schema in `src/lib/types.ts` or `src/lib/schemas.ts` to confirm the field exists and is spelled correctly.
4. **Never assume a rate key format.** Always use `rates["EUR${currency}"]`. If you are uncertain, read `src/app/api/exchange-rates/route.ts` to confirm the key shape.
5. **Verify before displaying.** Before rendering a monetary value, trace the full path: raw value → currency conversion → formatting function. Each step must be confirmed from source, not assumed.
6. **No invented fallbacks.** If a rate, quote field, or transaction field is missing, surface a visible `"--"` or skip the value. Never substitute a hardcoded default (e.g. `rate = 1` or `taxes = 0`) without confirming that is the intended behavior in the source.

---

## Scope

Enforce calculation accuracy and currency conversion correctness for all financial data displayed or computed in StockTracker.

## Core References

- Currency helpers: `src/lib/utils.ts` — `convertToEUR`, `convertCurrency`, `formatCurrency`
- Performance metrics: `src/lib/performance.ts` — `calculateTTWROR`, `calculateXIRR`
- Portfolio totals: `src/lib/portfolio-summary.ts` — `calculatePortfolioTotals`
- FX rate API: `src/app/api/exchange-rates/route.ts`
- Dividend UI: `src/components/DividendSummary.tsx`
- Projection UI: `src/components/PortfolioProjection.tsx`
- Cost basis: `src/lib/derive-holdings.ts`

For all named formulas with examples, see [FORMULAS.md](FORMULAS.md).

---

## Exchange Rates

### Rate Key Format

All rate keys use the format `EUR{CURRENCY}` (no separator):

```
rates["EURUSD"]  // 1 EUR = 1.17 USD
rates["EURGBP"]  // 1 EUR = 0.86 GBP
rates["EURDKK"]  // 1 EUR = 7.46 DKK
rates["EURCAD"]  // 1 EUR = 1.58 CAD
```

**Known bug — always fix on sight:** `DividendSummary.tsx` and `PortfolioProjection.tsx` incorrectly use `EUR_USD` or `USD_EUR` with underscores. The correct key is always `rates["EUR${currency}"]`.

### Converting to EUR

Use `convertToEUR(amount, currency, rates)` from `src/lib/utils.ts`. Do not inline this logic. The formula it applies:

- Standard: `amount / rates["EUR${currency}"]`
- GBX (pence): `amount / 100 / rates["EURGBP"]`
- EUR: `amount` (identity)
- **Missing rate:** returns `NaN` (never treat foreign amounts as EUR). Callers must use `hasExchangeRate` / `canConvertCurrency` and fall back to stored `valueInEUR` or `"--"`.

### Converting Between Currencies

Use `convertCurrency(amount, fromCurrency, toCurrency, rates)`. Never chain two `convertToEUR` calls manually.

### GBX Special Case

LSE quotes are in GBX (pence). Always divide by 100 before any GBP or EUR conversion. Use `normalizeCurrency("GBp")` → `"GBX"` to canonicalize the currency code before lookup.

### Missing Rate Guard

Always guard before dividing by a rate:

```typescript
const rate = rates[`EUR${currency}`];
if (!rate || rate === 0) {
  // log warning, return null or show "--" in UI
  return null;
}
```

### Known Rate Gaps

JPY, SEK, NOK, CHF pairs are **not fetched** by the exchange-rates API. For holdings in these currencies, `convertToEUR` will silently return the unconverted amount. When adding UI that displays holdings in these currencies, add a missing-rate warning or fetch the pair explicitly.

---

## Dividend Calculations

### Formulas

- **Dividends Per Share (DPS):** `Total dividends paid / Shares outstanding`
- **Dividend Yield:** `(Annual DPS / Current share price) × 100`
- **Payout Ratio:** `(Total dividends paid / Net income) × 100`
- **Net annual income (from quotes):** `trailingAnnualDividendRate × shares`

### Display Rules

1. Always convert dividend amounts to EUR using `convertToEUR` before aggregating across holdings.
2. Dividend yield is a percentage — do not convert it; it is already currency-neutral.
3. Estimated annual income uses `quote.trailingAnnualDividendRate` (in the quote's currency), then `convertToEUR`.
4. When showing historical dividend income from transactions, use `tx.amount` with `tx.currency`, converted via `convertToEUR`.

### Dividend Transaction Treatment

- `tx.type === "dividend"` — net amount after any withholding tax should already reflect `tx.amount - tx.taxes`.
- In XIRR cash flows: dividend is a **positive inflow** = `tx.amount - tx.taxes`.
- Do not double-subtract taxes; `performance.ts` already handles this in `txAmountToEUR()`.

---

## Taxes

### Withholding Tax

Stored on `Transaction.taxes`. Sources:

- DEGIRO, IBKR, Trading 212, Revolut: parsed from broker CSV
- All other brokers: `taxes: 0` (not reported)

### Treatment by Transaction Type

| Type | Tax treatment |
|------|--------------|
| Buy | Added to cost basis: `costAmount += shares × price + fees + taxes` |
| Sell | Subtracted from proceeds |
| Dividend | Reduces inflow: `netInflow = grossAmount - taxes` |

### Capital Gains

**No capital gains tax calculation exists.** Surface raw gain/loss only:

```
gainLoss = currentValue - costBasis
gainLossPercent = (gainLoss / costBasis) × 100
```

Do not fabricate or estimate capital gains tax. If a feature requires it, scope it as a new capability.

---

## Cost Basis

### Method

FIFO (first-in, first-out) — implemented in `src/lib/derive-holdings.ts`. Do not reimplement.

### Cost Per Lot

```
costPerLot = shares × purchasePrice + fees + taxes
```

### Currency Conversion for Cost Basis

Prefer `tx.exchangeRateEur` when available (rate at transaction date). Fall back to current live rates only when `exchangeRateEur` is null:

```typescript
const costEUR = tx.exchangeRateEur
  ? tx.totalAmount * tx.exchangeRateEur
  : convertToEUR(tx.totalAmount, tx.currency, rates);
```

---

## Performance Metrics

### TTWROR

Call `calculateTTWROR(transactions, quotes, exchangeRates)` from `src/lib/performance.ts`. Uses Modified Dietz weighting. Do not reimplement.

### XIRR

Call `calculateXIRR(cashFlows)` from `src/lib/performance.ts`. Uses Newton–Raphson iteration. Cash flow sign convention:

- Buy: **negative** (outflow)
- Sell: **positive** (inflow)
- Dividend: **positive** (inflow = amount − taxes)
- Fee: **negative** (outflow)

### Period Return

```
periodReturn = (endValue - startValue) / startValue × 100
```

Use `calculatePeriodReturn(start, end)` if available; otherwise apply directly.

---

## Display Accuracy Rules

These rules apply to **every component that renders monetary values**:

1. **Never display raw values** without currency conversion to the holding's display currency.
2. **Rate key format:** always `rates["EUR${currency}"]` — never underscores or reversed pairs.
3. **Missing rate guard:** if a rate is 0 or undefined, show `"--"` or a warning, never a wrong number.
4. **Rounding:** displayed values to 2 decimal places; internal calculations use full float precision.
5. **GBX:** divide by 100 before any GBP/EUR conversion — applies to price, dividend, and cost basis.
6. **Percentage values** (yield, return, payout ratio) are already dimensionless — do not run them through currency conversion.
7. **Use `formatCurrency(value, currency)`** from `src/lib/utils.ts` for all currency display — never inline `toFixed` with a hardcoded symbol.

---

## Delivery Checklist

```md
Financial Calculation Checklist
- [ ] Source files read before writing any formula (no memory-only code)
- [ ] Function signatures confirmed from source before calling
- [ ] Field names confirmed from types.ts / schemas.ts before using
- [ ] Exchange rate keys use EUR{CURRENCY} format (no underscore)
- [ ] convertToEUR / convertCurrency used — no inline division
- [ ] Missing rate guarded: null check before division (no invented fallback of rate=1)
- [ ] GBX holdings divided by 100 before EUR conversion
- [ ] Dividend taxes treated as inflow reduction, not double-subtracted
- [ ] Cost basis uses tx.exchangeRateEur when available
- [ ] TTWROR / XIRR computed by calling existing lib functions
- [ ] Displayed values use formatCurrency, rounded to 2dp
- [ ] Percentage values not run through currency conversion
- [ ] No capital gains tax fabricated
- [ ] Missing values surface "--" not a silent wrong number
```

## Coordination

- If changes affect portfolio totals or dashboard visuals, involve `engineer-dashboard`.
- If changes require new transaction fields or schema changes, involve `engineer-data`.
- If new broker parsers need to capture withholding tax, involve `engineer-integrations`.
- Validate calculation changes with `qa-tester`.
