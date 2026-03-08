# Financial Formulas Reference

Quick-reference for all named financial formulas used in StockTracker.

---

## Dividend Formulas

| Name | Formula | Notes |
|------|---------|-------|
| Dividends Per Share (DPS) | `Total dividends paid / Shares outstanding` | Source: Saxo Financial Literacy Guide |
| Dividend Yield | `(Annual DPS / Current share price) × 100` | Returns %; do not currency-convert |
| Payout Ratio | `(Total dividends paid / Net income) × 100` | Returns %; company-level metric |
| Estimated Annual Income | `trailingAnnualDividendRate × shares` | Quote currency → convert to EUR |
| Net Dividend Inflow | `grossDividendAmount − withholdingTax` | Used in XIRR cash flows |
| Dividends Paid (from balance sheet) | `Net income − Change in retained earnings` | For companies without explicit dividend reporting |
| Dividends Declared | `Net income × Payout ratio` | Estimated total distribution |
| Dividends Payable | `Declared dividend amount − Dividends paid` | Current liability before payment date |

### Example — Dividend Yield

```
Company pays $3/share annual dividend.
Stock price = $60.
Yield = (3 / 60) × 100 = 5%
```

### Example — Estimated Annual Income (StockTracker)

```
quote.trailingAnnualDividendRate = 2.40 USD
shares = 50
grossIncome = 2.40 × 50 = $120 USD
rates["EURUSD"] = 1.10
incomeEUR = 120 / 1.10 = €109.09
```

---

## Currency Conversion

| Name | Formula | Notes |
|------|---------|-------|
| Amount → EUR | `amount / rates["EUR${currency}"]` | Rate = "1 EUR = X foreign" |
| EUR → Foreign | `amountEUR × rates["EUR${currency}"]` | — |
| GBX → EUR | `amount / 100 / rates["EURGBP"]` | Pence: divide by 100 first |
| Foreign A → Foreign B | `convertCurrency(amount, A, B, rates)` | Use lib function, never inline |

### Rate Key Examples

```
rates["EURUSD"] = 1.10   // 1 EUR = 1.10 USD
rates["EURGBP"] = 0.86   // 1 EUR = 0.86 GBP
rates["EURDKK"] = 7.46   // 1 EUR = 7.46 DKK
rates["EURCAD"] = 1.58   // 1 EUR = 1.58 CAD
```

### Missing Rate Guard

```typescript
const rate = rates[`EUR${currency}`];
if (!rate || rate === 0) return null; // never divide by zero or undefined
const amountEUR = amount / rate;
```

---

## Cost Basis

| Name | Formula | Notes |
|------|---------|-------|
| Cost per lot | `shares × purchasePrice + fees + taxes` | FIFO method |
| Cost in EUR (preferred) | `totalAmount × tx.exchangeRateEur` | Use when tx.exchangeRateEur is set |
| Cost in EUR (fallback) | `convertToEUR(totalAmount, currency, rates)` | Live rates when no historical rate |
| Unrealized gain/loss | `currentValue − costBasis` | Both in same currency (EUR) |
| Gain/loss % | `(gainLoss / costBasis) × 100` | Do not currency-convert this % |

---

## Performance Metrics

| Name | Formula | Implementation |
|------|---------|---------------|
| Period Return | `(endValue − startValue) / startValue × 100` | `calculatePeriodReturn()` in `performance.ts` |
| TTWROR (Modified Dietz) | Sub-period returns linked multiplicatively | `calculateTTWROR()` in `performance.ts` |
| XIRR | Newton–Raphson on dated cash flows | `calculateXIRR()` in `performance.ts` |
| Day Gain/Loss | `(currentPrice − previousClose) × shares` | In quote currency → convert to EUR |

### XIRR Cash Flow Signs

| Transaction Type | Sign | Amount |
|----------------|------|--------|
| Buy | Negative (outflow) | `shares × price + fees + taxes` |
| Sell | Positive (inflow) | `shares × price − fees − taxes` |
| Dividend | Positive (inflow) | `grossAmount − taxes` |
| Fee | Negative (outflow) | `feeAmount` |
| Portfolio end value | Positive (inflow) | Current market value |

---

## Dividend Key Dates (display-only reference)

| Date | Meaning |
|------|---------|
| Ex-dividend date | Must own shares **before** this date to receive dividend |
| Record date | Company confirms eligible shareholders |
| Payment date | Dividend is actually paid to shareholders |

These dates come from quote data and are informational only — StockTracker does not calculate or predict them.

---

## Formatting Rules

| Value type | Function | Example output |
|-----------|---------|---------------|
| Currency | `formatCurrency(value, currency)` | `€1,234.56` |
| Percentage | `formatPercent(value)` | `+12.50%` |
| Integer count | `formatNumber(value)` | `1,000` |
| Compact currency | `formatCompactNumber(value)` | `€1.2M` |

Never use raw `.toFixed()` with a hardcoded symbol in UI components.
