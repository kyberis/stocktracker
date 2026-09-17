# Cost reduction phase 6 (post activity-scope)

- **Status:** active (impl sprint shipping)
- **Owner:** agent / Marcos
- **Started:** 2026-09-17
- **Target:** 2026-09-18 (impl) / 2026-10-01 (remeasure)

## Goal

Cut remaining idle/cron spend after Fase 5 **without** replacing FMP with Alpha Vantage, and without a paid-vendor audit in this sprint.

## In scope (this sprint)

| # | Item | Approach | Done |
|---|------|----------|------|
| A | Empty-queue recover crons | `screening-recover` + `re-screening-recover` `*/5` → `*/15` | [x] |
| B | `aid-digest` daily warm | Fresh window 20h → **26h**; warm only users active ≤30d (non-test) | [x] |
| C | Grants | Confirmed `commerce_enabled=true` in prod → complimentary renewal no-ops | [x] |
| D | Seed / disposable emails | `mailinator.com` in `TEST_ACCOUNT_EMAIL_DOMAINS` | [x] |
| E | Measure | Baseline logged below; remeasure 7d after deploy | [ ] post-deploy |

## Explicitly out of scope (this sprint)

- **FMP + Alpha Vantage audit / downgrade** — deferred. Note: `market_data_alpha_vantage=false` already; FMP feature flags mostly `true`. **Do not** migrate FMP→AV.
- OpenAI `cost_usd=0` observability on Warren/Clover.
- Turso/Vercel plan right-size.

## Acceptance criteria

- [x] Recover crons scheduled `*/15` in `vercel.json` + `cron-registry` (+ test).
- [x] `aid-digest` skips rebuild when cache age &lt; 26h; warm list respects `last_active` ≤30d.
- [x] `mailinator.com` treated as test domain in holdings cron scope.
- [x] Baseline 7d cron hours recorded (2026-09-17).
- [ ] Release note + deploy.

Already done earlier:

- [x] SnapTrade idle disconnect + daily Path 3
- [x] Activity-scoped quotes/snapshots + snapshots `*/15` (Fase 5)

## Decisions log

- 2026-09-17: Marcos — Fase 5 first; do not replace FMP with AV.
- 2026-09-17: SnapTrade idle one-shot (16 deleted, 13 kept) + cleanup Path 3.
- 2026-09-17: Phase-6 impl = A–E; **FMP/AV audit deferred**.
- 2026-09-17 baseline (`cron_executions` 7d): total **15.53h**, top3 **14.48h**, recover pair **0.14h**, aid-digest **0.43h**. Root cause for AID cost: 20h fresh window &lt; 24h cron → ~19 rebuilds/day.
- 2026-09-17: `commerce_enabled=true` → grant renewal cron already skips.

## Risks

- Stretching recover delays stuck leases if kick fails — 15m backup still OK.
- 26h AID window: on-read warm still fills misses.

## Follow-ups (later)

- FMP + AV paid-tier audit (no provider swap).
- OpenAI cost logging for Warren/Clover.
- Remeasure cron hours 7d after this deploy.
- Vercel/Turso right-size after metrics drop.
