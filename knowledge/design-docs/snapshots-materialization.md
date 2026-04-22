# snapshots-materialization

> How snapshots and materialization interact.

## Data path
1. `portfolio-snapshots` cron writes one row per portfolio per day with totals in EUR.
2. `materialize-portfolio-snapshots` expands daily totals into per-holding breakdowns needed for charts.
3. `backfill-snapshots` recomputes on new import or a ticker change.
4. `compact-snapshots` prunes resolutions > 1 year old to 1/week.

## Invariants
- Snapshots are append-only per `(portfolio_id, date)`; re-runs update by date.
- EUR is the base column; display conversion is the UI's job.
- Spike attribution uses `materialize-portfolio-snapshots` output only — never raw quotes.

## Backfill triggers
- New import of historical transactions.
- Admin-triggered via `/api/admin/backfill-snapshots`.
- User-triggered via holding-history edit.

## Related
- [portfolio-snapshots-cron](../product-specs/portfolio-snapshots-cron.md)
- [materialize-portfolio-snapshots](../product-specs/materialize-portfolio-snapshots.md)
- [backfill-snapshots](../product-specs/backfill-snapshots.md)
- [compact-snapshots](../product-specs/compact-snapshots.md)
