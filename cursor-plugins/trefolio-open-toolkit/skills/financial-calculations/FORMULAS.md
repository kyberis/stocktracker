# Financial formulas reference

Educational quick-reference for portfolio-style apps. **Not financial advice.** Adapt naming to your codebase.

---

## Dividends

| Name | Formula | Notes |
|------|---------|-------|
| DPS | Total dividends paid / shares outstanding | |
| Dividend yield | `(Annual DPS / price) × 100` | %; do not currency-convert the % |
| Payout ratio | `(Dividends / net income) × 100` | Company-level |
| Est. annual income | `annualDividendPerShare × shares` | Convert per-share currency through your FX layer |

---

## Currency conversion

| Name | Formula | Notes |
|------|---------|-------|
| Amount → EUR | `amount / rates["EUR${ccy}"]` | When rates are EUR-per-unit foreign |
| EUR → foreign | `amountEUR × rates["EUR${ccy}"]` | |
| GBX → EUR | `(amount / 100) / rates["EURGBP"]` | GBX is pence |

Always confirm key shapes in **your** rates module.

---

## Cost basis

| Name | Formula | Notes |
|------|---------|-------|
| Lot cost | `shares × price + fees + taxes` | FIFO/LIFO is product-specific |
| Unrealized P/L | `value − cost` | Same currency |
| P/L % | `(P/L / cost) × 100` | Do not FX-convert the % itself |

---

## Performance

| Name | Notes |
|------|------|
| Period return | `(V_end − V_start) / V_start × 100` |
| TTWROR | Modified Dietz / linked sub-periods — use your shared implementation |
| XIRR | IRR on dated flows; sign convention must match your engine |

### XIRR cash flow signs (typical)

| Type | Sign |
|------|------|
| Buy | Negative |
| Sell | Positive |
| Dividend (net) | Positive |
| Fee | Negative |

---

## Formatting

Use one formatter per type (currency, percent, compact) so locales stay consistent.

---

## Disclaimer

Numbers in apps can be wrong for many reasons (stale quotes, corporate actions, tax nuances). Surface uncertainty; never imply precision you do not have.
