# Investment screening

> Guided flow that turns a sector overexposure into a shortlist of researched candidates, scored with the trefolio methodology.

## 1. Summary

A user who is overexposed to one sector (or who just wants new ideas) opens `/screening`,
answers a short scripted chat about size, valuation, quality, growth and region,
confirms the resulting brief, and gets an HTML research report with 3–5 candidate
cards. **Stage E0: the report is a typed fixture.** Real agents and market data
arrive stage by stage per
[`docs/PRD_INVESTMENT_SCREENING_AGENTS_FEASIBLE.md`](../../docs/PRD_INVESTMENT_SCREENING_AGENTS_FEASIBLE.md) §13.

## 2. Status

- **Tier:** Experimental (no tier gating yet — flag only)
- **Feature flags:**
  - `investment_screening_enabled` (off by default) — gates UI/API
  - `screening_pipeline_real_enabled` — Hard Data + Compiler on durable queue
  - `screening_ir_agent_enabled` — Agent 2 IR/Business fan-out (E4)
- **Health:** yellow — Intake + Hard Data + IR (opt-in) + Compiler stub; Web/Risk/QA pending
- **Owning skill:** [`.cursor/skills/engineer-tools/SKILL.md`](../../.cursor/skills/engineer-tools/SKILL.md)

## 3. Entry points

| Type | Path | Notes |
|------|------|-------|
| Page | `src/app/(app)/screening/page.tsx` | Sector exposure + two CTAs + recent runs list |
| Page | `src/app/(app)/screening/intake/page.tsx` | Scripted chat + brief confirmation |
| Page | `src/app/(app)/screening/runs/[runId]/page.tsx` | Run progress, then the report |
| API | `src/app/api/screening/runs/route.ts` | `GET` list + `POST` create run |
| API | `src/app/api/screening/runs/[runId]/route.ts` | `GET` — status + step progress |
| API | `src/app/api/screening/reports/[reportId]/route.ts` | `GET` — typed report JSON |
| Component | `src/components/screening/ScreeningEntryCta.tsx` | Discovery card on `/recommendations/diversify`; renders nothing when the flag is off |

## 4. Data model

**Persistence (migrations 129–131):**

- `screening_runs` — one row per user launch attempt. Fields: `id`, `user_id`
  (`ON DELETE CASCADE`), `status` (`draft | needs_clarification | rejected_infeasible | authorized | running | completed`),
  `intent` (`rebalance | explore`), `brief_json` (the confirmed `ScreeningBrief`),
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
`ScreeningBrief`, `ScreeningRun`, `ScreeningReport`, `ScreeningCandidateCard`,
`HardDataOutput`, `IrBusinessOutput`, `AggregateIrBusinessOutput`,
`IntakeAgentOutput`. Mirror HLD §5.3.

## 5. API surface

| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| POST | `/api/screening/intake/chat` | user + flag | — | One Intake agent turn; returns `{ assistantText, agent, brief }` |
| GET | `/api/screening/runs` | user + flag | — | Recent runs for the entry-page history list |
| POST | `/api/screening/runs` | user + flag | — | Validates + persists the brief; mock or real pipeline |
| GET | `/api/screening/runs/[runId]` | user + flag | — | Status, steps (IR fan-out synthesised), `progressPct`, `reportReady` |
| GET | `/api/screening/reports/[reportId]?candidates=N` | user + flag | — | Report JSON; 409 while the run is not finished |
| POST | `/api/screening/entry-events` | user + flag | — | Dual-write analytics for the entry funnel |
| GET | `/api/screening/dev/outputs?limit=N` | user + flag + (admin OR dev-env OR `screening_dev_lab_enabled`) | — | Last N agent outputs for the caller; powers the temporary Dev log button |

Regular routes go through [`requireScreeningAccess`](../../src/lib/screening/guard.ts):
session required, then per-user flag. A disabled flag returns **404**, not 403, so
the feature is not discoverable before launch. The Dev outputs route adds
`requireScreeningDevAccess` on top.

## 6. UI surface

- Pages: `src/app/(app)/screening/**`
- Components: `src/components/screening/` — `ExposureEntry`, `RecentScreensList`,
  `IntakeChat`, `BriefTable`, `RunProgress`, `ScreeningReportView`, `CandidateCard`,
  `CriteriaList`, `ScreeningNotices`, `ScreeningGate`, `ScreeningEntryCta`
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
- [`intake-script.ts`](../../src/lib/screening/intake-script.ts) — deterministic question
  script; each option declares the brief patch it applies.
- [`brief-state.ts`](../../src/lib/screening/brief-state.ts) — patch application, preset
  fill on early exit (returns what it assumed so the chat can say it), row ordering,
  and the POST payload.
- [`mock-pipeline.ts`](../../src/lib/screening/mock-pipeline.ts) — E0 progress derivation
  and the fixture, parsed with `screeningReportSchema` so fixture drift fails loudly.

## 8. External dependencies

- **Vercel AI Gateway** — the Intake agent uses the same
  `fetchGatewayChatCompletions` path Warren does. Model resolved via
  `resolveAiModelForUserPlan("portfolio_chat", plan)`. Prompt lives in
  [`src/lib/screening/prompts/intake.ts`](../../src/lib/screening/prompts/intake.ts).
  Post-parse sanity limits in
  [`src/lib/screening/rules/sanity-limits.ts`](../../src/lib/screening/rules/sanity-limits.ts)
  reject nonsense ranges even if the model returns valid JSON. No market data
  provider is called in this slice — feasibility count via FMP is deferred until
  a stable `data/fmp-screening.ts` exists.
- Every AI turn writes an `ai_logs` row (`source = "screening_intake"`) plus a
  row in `screening_agent_outputs`.

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

The fixture report is Spanish; when the UI language differs, the report shows a notice
saying only the sample content is affected.

## 11. Permissions / tier gating / rate limits

Flag only. No `SubscriptionFeature` key, no rate limit, no credit cost yet — pricing
is a separate PRD (stage EC).

## 12. Telemetry

Dual-write on the entry screen (`/screening`) and diversify discovery CTA:

| Event | When | Metadata |
|-------|------|----------|
| `screening_discovery_opened` | Diversify CTA click | `source` |
| `screening_entry_viewed` | Entry ready (once per variant) | `variant`, `preview`, optional `top_sector` / `top_pct` |
| `screening_entry_cta_clicked` | Explore / Rebalance click | `intent`, `variant`, `preview`, `primary` |
| `screening_entry_back_home` | Back home | `variant`, `preview` |

- **GA4:** `useTrack()` (consent-gated).
- **First-party:** `POST /api/screening/entry-events` → `trackEvent` → `analytics_events`; Prometheus via `src/lib/screening/metrics.ts`.
- **Admin:** Screening entry block in analytics (live vs fixture).

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
  mark and a note that they leave trefolio. Links come from provider fields or a
  deterministic resolver, never from the model.

## 14. Tests

- [`src/lib/screening/__tests__/screening-contract.test.ts`](../../src/lib/screening/__tests__/screening-contract.test.ts)
  — fixture parses against the shared schema, criterion ids exist in the registry,
  scores stay within the ceiling, run progress advances and completes, brief preset
  fill and row ordering, intake script has no unresolved placeholders in either language.
- Manual smoke: enable the flag, `/screening` → rebalance → answer through → run →
  report renders in ~15s.

## 15. Related skills and rules

- Rules: [`.cursor/rules/legal-compliance.mdc`](../../.cursor/rules/legal-compliance.mdc),
  [`.cursor/rules/release-notes.mdc`](../../.cursor/rules/release-notes.mdc)
- Design docs: [`docs/HLD_INVESTMENT_SCREENING_AGENTS.md`](../../docs/HLD_INVESTMENT_SCREENING_AGENTS.md),
  [`docs/PRD_INVESTMENT_SCREENING_AGENTS_FEASIBLE.md`](../../docs/PRD_INVESTMENT_SCREENING_AGENTS_FEASIBLE.md)
- Mock reference: `public/mockups/screening-e2e-v1.html`

## 16. Open questions / planned work

- **E1** — `screening_runs` + `screening_agent_outputs` shipped (migration 129);
  research pipeline is still fixture-driven (`mocked_pipeline=1`). Next: a worker
  stub that consumes the run row and drops `mock-pipeline.ts` progress derivation.
- **E2+** — one agent per stage behind the same endpoints; Intake is real, the
  other five agents (Hard Data, IR, Web, Portfolio Context, QA) are still mocked.
- Legal: briefs are now persisted (`brief_json`). Same OpenAI dependency as
  Warren, already disclosed in Privacy Policy §5 — no new data category surfaces
  outside trefolio. If the feature reaches GA, add a dedicated "screening
  criteria" line to the Privacy Policy data table.
- Discoverability beyond `/recommendations/diversify` (tools hub entry needs locale
  keys in all 35 files).
- Report history (`GET /api/screening/reports`) and feedback endpoints from HLD §6.1
  are not built yet.
- **Temporary:** the `Dev — agent log` floating button on `/screening/intake`
  ships behind admin role / dev env / `screening_dev_lab_enabled`. Remove when
  the Dev Lab at `/tools/screening/jobs/...` (E1 formal) lands.
