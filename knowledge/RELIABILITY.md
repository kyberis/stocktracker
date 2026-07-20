# RELIABILITY.md — reliability, observability, and operations

This document captures how we keep trefolio running, what observability
surfaces we have, and how agents should reason about failures.

## Runtime

- **Host:** Vercel (serverless functions + static assets).
- **DB:** Turso (libSQL) in production; local SQLite file in dev.
- **Cache / rate limits:** Upstash Redis.
- **Queue:** none (cron-driven batch model).
- **Email:** Resend.
- **Market data:** Yahoo (free), Alpha Vantage (Pro), FMP (events / fallback),
  Finnhub (news), CoinLore (crypto), OpenFIGI (ISIN resolution).

## Cron jobs

Registry: [`src/lib/cron-registry.ts`](../src/lib/cron-registry.ts). Schedules
must match `vercel.json`. Current set:

| Name | Schedule | Purpose |
|------|----------|---------|
| `push-gauges` | `0 0 * * *` | Sync rate-limit counters, purge old analytics/chat, push metrics to Grafana. |
| `check-alerts` | `*/15 * * * *` | Evaluate price alerts and dispatch notifications. |
| `snaptrade-cleanup` | `30 23 * * *` | Delete pending/inactive SnapTrade connections, prune logs. |
| `snaptrade-sync` | `0 * * * *` | Sync active SnapTrade connections (tx, holdings, cash). |
| `event-sync` | `0 6 * * *` | Fetch earnings, economic events, IPOs, splits. |
| `screener-sync` | `0 3 * * *` | Refresh stock screener cache. |
| `tax-rules-review` | `0 9 2 1 *` | Annual check that NL/DE tax rules are current. |
| `x-post` | `*/15 * * * *` | Publish scheduled X/Twitter posts. |
| `refresh-holdings` | `*/15 * * * *` | Update holding valuations and FX. |
| `portfolio-snapshots` | `10 * * * *` | Compute and store portfolio value snapshots. |
| `trial-invitations` | `0 10 * * *` | Invite eligible free users to 7-day Pro trial. |
| `trial-expiration` | `0 * * * *` | Downgrade expired trials, send expiration email. |
| `weekly-digest` | `0 8 * * 1` | AI-powered weekly portfolio digest (Mondays). |
| `digest-email` | **paused** | Market digests no longer processed (was Gmail poll + AI rewrite). |
| `moat-sync` | `0 */4 * * *` | Evaluate stale moat scores for screener universe. |

All cron routes wrap their work in `withCronLogging()` which records a row in
`cron_executions` (started_at, finished_at, status, error). Admin reads this via
[`/admin/cron-stats`](../src/app/api/admin/cron-stats).

## Observability surfaces

- **Logs:** Vercel function logs (stderr/stdout). Structured as JSON where it
  matters. `console.error` for errors only.
- **Metrics:** `prom-client` gauges pushed to Grafana Cloud by the
  `push-gauges` cron. See
  [`.cursor/skills/analytics-instrumentation/SKILL.md`](../.cursor/skills/analytics-instrumentation/SKILL.md).
- **Tracing:** none (not yet).
- **Uptime:** external (Uptime Robot-style) hitting `/` and `/api/health`
  (TODO confirm).
- **Error tracking:** client errors caught by `ErrorBoundary`; server errors
  surface in Vercel logs.

## Rate limits

Applied per-IP and per-user via Upstash + the `rate_limits` table:

| Scope | Limit |
|-------|-------|
| Login attempts | 5 / min / IP |
| Signup | 3 / hour / IP |
| AI analysis | tiered by plan (5/month free, 20/month Bifolio, unlimited Trefolio) |
| Password reset | 3 / hour / email |
| Broker import (AI) | 3 / 10 min / user |
| SnapTrade connect | 3 / hour / user |

Source of truth: [`src/lib/db/rate-limits.ts`](../src/lib/db/rate-limits.ts).

## Retries & idempotency

- Provider calls use exponential-backoff retry for 429 and 5xx.
- Import operations are idempotent by transaction hash
  (ticker + date + amount + price).
- SnapTrade sync uses `sync_token` + per-account cursor.
- Alert dispatch checks the `triggered` flag before sending (never double-send).
- Portfolio snapshots are upserted on `(user_id, timestamp)`.

## Degradation paths

| Upstream down | Visible behavior | Mitigation |
|---------------|------------------|------------|
| Yahoo Finance | Quotes stale; banner in UI. | Serve cached last-known; exchange rates from in-memory fallback. |
| Alpha Vantage | Fundamentals 503; Pro features show cached. | Cached fundamentals in `fmp_cache` / `moat_cache`. |
| FMP | Calendar empty. | Yahoo for earnings where possible. |
| SnapTrade | Sync paused; admin banner. | Next cron cycle retries. |
| OpenAI | AI endpoints return 503 with retry-after. | UI shows "AI temporarily unavailable." |
| Stripe | Checkout returns 503; webhooks queue at Stripe. | Admin warned via Grafana. |
| Resend | Emails fail; mailer logs. | Idempotent resend on next cron. |
| Turso | Hard outage — app read-only via caches where possible. | Vercel ISR + SWR for cached reads. |

## SLOs (targets, not contracts)

- Dashboard TTI p95 ≤ 2.5s on 4G mid-tier Android.
- API p95 ≤ 400ms for cached reads; ≤ 1.5s for provider-backed reads.
- Cron jobs ≤ 60s wall-clock except `snaptrade-sync` (≤ 300s).
- Email delivery ≤ 5min from trigger (Resend SLA permitting).
- Zero partial / double alerts per user per day.

## Incident playbook (short)

1. Check Vercel function errors and Grafana gauges.
2. Check `cron_executions` for the relevant cron.
3. If provider-upstream: confirm status at their status page; flip a feature
   flag if needed to degrade gracefully.
4. If DB: check Turso console.
5. Capture the root cause into
   [`exec-plans/tech-debt-tracker.md`](exec-plans/tech-debt-tracker.md)
   and file a follow-up plan.

## Reading list

- [`.cursor/skills/analytics-instrumentation/SKILL.md`](../.cursor/skills/analytics-instrumentation/SKILL.md)
- [`.cursor/rules/cron-jobs.mdc`](../.cursor/rules/cron-jobs.mdc)
- [`design-docs/core-beliefs.md`](design-docs/core-beliefs.md)
