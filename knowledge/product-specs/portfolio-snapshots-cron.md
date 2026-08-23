# portfolio-snapshots-cron

> 5-minute cron that stores a value snapshot per user/portfolio.

## 1. Summary

`/api/cron/portfolio-snapshots` runs at `*/5 * * * *`. For each user/portfolio, it computes current total value using live quotes + FX + holdings + cash, and upserts a row in `portfolio_snapshots`. This is the source of historical series on the chart (including the denser 1D intraday view).

## 2. Status

- **Tier:** system
- **Feature flag:** _none_
- **Health:** green
- **Owning skill:** [`engineer-tools`](../../.cursor/skills/engineer-tools/SKILL.md)

## 3. Entry points

| Type | Path | Notes |
|------|------|-------|
| Cron | [`src/app/api/cron/portfolio-snapshots/route.ts`](../../src/app/api/cron/portfolio-snapshots/route.ts) | Every 5 minutes. |
| Library | [`src/lib/cron-portfolio-snapshots.ts`](../../src/lib/cron-portfolio-snapshots.ts) | Work function. |

## 4. Data model

- `portfolio_snapshots`: `user_id`, `portfolio_id`, `timestamp`, `total_eur`, `holdings_eur`, `cash_eur`, `gain_eur`, `gain_pct`, plus breakdown fields.

## 5. API surface

| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| GET | `/api/cron/portfolio-snapshots` | cron | system | Vercel-triggered. |

## 6. UI surface

None; consumers are charts and summaries.

## 7. Business logic

- Upserts on `(user_id, portfolio_id, timestamp)` to avoid duplicates on re-run.
- Uses `refresh-holdings` output (latest quotes) when both crons overlap.
- Wrapped in `withCronLogging()`.

## 8. External dependencies

- Yahoo (via api-providers).
- Turso writes.

## 9. Currency / FX / tax implications

- All stored in EUR.

## 10. i18n

N/A.

## 11. Permissions / tier gating / rate limits

- Cron auth via Vercel signing.
- Per-user failure isolated; the job continues.

## 12. Telemetry

- `cron_executions` row.
- Gauges: `snapshots_written_total`, `snapshots_failed_total`.

## 13. Edge cases & gotchas

- Very large users batched to avoid function timeout.
- Holidays/weekends still record snapshots (last-known price).

## 14. Tests

- Unit for math in `src/lib/*.test.ts`.

## 15. Related skills and rules

- [`.cursor/rules/cron-jobs.mdc`](../../.cursor/rules/cron-jobs.mdc)
- Related specs: [portfolio-value-chart](portfolio-value-chart.md), [materialize-portfolio-snapshots](materialize-portfolio-snapshots.md).

## 16. Open questions / planned work

- Partial retry on per-user failure.
