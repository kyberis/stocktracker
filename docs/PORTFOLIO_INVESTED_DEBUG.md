# Debugging invested capital on the evolution chart

Use this when a user sees **invested capital** (gray line / `total_invested_eur`) move between two dates and you need to separate **real data** from **chart behavior**.

## What the chart shows

- **Raw data** comes from `portfolio_snapshots` (`total_value_eur`, `total_invested_eur`, `date`, `user_id`, `portfolio_id`).
- For **hourly** ranges, the API may insert **extra timestamps** between sparse rows to smooth **total value** only. **Invested** on those filler points matches the **previous real snapshot** (it is not linearly ramped between days). If you still see a step between two **real** DB rows, that step is from business logic / FX / trades—not from interpolation.

## 1. Compare two snapshot rows (Turso / SQLite)

Replace placeholders:

- `:user_id` — user id  
- `:portfolio_id` — portfolio id (often `''` for default)  
- Adjust dates as needed.

```sql
SELECT date, total_value_eur, total_invested_eur
FROM portfolio_snapshots
WHERE user_id = :user_id
  AND portfolio_id = :portfolio_id
  AND substr(date, 1, 10) BETWEEN '2026-03-18' AND '2026-03-20'
ORDER BY date ASC;
```

Inspect consecutive rows: any change in `total_invested_eur` is whatever was **stored** at materialization time (live snapshot, cron, or historical backfill—not the chart UI).

## 2. Transactions in that window

```sql
SELECT id, date, type, ticker, shares, total_amount, currency, fees, taxes, portfolio_id
FROM transactions
WHERE user_id = :user_id
  AND portfolio_id = :portfolio_id
  AND substr(date, 1, 10) BETWEEN '2026-03-18' AND '2026-03-20'
ORDER BY date ASC, id ASC;
```

Buys increase cost basis (in aggregate); sells reduce; dividends/fees appear as their own rows depending on import rules.

## 3. If there are no new trades but invested still moves

Common explanations:

| Check | Notes |
|--------|--------|
| **FX** | Live snapshots use `calculatePortfolioTotals` — cost in portfolio currency uses **current** FX. Multi-currency holdings can change **EUR cost** day to day without new money. |
| **Mixed history** | Older points may come from **backfill** (transaction replay); newer rows from **POST /api/portfolio/snapshot** or **cron** — small differences at the handoff are possible. |
| **Holdings vs ledger** | Rare edge cases in cost aggregation (`src/lib/portfolio-summary.ts`) — compare snapshot times with quote refresh windows. |

## 4. Related code

- Snapshot writes: `src/app/api/portfolio/snapshot/route.ts`, `src/lib/cron-portfolio-snapshots.ts`
- Cost / value totals: `src/lib/portfolio-summary.ts` (`totalCostEUR`)
- Historical replay: `src/lib/backfill-snapshots.ts`
- Chart series + hourly filler: `src/app/api/portfolio/history/route.ts`

## 5. Empty `portfolio_id`

Many rows use `portfolio_id = ''` for the default portfolio. If the user has multiple portfolios, filter with the exact id shown in the app (or list distinct ids first):

```sql
SELECT DISTINCT portfolio_id FROM portfolio_snapshots WHERE user_id = :user_id;
```
