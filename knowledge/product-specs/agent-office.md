# Agent Office

> Trefolio Pro workspace where Warren, Clara, and Will coordinate visible multi-step missions with per-agent confirmation.

## 1. Summary

Signed-in Trefolio Pro users open `/office` to chat with Warren, who may consult Clara (savings) and Will (notes) and propose persisted missions. Each mission step requires explicit Confirm in the UI; nothing executes without approval. Free users see a blurred static preview and paywall.

## 2. Status

- **Tier:** Trefolio Pro (`plan === "pro"`)
- **Feature flag:** _none_
- **Health:** green (Clara/Will internal APIs shipped; dev stubs when URLs unset)
- **Owning skill:** _dashboard + integrations_

## 3. Entry points

| Type | Path | Notes |
|------|------|-------|
| Page | `src/app/(app)/office/page.tsx` | Pro gate client-side + API |
| API | `src/app/api/office/bootstrap/route.ts` | Load messages + missions |
| API | `src/app/api/office/chat/route.ts` | NDJSON orchestration stream |
| API | `src/app/api/office/missions/[id]/steps/[step]/confirm` | Confirm step |
| API | `src/app/api/office/missions/[id]/steps/[step]/skip` | Skip step |
| API | `src/app/api/office/missions/[id]/cancel` | Cancel mission |
| Component | `src/components/office/OfficeExperienceLive.tsx` | Live UI |
| Component | `src/components/office/OfficeExperience.tsx` | Preview vs live switch |
| Telegram | `/office` in `src/lib/telegram/handler.ts` | Mission summary + link |

## 4. Data model

- `agent_missions` — `id`, `user_id`, `title`, `description`, `status`, `steps_json`, timestamps (migration v113).
- `agent_office_messages` — chat log (`role`: user | warren | clara | will).
- DAL: `src/lib/db/agent-office.ts`.
- Mission/step types: `src/lib/ai/office/types.ts`.

## 5. API surface

| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| GET | `/api/office/bootstrap` | session | Pro | Messages + active missions |
| POST | `/api/office/chat` | session | Pro | Stream orchestration (NDJSON) |
| POST | `/api/office/missions/:id/steps/:step/confirm` | session | Pro | Execute step |
| POST | `/api/office/missions/:id/steps/:step/skip` | session | Pro | Skip step |
| POST | `/api/office/missions/:id/cancel` | session | Pro | Cancel mission |

Guard: `requireTrefolioPro` in `src/lib/auth/guards.ts`.

## 6. UI surface

- Landing feature block + CTA → `/office` (`src/app/landing/page.tsx`).
- Nav rail entry with Pro badge (`src/lib/app-nav.ts`).
- Paywall uses `resolveIdpUpgradeHref({ feature: "office" })`.
- Do not confuse with the public marketing hub at [`/studio`](studio-hub.md) (five-agent studio story for investors/partners).

## 7. Business logic

- Orchestrator: `src/lib/ai/office/orchestrator.ts` — **unified Warren AI** (`runWarrenTurn` + sister-app tools) for all chat except explicit multi-agent **mission** prompts; mission board for coordinated Clara→Warren→Will steps.
- Sister-app tools live in `src/lib/ai/warren/sister-agent-tools.ts` and are shared with the dashboard Warren drawer and Telegram.
- Step dispatch: `src/lib/ai/office/dispatch-step.ts` — Clara release, Warren cash entry, Will note (stubs when sister apps down).
- Gap analysis: `src/lib/ai/office/analyze-gaps.ts`.

## 8. External dependencies

- `CLARA_BASE_URL` + `GET/POST /api/internal/office/*` (Bearer `IDP_SERVICE_TOKEN`, body/query: `sub`, `email`, `trefolioUserId`).
- `WILL_BASE_URL` + `POST /api/internal/office/search-notes`, `log-note` (same identity payload).
- Identity resolution: `src/lib/ai/office/office-identity.ts` — resolves `idp_sub` via IdP import-by-email when missing locally.
- Dev stubs when URLs unset in `NODE_ENV=development`.

### Sister-app internal routes (REST, not MCP)

Warren calls Clara/Will via **`/api/internal/office/*`** with `IDP_SERVICE_TOKEN`. This is intentional: MCP is for external AI clients with user PATs; Office is server-to-server orchestration with explicit identity (`sub`, `email`, `trefolioUserId`). Sister routes delegate to the same domain layer as MCP tools (`savings.ts`, `notes/persistence.ts`).

| App | Route | Implementation |
|-----|-------|----------------|
| Clara | `GET /api/internal/office/savings-summary` | `external/etracker/src/app/api/internal/office/savings-summary/route.ts` |
| Clara | `POST /api/internal/office/propose-release` | `external/etracker/src/app/api/internal/office/propose-release/route.ts` |
| trefolio | `POST /api/internal/office/warren-chat` | `src/app/api/internal/office/warren-chat/route.ts` — Clara asks Warren; `billingSource: "clara"` skips `ai_consult`; prefetches Clara cashflow snapshot into Warren's prompt (no `consultClaraSavings` loop) |
| Will | `POST /api/internal/office/search-notes` | `external/notetaker/src/app/api/internal/office/search-notes/route.ts` |
| Will | `POST /api/internal/office/log-note` | `external/notetaker/src/app/api/internal/office/log-note/route.ts` |

## 9. Currency / FX / tax implications

- Amounts in EUR in orchestration display; Warren cash step writes `amount_eur` via `addCashEntry`.

## 10. i18n

- Keys `office*` and `landingFeatureOffice*` in `src/locales/en.ts`, `src/locales/es.ts`.

## 11. Permissions / tier gating / rate limits

- Client: `OfficePageClient` checks `user.plan === "pro"`.
- Server: `requireTrefolioPro` / `requireTrefolioProByUserId`.
- No separate AI quota (orchestration is rule-based, not LLM-heavy in v1).

## 12. Telemetry

- Paywall: `paywall_shown` with `feature: "office"`.
- Landing: `landing_cta_click` with `cta: "feature_office"`.

## 13. Edge cases & gotchas

- One active mission shown on the board; new mission-intent messages can create another while the previous stays active.
- Unrecognized messages run full Warren AI (`runWarrenTurn`, channel `office`) — **same tools as the dashboard drawer**, including `consultClaraSavings`, `searchWillNotes`, `logWillNote`, moat/screener, and cards. Counts against `ai_consult` quota.
- Clara/Will unavailable → coordination lines note unavailability; confirm steps use local stubs in dev.
- Coordination panel is stream-only (not persisted on reload).

## 14. Tests

- Manual: Pro user sends chip prompt, confirms mission steps, reload bootstrap.
- Telegram: `/office` Pro vs Free.

## 15. Related skills and rules

- Rules: `landing-page.mdc`, `release-notes.mdc`, `legal-compliance.mdc`
- Design: `.cursor/plans/oficina_multi-agente_a54e9c98.plan.md`

## 16. Open questions / planned work

- `warren_add_holding` step (ETF proposal) — redirect to Warren drawer today.
- Persist coordination lines for history replay.
