---
name: financial-calculations
description: Enforces accurate financial calculations for portfolio apps — dividends, yields, taxes, EUR-base FX conversion, GBX handling, TTWROR/XIRR concepts, and currency display. Use when working on monetary values, performance metrics, exchange rates, or investment UI.
---

# Financial Calculations (generic codebase)

**Disclaimer:** This skill encodes engineering discipline and common formulas. It is **not** investment, tax, or legal advice. Validate behavior with your domain experts and regulators.

## Anti-hallucination rules — read first

1. **Never compute from memory.** Read the implementation that owns the logic in *your* codebase before changing formulas.
2. **Never assume a function signature.** Open the source of `calculateTTWROR`, `convertToEUR`, etc., before calling.
3. **Never assume a field name.** Confirm schema/types in your project before using transaction or quote fields.
4. **Never assume rate key format.** Confirm how your FX feed stores keys (e.g. `EUR${currency}` vs other conventions).
5. **Verify before displaying.** Trace raw value → conversion → formatting using actual code paths.
6. **No invented fallbacks.** If a rate or field is missing, show `"--"` or omit — do not silently assume `1` or `0` unless product spec requires it.

---

## Scope

Promote correct currency math, performance metrics, and display hygiene for portfolio-style applications.

## Core references (map to your repo)

Replace these placeholders with **your** modules:

- Currency helpers — e.g. `convertToEUR`, `convertCurrency`, `formatCurrency`
- Performance metrics — e.g. `calculateTTWROR`, `calculateXIRR`
- Portfolio totals / snapshots — your summary module
- Exchange rates API — your rates route or provider client
- Holdings derivation / cost basis — your positions module

For formula tables and examples, see [FORMULAS.md](FORMULAS.md).

---

## Exchange rates

### EUR-normalized keys (common pattern)

Many apps store rates as **EUR per unit of foreign currency**:

```
rates["EURUSD"]  // 1 EUR = X USD
rates["EURGBP"]  // 1 EUR = X GBP
```

Confirm the exact convention in your codebase before using.

### Converting to EUR

Typical pattern:

- Standard: `amount / rates["EUR${currency}"]`
- GBX (pence): divide by 100 to get GBP units, then convert via `EURGBP` as your implementation defines.
- EUR: identity.

Use your project's single helper (e.g. `convertToEUR`) instead of duplicating division logic.

### Missing rate guard

```typescript
const rate = rates[`EUR${currency}`];
if (!rate || rate === 0) {
  return null; // or surface "--" in UI
}
```

---

## Dividends

- Yield and payout ratios are **percentages** — do not run them through FX conversion.
- Income from a quote field is usually in the **quote currency** — convert to display or base currency via your helpers.
- Net dividend for cash flows: match your transaction model (gross minus withholding when applicable).

---

## Taxes and cost basis

- Withholding and fees must follow **your** data model; do not double-subtract.
- Cost basis: prefer historical FX at trade time when stored; otherwise fall back per product rules.
- **Capital gains tax:** do not fabricate unless your product explicitly implements jurisdiction-specific rules.

---

## Performance metrics

- **TTWROR / Modified Dietz:** use one tested implementation; avoid reimplementing casually.
- **XIRR:** Newton–Raphson on dated signed cash flows — buy negative, sell/dividend positive per your convention.
- **Period return:** `(end - start) / start × 100` when definitions of start/end values are consistent.

---

## Display accuracy

1. Show values in the user's chosen display currency using one formatting entry point.
2. Guard missing rates and missing quotes.
3. Round for **display**; avoid rounding twice inside chained calculations.
4. **GBX:** never forget the pence → pounds scaling before FX.
5. Percentages (yield, return) are dimensionless — no FX pipeline.

---

## Delivery checklist

```md
Financial calculation checklist
- [ ] Source read before changing formulas
- [ ] Function signatures confirmed
- [ ] Schema fields confirmed
- [ ] Rate keys match your FX module
- [ ] Missing rate guarded
- [ ] GBX scaled correctly
- [ ] Dividend / tax treatment matches your model
- [ ] Performance metrics delegated to shared implementations
- [ ] Display uses shared formatters
- [ ] No fabricated tax or guaranteed returns in copy
```

For named formulas, see [FORMULAS.md](FORMULAS.md).
