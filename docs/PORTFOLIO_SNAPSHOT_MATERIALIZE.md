# Materialize portfolio snapshots (one-off / post-deploy)

The scheduled job `GET /api/cron/portfolio-snapshots` writes **current** portfolio value and cost basis for every user with holdings (aggregate `portfolio_id = ''` plus each non-empty portfolio), using the same logic as when a customer has the dashboard open.

After deploying snapshot-related changes, you can **run it once in production** so charts have an immediate data point for everyone.

## Option A — Cron secret (CI / terminal)

Requires `CRON_SECRET` (same as other crons) and your production base URL:

```bash
export CRON_SECRET="…"
export BASE_URL="https://your-production-domain.com"

curl -fsS -X POST \
  -H "Authorization: Bearer $CRON_SECRET" \
  "$BASE_URL/api/cron/portfolio-snapshots"
```

`GET` works the same if you prefer:

```bash
curl -fsS -H "Authorization: Bearer $CRON_SECRET" "$BASE_URL/api/cron/portfolio-snapshots"
```

## Option B — npm script

```bash
CRON_SECRET="…" BASE_URL="https://your-production-domain.com" npm run materialize:portfolio-snapshots
```

## Option C — Admin UI session

While logged in as **admin**, `POST` to:

`/api/admin/materialize-portfolio-snapshots`

(e.g. from browser DevTools or a REST client with session cookies). No `CRON_SECRET` needed.

## Limits

- Optional env: `PORTFOLIO_SNAPSHOT_CRON_MAX_USERS` — cap users processed (testing only).
- Long runs: route `maxDuration` is 300s; very large user bases may need multiple invocations or a higher cap.

## Historical backfill (transactions → chart)

Reconstruction from transactions runs automatically in the **background** after **bulk CSV / broker / SnapTrade** imports (`deferTask` / `waitUntil` on Vercel). Long spans use **weekly** sampling; roughly the **first year** uses **business-day** steps (Yahoo **daily** closes only — not true intraday history). **Live** “hourly” buckets come from materialized snapshots.

You can still trigger it manually: `POST /api/portfolio/backfill-snapshots` (session) or `POST /api/admin/backfill-snapshots` with `{ "userId": "…" }` (admin).
