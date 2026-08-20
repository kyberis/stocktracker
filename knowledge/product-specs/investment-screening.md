# Investment screening

> Guided flow that turns a sector overexposure into a shortlist of researched candidates, assessed on three independent axes (cheap / portfolio fit / solidity) with supporting methodology checklist evidence.

## 1. Summary

A user who is overexposed to one sector (or who just wants new ideas) opens `/screening`,
answers a short scripted chat about sector, size, P/E, ROIC/leverage and region,
confirms the brief, and gets an HTML research report with up to 5 candidate cards.
Hard Data ranks ~20 equities for deep research (IR / Web / Technicals); the Compiler
selects the final ≤5 with full evidence. Cards that miss the majority of brief filters
list the unmet expectations.

Alternatively, **Analyze** resolves a single ticker/company (+ exchange when
ambiguous) via search, then runs the same research agents on that one listing
(`candidateCount = 1`, Hard Data skips the FMP screener).

## 2. Status

- **Tier:** Experimental (no tier gating yet — flag only)
- **Feature flags:**
  - `investment_screening_enabled` (off by default) — gates UI/API
  - `screening_new_runs_enabled` (on by default) — client mirror of the provider-quota circuit. When off, discovery CTAs hide and new runs/intake are blocked; existing reports stay readable. Auto-tripped on provider 429/quota; resume from Admin → Screening Costs.
  - `screening_pipeline_real_enabled` — Hard Data + Compiler on durable queue
  - `screening_ir_agent_enabled` — Agent 2 IR/Business fan-out (E4)
  - `screening_agents_v2_enabled` — umbrella for E5–E7 (Web & Sentiment, Portfolio Context, Risk); implies IR fan-out for DAG coherence
  - `screening_qa_enabled` — Agent 6 QA / verified reports; gates `reportReady` when on
  - `screening_tavily_research_enabled` — Tavily path for IR Search+Extract (fallback when Serper/Jina is off or misses), shared ticker research cache (7d; **no live Tavily Research** from screening — cache-only), slim analyst Search; off by default
  - `screening_ir_serper_jina_enabled` — prototype IR discovery/extract via Serper Search + Jina EU Reader (HTML/PDF), Tavily Search/Extract fallback; requires `SERPER_API_KEY` + `JINA_API_KEY`; off by default
  - `screening_analyze_force_serper_jina_enabled` — Analyze IR uses Serper + Jina only (no Tavily fallback); off by default
  - `screening_estebaranz_eval_enabled` — post-shortlist `compiler_evaluate` step applies the trefolio value-investing checklist to ≤5 shortlist names; on by default (and in prod). Flag key is historical; product copy always says trefolio.
  - `screening_thesis_pipeline_enabled` — bake-off: shows a **Cribado / Checklist vs Tesis** toggle on `/screening` and intake. Off by default. Off → all runs are checklist. On → the user chooses per run (`pipeline_kind` on `screening_runs`). Thesis requires `screening_pipeline_real_enabled`. Not an A/B experiment (no sticky assignment). Informational only — not investment advice.
  - `screening_dev_lab_enabled` — Dev agent-log button for non-admins
- **Health:** green — Intake (+ sample-conversation pilot) + Hard Data + IR/Web/PC/Risk/Technicals (v2) + optional shortlist Research + Compiler + QA (flag on in prod) + per-run variable cost ledger
- **Owning skill:** [`.cursor/skills/engineer-tools/SKILL.md`](../../.cursor/skills/engineer-tools/SKILL.md)

## 3. Entry points

| Type | Path | Notes |
|------|------|-------|
| Page | `src/app/(app)/screening/page.tsx` | Sector exposure + two CTAs + recent runs list |
| Page | `src/app/(app)/screening/intake/page.tsx` | Scripted chat + brief confirmation |
| Page | `src/app/(app)/screening/runs/[runId]/page.tsx` | Agent timeline; user opens the report via “See report” when ready |
| API | `src/app/api/screening/runs/route.ts` | `GET` list + `POST` create run |
| API | `src/app/api/screening/runs/[runId]/route.ts` | `GET` — status + step progress |
| API | `src/app/api/screening/reports/[reportId]/route.ts` | `GET` — typed report JSON |
| Component | `src/components/screening/ScreeningEntryCta.tsx` | Discovery card on `/recommendations/diversify`; renders nothing when the flag is off |
| Component | `src/components/screening/ScreeningBetaBanner.tsx` | Home (`/`) beta banner; renders nothing when the flag is off |
| Page | `src/app/(app)/admin/screening-costs/page.tsx` | Admin cost leaderboard + provider-quota circuit (pause / resume) |
| API | `src/app/api/admin/screening-provider-circuit/route.ts` | Admin GET/POST: inspect, pause, or resume the provider-quota circuit |
| Page | `src/app/(app)/admin/screening-analyze/page.tsx` | Admin Analyze list: requesting users + IR resources per run |

## 4. Data model

**Persistence (migrations 129–135):**

- `screening_runs` — one row per user launch attempt. Fields: `id`, `user_id`
  (`ON DELETE CASCADE`), `status` (`draft | needs_clarification | rejected_infeasible | authorized | running | completed`),
  `intent` (`rebalance | explore | analyze`), `brief_json` (the confirmed `ScreeningBrief`),
  `pipeline_kind` (`checklist | thesis`, default `checklist`; migration 146),
  `mocked_pipeline` (1 while the research pipeline is fixture), `created_at`,
  `updated_at`.
- `screening_agent_outputs` — one row per agent turn. Fields: `id`, `run_id`
  nullable (Intake turns happen before Launch), `user_id`, `agent_kind`,
  `ticker` (nullable; set for IR fan-out), `agent_index` (nullable),
  `output_json`, `latency_ms`, `created_at`.
- `screening_run_steps` / `screening_run_events` — durable queue + event log
  (migration 130). IR fan-out inserts one step per `(agent_kind, ticker)`.

When `screening_pipeline_real_enabled` is on, run progress comes from DB steps.
Mock ids (`mock-*`) are still persisted as the PK so history deep-links work.
Session-scoped `sessionStorage` (`trefolio-screening-brief-<runId>`) echoes the
brief on the run page.

DAL: [`src/lib/db/screening.ts`](../../src/lib/db/screening.ts) +
[`src/lib/db/screening-steps.ts`](../../src/lib/db/screening-steps.ts).

Types: [`src/lib/screening/schemas.ts`](../../src/lib/screening/schemas.ts) —
`ScreeningBrief` (includes optional `riskProfile`), `ScreeningRun`,
`ScreeningReport`, `ScreeningCandidateCard` (optional sentiment / fit / risk
fields; `sources` are public references with optional excerpts), `HardDataOutput`,
`IrBusinessOutput` / `WebSentimentOutput` (`references`: public IR hub, documents,
and news links — vendor/API hosts stripped), `AggregateIrBusinessOutput`,
`AggregateWebSentimentOutput`, `PortfolioContextOutput`,
`RiskOutput`, `IntakeAgentOutput`. Mirror HLD §5.3.

### Pipeline DAG

When `screening_agents_v2_enabled` is on:

`hard_data` → parallel `ir_business×N` + `web_sentiment×N` + `technicals×N` →
aggregates → `portfolio_context` → `risk` → `compiler` →
optional `shortlist_research` (if `screening_tavily_research_enabled`; cache-only) →
optional `compiler_evaluate` (if `screening_estebaranz_eval_enabled`) →
optional `qa`.

`compiler_evaluate` writes a structured trefolio evaluation (filter verdict,
business, moat, management, financials, growth, valuation, catalysts, risks /
pre-mortem, invalidation, gaps, conviction) per shortlist ticker. Cards prefer
that structured block over the short selection thesis. Hard Data enrichment now
includes multi-year annual series (margins, FCF, ROIC, shares) for grounding.

When v2 is off but `screening_ir_agent_enabled` is on (E4):

`hard_data` → `ir_business×N` → `aggregate_ir_business` → `compiler`.

### Thesis pipeline (bake-off)

Temporary parallel DAG. The checklist agents above are **not** modified.
User chooses mode in the UI (same mode for Explore / Rebalance / Analyze).
Staff uses the same `/screening` toggle — there is no admin-only path.

`thesis_hard_data` → fan-out `thesis_ir` / `thesis_web` / `thesis_technicals`
→ aggregates → `thesis_portfolio` → `thesis_risk` → `thesis_compiler` →
`thesis_evaluate` → `thesis_qa`.

Code lives in [`src/lib/screening/thesis/`](../../src/lib/screening/thesis/).
Shared: orchestrator, `data/` clients, cost ledger, intake chat, `screening_runs`.
Contracts: Fact / SoftAssessment / KillCriterion / Assessment / Thesis draft
(subset of the investment-thesis spec). `GET /api/screening/reports/[id]`
composes `ThesisReport` when `pipeline_kind=thesis`. Verdicts are informational
(never buy/sell/hold). Persistent Thesis objects + kill-criteria monitoring
(spec phases 4–5) are **out of scope**.

Compare by launching the same ticker twice (two `runId`s). Optional wipe:
`npx tsx scripts/wipe-screening-old-reports.ts --dry-run`.

## 5. API surface

| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| POST | `/api/screening/intake/chat` | user + flag | — | One Intake agent turn; returns `{ assistantText, agent, brief }` |
| GET | `/api/screening/runs` | user + flag | — | Recent runs for the entry-page history list |
| POST | `/api/screening/runs` | user + flag | — | Validates + persists the brief; mock or real pipeline. `pipelineKind: thesis` with the thesis flag off → **400** `thesis_pipeline_disabled`. |
| GET | `/api/screening/runs/[runId]` | user + flag | — | Status, steps (IR fan-out synthesised), `progressPct`, `reportReady` |
| GET | `/api/screening/reports/[reportId]?candidates=N` | user + flag | — | Report JSON; 409 while the run is not finished |
| POST | `/api/screening/entry-events` | user + flag | — | Dual-write analytics for the entry funnel |
| GET | `/api/screening/dev/outputs?limit=N&runId=` | user + flag + (admin OR dev-env OR `screening_dev_lab_enabled`) | — | Last N agent outputs (optional `runId` scope); Dev log shows sources + per-agent JSON |
| GET | `/api/admin/screening-costs` | admin | — | All screening runs ranked by `cost_usd` DESC (ops cost leaderboard) |
| GET | `/api/admin/screening-analyze` | admin | — | Analyze runs (newest first) with requesting users, IR resources, downloaded document URLs and excerpts |

Regular routes go through [`requireScreeningAccess`](../../src/lib/screening/guard.ts):
session required, then per-user flag. A disabled flag returns **404**, not 403, so
the feature is not discoverable before launch. The Dev outputs route adds
`requireScreeningDevAccess` on top.

## 6. UI surface

- Pages: `src/app/(app)/screening/**`
- Components: `src/components/screening/` — `ExposureEntry`, `RecentScreensList`,
  `IntakeChat`, `BriefTable`, `RunProgress`, `ScreeningReportView`, `ThesisReportView`,
  `ScreeningPipelineToggle`, `CandidateCard`,
  `CriteriaList`, `ScreeningNotices`, `ScreeningGate`, `ScreeningEntryCta`
- Candidate technicals include a DEGIRO-style 52-week range bar
  ([`FiftyTwoWeekRangeBar`](../../src/components/FiftyTwoWeekRangeBar.tsx)) when
  12m close high/low are present (or can be reconstructed from distance %):
  marker = position of `price` in `[low, high]`, dates under the ends when
  known, footer with 1y return as price variation.
- Inside the Technicals card block,
  [`ScreeningPriceChart`](../../src/components/screening/ScreeningPriceChart.tsx)
  fetches `/api/historical` (lazy on intersect) with period pills
  1W / 1M / 3M / 6M / 1Y / 5Y (5Y = `all` sliced to five years), then the
  52w range bar and scalar metric grid.
- Context consumers: `FeatureFlagProvider` (gate), `PortfolioProvider` (real sector
  weights on the entry page), `I18nProvider` (language selection for screening copy)

## 7. Business logic

- Sector weights reuse `computeSectorPercentsForRecommendations` and
  `pickUnderweightSectors` from
  [`src/lib/homepage/build-portfolio-recommendations.ts`](../../src/lib/homepage/build-portfolio-recommendations.ts).
  The overexposure threshold is `REC_THRESHOLDS.topSectorPct` (25%, same healthy
  ceiling as Portfolio Score), shared with home recommendations so those surfaces
  agree on what "overexposed" means.
- [`criteria.ts`](../../src/lib/screening/criteria.ts) — canonical registry of the nine
  methodology criteria. Reports persist numeric ids; the UI always resolves them to a
  name plus what the criterion measures. `macroContext` is informative, which is why
  the score denominator is 8.
- [`scoring/checklist.ts`](../../src/lib/screening/scoring/checklist.ts) — deterministic
  pass/fail for the 8 scored criteria (supporting methodology evidence, not the
  product headline). Key thresholds:
  - **1 Relative valuation** — usable P/E in `(0, 18)`. Prefer forward P/E; when TTM
    earnings quality is suspect (EPS/margin jump vs latest FY), score on normalised
    FY P/E and never pass on a depressed TTM-only multiple.
  - **2 Price–fundamentals divergence** — consensus upside ≥10% **and** 1y return
    ≤ −10% **and** latest revenue growth improving (≥3%). Flat/deteriorating
    fundamentals with a weak price fail (not “cheap vs target” alone).
  - **5 Balance sheet** — pass if net cash or ND/EBITDA &lt; 2.5; **fail** when
    ND/EBITDA ≥ 2.5 (unknown only when the ratio is missing).
- [`scoring/categories.ts`](../../src/lib/screening/scoring/categories.ts) — **primary
  card evaluation** (replaces headline score/8 + Strong/Watch):
  - **Cheap?** — `cheap` / `fair` / `expensive` / `unknown` from current PE
    (fwd → normalised when quality suspect → TTM) vs multi-year average annual PE
    from FMP `ratios` (fallback: TTM as hist). Relative ±15% band; absolute
    &lt;15 / ≥25 extremes. Never label `cheap` on depressed TTM-only when quality
    is suspect.
  - **Portfolio fit?** — reuses Risk agent `fit` / `stretch` / `poor_fit`.
  - **Solidity** — from cached trefolio MOAT %: ≥70 solid, ≥50 moderate, else weak
    when a score exists. Cards can deep-link to `/analisis/[ticker]?tab=evaluation`.
  - Axes are independent: solid + good fit + expensive is a valid outcome (no
    composite downgrade).
- [`ensure-categories.ts`](../../src/lib/screening/ensure-categories.ts) —
  backfills `categories` (+ comparison labels) on report read for legacy cards
  that still carry score/verdict only. Applied in compose, mock fixture serve,
  and `ScreeningReportView`.
- [`intake-script.ts`](../../src/lib/screening/intake-script.ts) — deterministic question
  script; each option declares the brief patch it applies. Explain entries may include
  optional `higher` / `lower` tips. Brief row tips live in `copy.intake.rowHelp` and power
  the left-hand metric guide + ⓘ tooltips on `/screening/intake` (desktop aside; mobile
  keeps the collapsible explain/brief).
- [`brief-state.ts`](../../src/lib/screening/brief-state.ts) — patch application, preset
  fill on early exit (returns what it assumed so the chat can say it), row ordering,
  and the POST payload.
- [`mock-pipeline.ts`](../../src/lib/screening/mock-pipeline.ts) — E0 progress derivation
  and the fixture, parsed with `screeningReportSchema` so fixture drift fails loudly.

## 8. External dependencies

- **Vercel AI Gateway** — Intake + research agents use
  `fetchGatewayChatCompletions`. Prompts live under
  [`src/lib/screening/prompts/`](../../src/lib/screening/prompts/).
  Post-parse sanity limits in
  [`src/lib/screening/rules/sanity-limits.ts`](../../src/lib/screening/rules/sanity-limits.ts)
  reject nonsense ranges even if the model returns valid JSON.
- **FMP** — Hard Data universe + ratios-ttm/profile enrichment for card multiples
  + IR/Web evidence bundles (`FMP_API_KEY`).
- **trefolio MOAT + /analisis cache** — Hard Data ranking context and
  `flags.moatScore` / business summary on cards. MOAT: read `moat_cache`; on
  shortlist miss, generate via `evaluateMoat` + `upsertMoatCache` (ops path,
  no user `stock_evaluation` quota). Analysis summary remains cache-only.
  Solidity category = MOAT bands when present, else ND/EBITDA / net cash; UI
  always complements with leverage/cash when available.
- **Tavily Search** — Web & Sentiment agent + IR hub/doc discovery fallback (`TAVILY_API_KEY`).
  If unset, agents continue with FMP-only evidence (no hard failure). Queries send
  ticker + company name only. Accrues into per-run `cost_usd` (1 credit basic /
  2 advanced). AID and `/analisis` also use Tavily Search (unchanged).
- **Tavily Extract** — IR / Business agent (`screening_tavily_research_enabled`,
  or as fallback when `screening_ir_serper_jina_enabled` misses a URL):
  after Search finds the official IR hub and recent earnings/IR documents
  (**PDFs included**; PPT/XLS/ZIP skipped), `POST /extract` pulls guidance-relevant
  excerpts (≤3 URLs). PDFs use advanced extract of the full document (no query
  chunks). HTML hub still uses query chunks, with an advanced retry if empty.
  Primary IR evidence ahead of FMP news/transcript. Secondary listings (e.g.
  `W9C.MU`) are mapped to the FMP primary (`CSU.TO`) for transcripts/news and
  IR search; the card keeps the ticker the user picked.
- **Serper + Jina (IR prototype)** — optional (`screening_ir_serper_jina_enabled`):
  two Serper searches (IR hub + earnings/MD&A/PDF) then Jina EU Reader extract
  per URL (HTML ≤4k, PDF ≤12k, no chunks). Empty Serper results fall back to
  Tavily Search; a Jina failure on a URL falls back to Tavily Extract for that
  URL only. Web & Sentiment, AID, and `/analisis` stay on Tavily. Step payload
  records `provider` (`serper_jina` / `tavily` / `mixed`) plus `serperQueries` /
  `jinaUrls`. No new cost-ledger USD fields in this prototype; Tavily fallback
  still accrues Extract credits.
- **Analyze force Serper + Jina** — optional
  (`screening_analyze_force_serper_jina_enabled`): Analyze IR skips Tavily
  Search/Extract entirely. Serper hits that fail the usual IR score still go to
  Jina (blocked hosts skipped). Explore/shortlist keep the prototype fallback.
- **Tavily Research** — cache-only in screening (`cacheOnly: true` on IR thin-FMP
  fallback and shortlist deep-dive). Live `POST /research` is not called from
  screening (PAYG 433). Hits in `screening_research_cache` (TTL 7d, cross-user)
  still feed IR fallback and skip the Web & Sentiment `analyst rating` Search.
  Same API key; fail-open.
- **Per-report variable cost** — `screening_runs.cost_usd` + `cost_json` breakdown
  (LLM tokens + Tavily Search/Extract/Research only; **FMP excluded** as fixed
  plan cost). Exposed on `GET /api/screening/reports/[reportId]` as `cost`
  (ops-facing; shown on the report UI for admins). Soft budget alert at `$1.20`
  via `screening_cost_budget_exceeded_total`. Admin leaderboard at
  `/admin/screening-costs` (`GET /api/admin/screening-costs`) ranks every run
  from most to least expensive. Analyze ops list at `/admin/screening-analyze`
  (`GET /api/admin/screening-analyze`) shows who requested each Analyze, which
  IR resources ran (Serper queries, Jina URLs, Tavily credits, LLM), and the
  downloaded IR hub/document URLs plus extracted excerpts (expand a row).
  Runs finished before this capture only have LLM-cited sources from agent output.
- Every AI turn writes an `ai_logs` row (sources such as `screening_intake`,
  `screening_hard_data`, `screening_web_sentiment`, …) plus a row in
  `screening_agent_outputs`.

## 9. Currency / FX / tax implications

Candidate prices and market caps are displayed in the card's own currency
(`card.currency`, `mktCapUsd`), not converted to the user's display currency. Portfolio
sector weights on the entry page are EUR-based, from the shared helper.

## 10. i18n

Screening copy lives in [`src/lib/screening/copy.ts`](../../src/lib/screening/copy.ts),
**not** in `src/locales/`: ~150 strings of methodology and metric explanations that
would need machine translation across 35 locale files to satisfy the parity test.
English is the base, Spanish is complete, every other language falls back to English.
**Move into `src/locales/` when the flag reaches 100%.**

The fixture report remains available when `screening_pipeline_real_enabled` is off
(dev / flag-off path). Production beta uses the real pipeline; the UI no longer
surfaces mock badges or entry-state preview switchers.

## 11. Permissions / tier gating / rate limits

- Feature flag `investment_screening_enabled` still gates UI/API access.
- Per-user quota key `investment_screening` in `FEATURE_QUOTAS`: **3 runs per ISO week**
  (UTC) for Free and Pro. Consumed on `POST /api/screening/runs`.
- **Admins** bypass the quota (`requireFeatureQuota` / `session.role === "admin"`).
- Exhausted quota returns HTTP 429 with `reason: "quota_exceeded"`.

## 12. Telemetry

Dual-write on the entry screen (`/screening`), home beta banner, and diversify discovery CTA:

| Event | When | Metadata |
|-------|------|----------|
| `screening_discovery_opened` | Home banner or diversify CTA click | `source` (`home` \| `diversify`) |
| `screening_entry_viewed` | Entry ready (once per variant) | `variant`, `preview` (`live`), optional `top_sector` / `top_pct` |
| `screening_entry_cta_clicked` | Explore / Rebalance / Analyze click | `intent`, `variant`, `preview`, `primary` |
| `screening_entry_back_home` | Back home | `variant`, `preview` |

- **GA4:** `useTrack()` (consent-gated).
- **First-party:** `POST /api/screening/entry-events` → `trackEvent` → `analytics_events`; Prometheus via `src/lib/screening/metrics.ts`.
- **Admin:** Screening entry block in analytics.

Later funnel (intake): `screening_intake_ended_early` (`intent`, `filled`),
`screening_intake_turn` (`intent`, `status`, `fromChip`),
`screening_intake_rejected` (`intent`),
`screening_run_created` (`intent`, `endedEarly`) — GA only today.
API routes wrapped in `withMetrics`. Prometheus adds
`screening_intake_turns_total{status,intent}`,
`screening_intake_latency_ms{status}`, and
`screening_runs_created_total{intent,mocked}` via
[`src/lib/screening/metrics.ts`](../../src/lib/screening/metrics.ts).

## 13. Edge cases & gotchas

- **Empty portfolio** — no sector rows; the entry page falls back to "we could not read
  sector weights" and both CTAs still work.
- **No overexposure** — the title switches to "look for new candidates" and the rebalance
  card still offers the two lowest-weight sectors.
- **Early exit** — the chat reports how many criteria the preset filled and which ones;
  answers already given are never overwritten.
- **Candidate count** — asking for 3 trims cards, comparison rows and priority order
  together, so the report never shows orphan rows.
- **Report before ready** — 409 with the run payload.
- **Demo mode** — not wired into `/demo`; the flow is authenticated-only.
- **External links** — always `target="_blank" rel="noopener noreferrer"` with a `↗`
  mark and a note that they leave trefolio. Company website / IR chips come from
  provider fields or a deterministic resolver, never from the model.
- **Report references** — each card lists public IR pages, downloaded documents,
  and news links (title, date, short excerpt) under **References**. Built from
  fetched IR docs + news hits, plus LLM-cited URLs after a public-host filter.
  Search/extract vendor names, API hosts, and error codes never appear on the
  report. Runs finished before this persist only have LLM-cited sources.

## 14. Tests

- [`src/lib/screening/__tests__/screening-contract.test.ts`](../../src/lib/screening/__tests__/screening-contract.test.ts)
  — fixture parses against the shared schema, criterion ids exist in the registry,
  scores stay within the ceiling, run progress advances and completes, brief preset
  fill and row ordering, intake script has no unresolved placeholders in either language.
- [`src/lib/screening/__tests__/pipeline-kind.test.ts`](../../src/lib/screening/__tests__/pipeline-kind.test.ts)
  — thesis flag off forces checklist; POST `pipelineKind: thesis` with flag off is 400.
- [`src/lib/screening/thesis/`](../../src/lib/screening/thesis/) unit tests — facts provenance,
  gate fail → `watchlist_gate_failed`, kill_criteria field ids, no buy/sell, compose, QA
  (soft score without quote is blocking).

## 15. Provider quota circuit

When FMP, Tavily, Serper, Jina, or OpenAI return 429 / explicit quota during
screening, `tripScreeningProviderCircuit` pauses **new** screens only:

- Source of truth: `platform_settings.screening_provider_circuit`
- Client mirror: `screening_new_runs_enabled` (CTAs hide)
- `POST /api/screening/runs` and `POST /api/screening/intake/chat` return `503`
  with `code: screening_provider_paused`
- `GET` runs/reports and `/screening` recent-list stay available
- ProdOps event `screening_provider_quota` alerts Telegram (deduped per open
  generation)
- Admin verifies and resumes from `/admin/screening-costs` (manual pause too)

Helpers: [`src/lib/screening/provider-circuit.ts`](../../src/lib/screening/provider-circuit.ts).

## 16. Related skills and rules

- Rules: [`.cursor/rules/legal-compliance.mdc`](../../.cursor/rules/legal-compliance.mdc),
  [`.cursor/rules/release-notes.mdc`](../../.cursor/rules/release-notes.mdc)
- Design docs: [`docs/HLD_INVESTMENT_SCREENING_AGENTS.md`](../../docs/HLD_INVESTMENT_SCREENING_AGENTS.md),
  [`docs/PRD_INVESTMENT_SCREENING_AGENTS_FEASIBLE.md`](../../docs/PRD_INVESTMENT_SCREENING_AGENTS_FEASIBLE.md)
- Mock reference: `public/mockups/screening-e2e-v1.html`

## 17. Open questions / planned work

- **E5–E7 shipped (flag-gated)** — Web & Sentiment (FMP + Tavily), Portfolio
  Context, and Risk & Suitability behind `screening_agents_v2_enabled`. Intake
  collects optional `riskProfile` (defaults to balanced on early exit).
- **QA agent** — shipped behind `screening_qa_enabled` (on in prod). After Compiler,
  Layer A + Layer B verify the report; `reportReady` waits for pass /
  `pass_with_degradation`. Retries flagged agents up to 2 rounds. Layer B R6
  date claims are filtered when Layer A already covered them or `guidance.asOf`
  is within the valid window; report UI shows plain-language verification notes
  (no internal rule codes).
- **Intake sample pilot** — CTA on `/screening/intake` sends curated user replies
  through the real Intake agent; the user still confirms and presses Run.
- Discoverability beyond `/recommendations/diversify` (tools hub entry needs locale
  keys in all 35 files).
- **Thesis vs checklist bake-off** — flag `screening_thesis_pipeline_enabled` (off).
  User picks Cribado vs Tesis on `/screening`; one pipeline will be turned off
  after a sample (AAPL, KO, NVDA, small-cap) shows a falsifiable statement,
  ≥1 kill criterion bound to a Fact (or an explicit gap), 0 soft scores without
  a quote, and §10.5 verdicts. No localStorage persistence of the mode.
- **F5 (guidance promised vs delivered)** — not in the bake-off. Probe
  2026-08-20: `earnings`, `analyst-estimates`, and `key-metrics` are on-plan;
  `earning-call-transcript` and `etf/holdings` return 402 (plan). Earnings
  surprise is consensus, not company guidance. Do not invent F5 from ROE or
  from soft “management quality”. Next slice: either upgrade FMP for
  transcripts, or extract promised vs delivered from IR filings we already
  fetch (`ir-site-docs`), 8–12 quarters. Re-run
  `npx tsx scripts/probe-fmp-thesis-endpoints.ts` after a plan change.
- **Temporary:** the `Dev — agent log` floating button on `/screening`
  ships behind admin role / dev env / `screening_dev_lab_enabled`. Remove when
  the Dev Lab at `/tools/screening/jobs/...` (E1 formal) lands.
