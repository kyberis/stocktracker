# Cost reduction phase 6 (post activity-scope)

- **Status:** active
- **Owner:** agent / Marcos
- **Started:** 2026-09-17
- **Target:** 2026-10-01

## Goal

After Fase 5 (active≤30d quotes/snapshots + SnapTrade idle pause), cut remaining fixed and idle-queue spend **without** replacing FMP with Alpha Vantage.

## Acceptance criteria

- [ ] `screening-recover` + `re-screening-recover` do not pay meaningful Vercel time when queues are empty (stretch schedule and/or early-exit before heavy work; kick-on-write remains primary)
- [ ] `aid-digest` does not burn ~200s avg when the 24h cache is already fresh (skip earlier / cheaper probe)
- [ ] Complimentary Pro grants: confirm no auto-renew of idle grants; let sep expiry wave land; optional admin purge of e2e/test Pro rows
- [ ] FMP + Alpha Vantage: **audit** which features need which paid tier; downgrade or feature-flag unused paid paths — **do not** migrate FMP→AV
- [ ] Optional: exclude known seed/mailinator-style emails from market-data universe if still appearing after test-domain filter
- [ ] Document measured before/after: `cron_executions` hours/week + vendor invoices

## Plan

1. **Empty-queue recover crons** — inspect `screening-recover` / `re-screening-recover`; if always no-op in ~100–150ms but 4k invocations/week, move to `*/15` or `*/30` and rely on enqueue kick (mirror ProdOps pattern).
2. **aid-digest warm** — read job path; ensure cache-fresh path returns before network/LLM warm; keep daily schedule.
3. **Grants** — verify `commerce-complimentary-renewal` stays skip-by-default for marketing grants; list Pro with `stripe_subscription_id = ''` and `last_active` >30d; no mass email required for cost cut.
4. **Vendor audit (no swap)** — map FMP vs AV call sites (`event-sync`, fundamentals, AID). Decide per-feature: keep paid, downgrade plan, or gate behind Pro/flag. Explicit non-goal: replace FMP with AV.
5. **Measure** — after deploy of Fase 5, sample 7d `SUM(duration_ms)` for `portfolio-snapshots`, `refresh-holdings`, `snaptrade-sync` vs pre-change baseline (~14.5h/week top-3).

## Decisions log

- 2026-09-17: Marcos — implement 1–3 (activity scope, snapshots */15, SnapTrade idle) first; plan remainder; **do not** replace FMP with Alpha Vantage for now.

## Risks

- Stretching recover crons delays stuck screening leases if kick fails — keep a slow backup schedule, do not delete the job.
- Downgrading FMP/AV tiers can break event calendar / AID silently — feature-flag and watch coverage gaps.

## Follow-ups

- Revisit OpenAI `cost_usd=0` on Warren/Clover logs (observability, not spend).
- Turso/Vercel plan right-size after cron hours drop.
