# Cron cost reduction (quotes + queues)

- **Status:** active
- **Owner:** agent
- **Started:** 2026-08-23
- **Target:** 2026-08-30

## Goal

Cut redundant Yahoo/Vercel cron load without losing snapshot density during market hours or ops/feedback latency.

## Acceptance criteria

- [x] Snapshots, refresh-holdings, and check-alerts share Redis quote/FX fetch
- [x] Those jobs early-exit before Yahoo when no relevant market is open
- [x] ProdOps and feedback dispatch on enqueue; hourly cron is backup
- [x] support-return-watch is hourly backup (event path remains primary)
- [x] screening-recover stretched to `*/5`
- [x] Fase 3 — screener/AID/moat/coverage/recommendations lazier or less frequent
- [ ] Fase 4 (lifecycle merge) still open

## Plan

1. Fase 1 — shared `fetchSharedQuotesAndRates` + market gate (done).
2. Fase 2 — kick-on-write + sparser queue crons (done).
3. Fase 3 — screener/AID/moat/coverage less frequent (done).
4. Fase 4 — lifecycle job merge + paused digest-email archive.

## Decisions log

- 2026-08-23: Redis quote/FX TTL raised to 90s so same-minute cron overlap shares one Yahoo pass without a second cache keyspace.
- 2026-08-23: User-triggered snapshot materialize still fetches when markets are closed so import/move charts get a point.
- 2026-08-23: Feedback Linear auto-pipeline keeps the 6h eligibility window; kick drains ack retries and due rows immediately.
- 2026-08-23: Screener nightly sync is holdings ∪ hot mega-caps; UI `ensureScreenerSymbols` fills misses. AID digest is daily (skip if 24h cache fresh). FinPulse cron `*/6` (was `*/30`) and skips when the 24h cache is fresh; on-read also warms. Moat daily. Coverage weekly backup after refresh-holdings FIGI heal. Home tips prefetch 7-day actives and live-compute on weekly cache miss.

## Risks

- Weekend snapshot gaps on equity-only portfolios (accepted; last-known price remains).
- Concurrent kick + hourly cron can double-attempt ProdOps/Linear; existing claim/dedupe paths apply.

## Follow-ups

- Fase 4 as a separate PR.
- Watch `cron_executions` for `skippedMarketsClosed`, screener `mode=holdings_hot` ticker counts, and Yahoo/Tavily quota.
