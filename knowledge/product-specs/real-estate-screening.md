# Real-estate zone screening (Portugal)

> Pick Portugal zones from the INE catalogue, set budget and mortgage terms in the UI, and get an async cash-flow report — informational only, not investment advice.

## 1. Summary

A signed-in user with the `real_estate_screening_enabled` flag opens `/real-estate/screening`, selects one or more INE geographies that publish sale/rent medians, sets budget / down payment / purchase type / size / term, and launches a job that can take 10–25 minutes. The report lives at `/real-estate/screening/runs/[runId]` and is built from official INE series plus a pluggable listing adapter (stubbed in production until the portal ADR is approved).

## 2. Status

- **Tier:** Experimental (flag only; weekly quota `real_estate_screening`)
- **Feature flag:** `real_estate_screening_enabled` (off by default)
- **Health:** yellow — INE path + finance engine + stub listings; live portal scraping is not deployed
- **Owning skill:** [`.cursor/skills/engineer-tools/SKILL.md`](../../.cursor/skills/engineer-tools/SKILL.md)

## 3. Entry points

| Type | Path | Notes |
|------|------|-------|
| Page | `src/app/(app)/real-estate/screening/page.tsx` | Zone picker + parameter panel |
| Page | `src/app/(app)/real-estate/screening/runs/[runId]/page.tsx` | Progress + report |
| API | `src/app/api/real-estate/zones/route.ts` | Catalogue search |
| API | `src/app/api/real-estate/screening/route.ts` | List + create run |
| API | `src/app/api/real-estate/screening/[runId]/route.ts` | Status + partial result |
| API | `src/app/api/real-estate/screening/[runId]/resume/route.ts` | Resume stuck run |
| Cron | `src/app/api/cron/re-zona-sync/route.ts` | Quarterly INE catalogue + coverage flags |
| Cron | `src/app/api/cron/re-screening-recover/route.ts` | Stuck-run recovery |
| Component | `src/components/real-estate-screening/RealEstateScreeningCta.tsx` | Home CTA (flag-gated) |

## 4. Data model

Tables in [`src/lib/db/real-estate-screening.ts`](../../src/lib/db/real-estate-screening.ts); schema in [`src/lib/db/migrations.ts`](../../src/lib/db/migrations.ts) v152:

- `re_zona_catalogo` — `geocod` PK, `nombre`, `tipo` (`nuts2|nuts3|concelho|freguesia`), `parent_geocod`, `distrito`, `am_metropolitana`, `tiene_datos_venta`, `tiene_datos_renta`, `synced_at`.
- `re_ine_cache` — PK `(varcd, geocod, periodo)`, `valor` nullable, `fetched_at`.
- `re_listing_cache` — PK `(portal, listing_id)`, `payload_json`, `fetched_at`.
- `re_screening_runs` — `id`, `user_id`, `zonas_json`, `params_json`, `status`, `phase`, `progress_json`, `idempotency_key`, `error`, `created_at`, `finished_at`.
- `re_screening_steps` — durable phase queue (`phase`, `status`, `attempts`, `lease_*`, `depends_on`).
- `re_screening_results` — `run_id`, `payload_json`, `cobertura_json`.

Types: [`src/lib/real-estate-screening/schemas.ts`](../../src/lib/real-estate-screening/schemas.ts) — `RealEstateScreeningParams`, `ScreeningReportPayload`.

## 5. API surface

| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| GET | `/api/real-estate/zones` | user + flag | Experimental | Fuzzy search over `re_zona_catalogo` |
| GET | `/api/real-estate/screening` | user + flag | Experimental | Recent runs |
| POST | `/api/real-estate/screening` | user + flag + quota | Experimental | Create (or reuse day's idempotent) run |
| GET | `/api/real-estate/screening/[runId]` | user + flag | Experimental | Status, phases, partial/full payload |
| POST | `/api/real-estate/screening/[runId]/resume` | user + flag | Experimental | Re-queue pending steps |
| GET | `/api/cron/re-zona-sync` | cron secret | — | Sync INE metadata + coverage |
| GET | `/api/cron/re-screening-recover` | cron secret | — | Recover expired leases |

Input: `createRealEstateRunBodySchema` (`zoneGeocods[]`, `params`).

## 6. UI surface

- Entry: zone multi-select (accent-tolerant search, disabled zones with reason) + collapsible params with always-visible summary.
- Home: `RealEstateScreeningCta` next to the equity screening banner.
- Progress: real phases with counts; URL is shareable.
- Report: eleven sections, empty/partial/stale states, CSV export, rerun with stored params.
- Context: `FeatureFlagProvider`, session. Demo mode is not wired (flag off on demo).

## 7. Business logic

- INE: varcd `0012234` (sale €/m²) and `0014696` (new-contract rent €/m²/month); Dim1 `S5A{year}{quarter}`; `"Dado nulo ou não aplicável"` → `null`; never interpolate.
- Discount vs **current median** and vs 5-year mean (both shown).
- Listing source: `PortalAdapter`. Production uses the stub until [`real-estate-portal-data-source.md`](../design-docs/real-estate-portal-data-source.md) is approved.
- Hard flags exclude (`USUFRUTO`, `RECOMPRA`, `SIN_LICENCA`, `COMERCIAL`, `TERRENO`); soft flags keep and label. Gross vs usable area: recompute €/m² on the smaller figure.
- Rent: comparables ±25–30% size; widen to ±40% if &lt;4 comps; regression only if R² &gt; 0.6; −8% negotiation; `REVISION_MANUAL` on large INE gap.
- Finance: `cuota`, IMT + 0.8% + €2 000, three rate scenarios, RSAA 0% vs renda moderada 10%. Volatile rates live in `config/impuestos.json`.

## 8. External dependencies

- **INE** public JSON (`ine.pt/ine/json_indicador/`) — no user data sent.
- Listing portal: stub by default. Do not enable live scraping in production without the ADR.
- Env: none required for INE. Optional `REAL_ESTATE_PORTAL=stub\|idealista` (idealista ignored unless explicitly allowed later).
- Quota: `real_estate_screening` (free 2 / pro 10 per week).

## 9. Currency / FX / tax implications

- All money is EUR (Portugal). No FX conversion.
- IMT / IRS / RSAA figures are config-driven estimates, not a tax filing.
- Display rounds at the UI; engine keeps full floats.

## 10. i18n

- Copy in [`src/lib/real-estate-screening/copy.ts`](../../src/lib/real-estate-screening/copy.ts) (EN + ES, others fall back to EN), same beta pattern as investment screening.
- Release notes EN + ES.

## 11. Permissions / tier gating / rate limits

- Session required. Disabled flag → 404 (not 403).
- Quota key `real_estate_screening`.
- Max 5 zones per run. Idempotent per `(user, sorted geocods, params, UTC day)`.

## 12. Telemetry

- Log lines: `[re-screening/*]`.
- Track: `re_screening_run_created`, `re_screening_completed` (via `useTrack` / `trackEvent`).
- Phase duration and per-zone failures in step `error_message` / `cobertura_json`.

## 13. Edge cases & gotchas

- Zones without INE coverage are shown disabled, never hidden.
- Empty candidate list is a valid outcome (efficient market / tight budget), not an error.
- Partial: one zone scrape/INE miss must not drop the rest.
- Stale: reports older than 14 days offer a rerun.
- Demo `/demo` does not mount this vertical.
- Never invent missing INE points.

## 14. Tests

- Unit: `src/lib/real-estate-screening/*.test.ts` (INE parse, flags, umbral, renta, finanzas, search).
- Portal HTML fixtures under `src/lib/real-estate-screening/fixtures/`.
- API route tests for create/list/zones.
- E2E: `e2e/real-estate-screening.spec.ts` (skips when the flag is off).

## 15. Related skills and rules

- Skills: [`.cursor/skills/engineer-tools/SKILL.md`](../../.cursor/skills/engineer-tools/SKILL.md), [`.cursor/skills/engineer-feature-flags/SKILL.md`](../../.cursor/skills/engineer-feature-flags/SKILL.md), [`.cursor/skills/legal-advisor/SKILL.md`](../../.cursor/skills/legal-advisor/SKILL.md)
- Rules: [`.cursor/rules/release-notes.mdc`](../../.cursor/rules/release-notes.mdc), [`.cursor/rules/landing-page.mdc`](../../.cursor/rules/landing-page.mdc)
- Related: [investment-screening](investment-screening.md) (equity pipeline — different namespace), [feature-flags](feature-flags.md)
- ADR: [real-estate-portal-data-source](../design-docs/real-estate-portal-data-source.md)
- Legal: [legal-real-estate-screening](../design-docs/legal-real-estate-screening.md)

## 16. Open questions / planned work

- Live listing adapter after ADR approval (partner API preferred).
- Map with transport overlays (no map provider in v1).
- Email/push when a long job finishes (in-app notification ships in v1).
- Landing page: skipped while flag-gated / backend-heavy.
- Active plan: [`knowledge/exec-plans/active/real-estate-screening.md`](../exec-plans/active/real-estate-screening.md).
