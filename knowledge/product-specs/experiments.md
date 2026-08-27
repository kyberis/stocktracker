# experiments

> First-party sticky A/B/C experiments with admin live metrics.

## 1. Summary

Admins (and LLM agents during development) create **draft** multi-variant experiments. When **running**, each authenticated user gets a sticky variant. Live stats in `/admin/experiments` join assignments to `analytics_events` conversion metrics.

## 2. Status

- **Tier:** Admin / Free (assignment applies to all signed-in users)
- **Feature flag:** _none_
- **Health:** green
- **Owning skill:** [`.cursor/skills/engineer-experiments/SKILL.md`](../../.cursor/skills/engineer-experiments/SKILL.md)

## 3. Entry points

| Type | Path | Notes |
|------|------|-------|
| Admin page | `src/app/(app)/admin/experiments/page.tsx` | Draft / launch / pause / reset / live table / Preview |
| Admin preview | `src/app/(app)/admin/experiments/preview/page.tsx` | Force-render treatment UI (client override) |
| Metrics catalog | `src/app/(app)/admin/experiments/metrics/page.tsx` | Documented events usable as conversion metrics |
| Metrics definitions | `src/lib/experiment-metrics-catalog.ts` | Source of truth for catalog copy |
| Preview helper | `src/lib/experiment-preview.ts` | sessionStorage override + URL `exp_preview` sync |
| User API | `GET /api/experiments/[key]` | Resolve + assign when running |
| Admin API | `/api/admin/experiments` | CRUD + status + reset + stats |
| Hook | `src/lib/use-experiment.ts` | Client resolve + CTA track helper |
| DAL | `src/lib/db/experiments.ts` | Assignment hash, stats SQL |
| Script | `scripts/create-experiment.ts` | Seed draft from CLI |
| Consumer | `src/components/EmptyPortfolio.tsx` | Control empty layout (legacy `empty_activation` paused) |
| Consumer | `src/components/homepage/HomeV2Dashboard.tsx` | `warren_first_stock` control vs right-Warren treatment |
| Consumer | `src/components/agent-intro/AgentIntroGate.tsx` | `agent_intro` splash once per local calendar day |

## 4. Data model

- `experiments` — key, status (`draft|running|paused|archived`), `variants_json`, `metrics_json`, `reset_generation`
- `experiment_assignments` — `(experiment_id, user_id)` → `variant`, `assigned_at`

## 5. API surface

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/experiments/[key]` | user | Resolve sticky variant |
| GET/POST | `/api/admin/experiments` | admin | List / create draft |
| GET/PUT | `/api/admin/experiments/[id]` | admin | Detail / edit draft |
| POST | `/api/admin/experiments/[id]/status` | admin | Lifecycle |
| POST | `/api/admin/experiments/[id]/reset` | admin | Clear assignments |
| GET | `/api/admin/experiments/[id]/stats` | admin | Live metrics |

## 6. UI surface

- Admin: `/admin/experiments`
- Admin metrics catalog: `/admin/experiments/metrics` (events that land in `analytics_events`)
- Admin treatment preview: `/admin/experiments/preview?key=…&variant=…` (client-only; no DB assignment)
- Product: empty home via `EmptyPortfolio` (control). Treatment: Warren first-stock on Home (`warren_first_stock`).
- Product: Home agent intro via `AgentIntroGate` (`agent_intro` — convergence / briefing). Plays **once per local calendar day**; navigating around the app does not replay it. Admin Preview always plays.

## 7. Business logic

- Weights must sum to 100; one variant must be `control`
- Non-`running` → return `control`, no assignment
- First touch while `running` → insert assignment + `experiment_exposure`
- Reset bumps `reset_generation` so hash seed changes
- Admin **Preview** sets a sessionStorage override (`trefolio:exp-preview`); `useExperiment` prefers it over the API and `trackExperimentEvent` no-ops for that key

## 8. External dependencies

- None (first-party Turso + existing analytics_events)

## 9. Currency / FX / tax implications

- N/A

## 10. i18n

- Empty activation copy keys remain on `EmptyPortfolio` control. First-stock: `warrenFirstStockGreeting`, `warrenFirstStockExample`, `warrenFirstStockTryExample`.

## 11. Permissions / tier gating / rate limits

- Resolve requires session; admin routes require admin

## 12. Telemetry

- `experiment_exposure` (server on assign)
- Experiment-defined metrics (e.g. `first_stock_activation_shown`, `holding_add`)

## 13. Edge cases & gotchas

- Demo mode forces `control` and skips resolve
- Do not Launch from agent code — leave draft for human
- Boolean feature flags remain separate
- Preview overrides are tab-scoped (sessionStorage) and do not change sticky assignments
- Empty activation moat/screener variants are retired (`empty_activation` paused)
- Current empty experiment: `warren_first_stock` (draft until Launch)
- `agent_intro` treatments persist “shown today” (`YYYY-MM-DD`) so Home does not replay the splash on the same local calendar day
- Experiment conversion metrics must be Turso `analytics_events` names — not `useTrack`/GA-only. Catalog: `src/lib/experiment-metrics-catalog.ts`
- Staff ProdOps Telegram (`/experiments` or NL) reads assignment counts via `listExperimentAssignmentOverview` — aggregates only, no user ids

## 14. Tests

- Unit: `src/lib/db/experiments.test.ts` (hash / weights / validation)
- Unit: `src/lib/experiment-preview.test.ts` (sessionStorage override helper)
- Unit: `src/lib/agent-intro.test.ts` (once-per-day splash skip; `forceVariant` still blocks)

## 15. Related skills and rules

- [engineer-experiments](../../.cursor/skills/engineer-experiments/SKILL.md)
- [analytics-instrumentation](../../.cursor/skills/analytics-instrumentation/SKILL.md)
- [engineer-feature-flags](../../.cursor/skills/engineer-feature-flags/SKILL.md) — booleans only

## 16. Open questions / planned work

- Statistical significance helpers
