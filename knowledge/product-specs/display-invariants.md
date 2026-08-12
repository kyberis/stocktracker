# display-invariants

> Runtime checks that home-screen totals stay internally consistent, reported as sampled production telemetry without monetary amounts.

## 1. Summary

Staff need a signal when the numbers shown on Home disagree with each other (P/L ≠ value − cost, day % ≠ amount / prior, invested + cash ≠ net worth, sleeve sum ≠ invested, or two day-change formulas diverge). A pure catalog asserts a `DisplaySnapshot` of already-computed numbers. `usePortfolioHomeData` runs it when the `display_invariants` flag is on, skips demo mode, and posts `display_invariant_violation` at most once per page load (session fingerprint of codes). The UI never throws or shows an overlay.

## 2. Status

- **Tier:** Free (check runs for any signed-in home user when the flag is on)
- **Feature flag:** `display_invariants` (off by default)
- **Health:** green
- **Owning skill:** [`.cursor/skills/financial-calculations/SKILL.md`](../../.cursor/skills/financial-calculations/SKILL.md)

## 3. Entry points

| Type | Path | Notes |
|------|------|-------|
| Library | [`src/lib/portfolio/display-invariants.ts`](../../src/lib/portfolio/display-invariants.ts) | Catalog + privacy-safe metadata helpers |
| Library | [`src/lib/portfolio/report-display-invariants.ts`](../../src/lib/portfolio/report-display-invariants.ts) | Client POST + sessionStorage dedupe |
| Hook | [`src/components/dashboard-v2/use-portfolio-home-data.ts`](../../src/components/dashboard-v2/use-portfolio-home-data.ts) | Builds snapshot; reports violations |
| Component | [`src/components/dashboard-v2/StatsGrid.tsx`](../../src/components/dashboard-v2/StatsGrid.tsx) | Consumes shared `totals` + `dayChange` |
| API | [`src/app/api/analytics/track/route.ts`](../../src/app/api/analytics/track/route.ts) | Allow-list includes `display_invariant_violation` |
| Admin | [`src/app/(app)/admin/feature-flags/page.tsx`](../../src/app/(app)/admin/feature-flags/page.tsx) | Flag toggle |

## 4. Data model

No new tables. Reuses `analytics_events` via `trackEvent(userId, event, metadata)`.

Types: `DisplaySnapshot`, `DisplayInvariantViolation`, `DisplayInvariantCode` in `display-invariants.ts`.

## 5. API surface

| Method | Route | Auth | Tier | Description |
|--------|------|------|------|-------------|
| POST | `/api/analytics/track` | session | Free | Body `{ event: "display_invariant_violation", metadata }` |

Metadata (all strings, max 128 chars, no money): `codes`, `max_bps`, `surface`, `holding_bucket` (`0` / `1-5` / `6-20` / `21+`).

## 6. UI surface

- No user-visible overlay. Home hero / StatsGrid / pills already share `usePortfolioHomeData`.
- Admin Feature Flags → Features → Display value invariants.

## 7. Business logic

- Pure checks: finite numbers; `gainLoss ≈ current − cost`; `% ≈ gain/cost` when cost > €0.01; TRF-003 `dayPct ≈ dayAbs / (invested − dayAbs)` when prior is usable; `invested + liquidCash ≈ current`; sleeve sum ≈ invested (all-assets only); optional dual-path `totals.dayGainLossEUR` vs `getDayChange().amount`; optional holdings row sum vs invested.
- Epsilon: 1 cent absolute **or** 1 bp relative.
- Sleeve / dual-path fields omitted when the asset filter is not `all` (filtered totals must not be compared to unfiltered sleeves).
- `demoMode` skips the effect. Flag off skips the effect.
- Dedupe: module-level once per page load + `sessionStorage` fingerprint of codes.
- Never `throw` from `assertDisplayInvariants` or the reporter.

## 8. External dependencies

- None. Existing session analytics pipeline (Turso `analytics_events`).

## 9. Currency / FX / tax implications

- Asserts numbers already converted to the active portfolio currency. Does not re-run FX. Does not persist amounts.

## 10. i18n

- Admin flag label/description English-only (staff). No new user-facing locale keys.

## 11. Permissions / tier gating / rate limits

- Flag `display_invariants` off by default (global + per-user override).
- Track endpoint requires a session. Demo has no session POST.

## 12. Telemetry

- Event: `display_invariant_violation` (client allow-list).
- Catalog: [`src/lib/experiment-metrics-catalog.ts`](../../src/lib/experiment-metrics-catalog.ts).
- No ProdOps / Telegram in v1.

## 13. Edge cases & gotchas

- Do **not** assert hero live total vs chart last snapshot point — different data sources.
- `getDayChange` does not include fixed-return cash; `calculatePortfolioTotals.dayGainLossEUR` does. Dual-path may fire for those portfolios (signal, not a display overlay).
- Yahoo `regularMarketChange` vs `price − previousClose` can diverge; dual-path uses the metrics helper, not `regularMarketChange` alone.

## 14. Tests

- [`src/lib/portfolio/display-invariants.test.ts`](../../src/lib/portfolio/display-invariants.test.ts)
- [`src/lib/portfolio/report-display-invariants.test.ts`](../../src/lib/portfolio/report-display-invariants.test.ts)

## 15. Related skills and rules

- [`financial-calculations`](../../.cursor/skills/financial-calculations/SKILL.md)
- [`engineer-feature-flags`](../../.cursor/skills/engineer-feature-flags/SKILL.md)
- [`analytics-instrumentation`](../../.cursor/skills/analytics-instrumentation/SKILL.md)
- [`legal-advisor`](../../.cursor/skills/legal-advisor/SKILL.md) — privacy copy for quality events
- Related specs: [portfolio-summary-math](portfolio-summary-math.md), [feature-flags](feature-flags.md), [portfolio-anomaly-agent](portfolio-anomaly-agent.md) (data integrity, not display).

## 16. Open questions / planned work

- Widget / Leaf payload vs `calculatePortfolioTotals`.
- ProdOps alert if a new `code` appears across N users.
- Property-based tests on the catalog.
