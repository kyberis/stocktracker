# Unify `/stock/[ticker]` into `/analisis/[ticker]`

- **Status:** active
- **Owner:** agent
- **Started:** 2026-08-01
- **Target:** TBD

## Goal

Make `/analisis/[ticker]` the single canonical stock detail page for the whole
site, replacing `/stock/[ticker]` (+ `/intelligence`, `/evaluation`
sub-routes). Content organized into a left-side vertical tab rail (Yahoo
Finance quote-page style), with exchange + portfolio-holding awareness added
to `/analisis`. The homepage stock-list click gets a slimmed-down "minimal
info + CTA" preview on both desktop and mobile, replacing today's heavy
`StockDetailDrawer`. Supersedes the "Optional deep-link from `/stock/[ticker]`
into `/analisis/[ticker]`" follow-up in
[`company-analysis.md`](company-analysis.md).

## Acceptance criteria

- [x] Phase 1 — `/analisis/[ticker]` gains `?exchange=` + holding lookup, new
      4-tab rail (Summary / Fundamentals / Intelligence / Valuation & Moat),
      `StockDetail`/`StockIntelligence`/`StockEvaluation` gain an `embedded`
      prop, lazy-mount-once tab panels (no refetch on tab switch)
- [~] Phase 2 (partial) — dropped the raw insider-transactions list from
      `InsidersFlowPanel` (same FMP `getInsiderTransactions` source as
      `StockIntelligence`'s Insider Transactions sub-tab; verified via
      `build-report.ts` vs `/api/intelligence/route.ts`), kept the unique
      `narrative.insiderReading` AI note + congress trading (no legacy
      equivalent). Still open: dedupe `StockDetail`'s internal financials/
      earnings/holdings pill-tabs and `StockIntelligence`'s internal news/
      insider/institutional/transcript pill-tabs into the outer rail.
      **`CompanyAnalysisChart.tsx` is NOT being retired** — it's a TradingView
      widget embed (interactive, weekly candles, 24M range), not a lesser
      version of `StockChart.tsx` (a simple Recharts area chart with
      purchase-price overlay). The original plan's "StockChart is strictly
      more capable" claim was wrong — only discovered by reading the file.
      Both stay: TradingView chart for research (Summary tab), `StockChart`
      for position tracking (Fundamentals tab, via embedded `StockDetail`).
- [ ] Phase 3 — `/stock/[ticker]*` become redirects to
      `/analisis/[ticker]?tab=...`; ~12 internal call sites updated to link
      directly to `/analisis`
- [ ] Phase 4 — homepage preview: new slim `StockGlanceDrawer` (desktop) and
      `StockGlanceSheet` (mobile bottom sheet), replacing `StockDetailDrawer`
      on the row-click path; trade/edit actions moved behind an explicit
      "Edit position" action

## Decisions log

- 2026-08-01: Left-side vertical tab rail (not horizontal pills, the app's
  existing convention) — explicit user ask, modeled on Yahoo Finance.
- 2026-08-01: Homepage preview slims down to glance info + CTA; trade/edit
  moves out of the default preview. Mobile gets the same preview treatment
  instead of today's direct-to-full-page jump.
- 2026-08-01: Legacy `/stock/[ticker]*` redirect (start 307, promote to
  permanent 308 after Phase 3 verification) rather than staying live
  indefinitely; internal call sites updated in the same phase to skip the
  redirect hop.
- 2026-08-01 (Phase 1 build): first draft split `/analisis`-native content
  across 4 outer tabs (summary/news/analysis/insiders) *in addition to*
  mounting `StockIntelligence`/`StockEvaluation` wholesale — this put news,
  insider trading, and AI narrative in two places in the top-level nav
  (caught via reviewer pass before merging). Fixed by collapsing to 4 tabs
  with strict single ownership per data type: all `/analisis`-native panels
  (chart, AI narrative, quarterly guidance, news, insider+congress flow) live
  under one "Summary" tab; `Fundamentals`/`Intelligence`/`Valuation & Moat`
  each mount one legacy component wholesale with zero content overlap.
  Phase 2's pill-tab dedup starts from this clean baseline.

## Risks

- `StockDetail`/`StockIntelligence`/`StockEvaluation` are large (800–1400
  lines) with their own internal pill-tab systems; Phase 1 mounts them
  wholesale (nested tabs inside a tab) rather than fragmenting them —
  intentional, deferred to Phase 2, not a defect.
- No browser QA performed on Phase 1: local dev login/signup return
  `410 (moved to user.trefolio.com)` since IDP_* env vars are configured,
  routing auth through the external accounts submodule (not running
  locally). Verified via `tsc`, `eslint`, and unit tests only — needs a
  manual pass by someone with real credentials before Phase 2 builds
  further on top.
- Redirect promotion (307 → 308) needs a live-traffic monitoring window in
  Phase 3 before it's safe — 308s are aggressively browser-cached.

## Follow-ups

- Consider sharing glance-data computation (`StockGlanceDrawer` /
  `StockGlanceSheet`) via a `useStockGlanceData(holding)` hook once both
  exist (Phase 4 nice-to-have, not a blocker).
- Opening this page to anonymous visitors is tracked separately in
  [`public-analisis-access.md`](public-analisis-access.md) (built on top of
  Phase 1-2's 4-tab shell, on `feat/public-analisis`).
- Full plan detail: `/Users/mcsuarez/.claude/plans/fuzzy-hatching-fairy.md`
  (local Claude plan-mode artifact, not in-repo).
