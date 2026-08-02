# Unified Homepage (Home v2) — test route

- **Status:** active
- **Owner:** product + dashboard agents
- **Started:** 2026-08-02
- **Target:** flag-gated beta on `/home-v2` (does not replace `/`)
- **Mockup SoT:** [`public/mockups/unified-homepage-v1.html`](../../../public/mockups/unified-homepage-v1.html)
- **Product spec:** [`../../product-specs/unified-homepage.md`](../../product-specs/unified-homepage.md)
- **Owning skill:** [`.cursor/skills/engineer-homepage/SKILL.md`](../../../.cursor/skills/engineer-homepage/SKILL.md)

## Goal

**Graduated (2026-08-02):** unified daily home is the default at `/`. Classic dashboard is opt-in at `/classic` via flag `classic_home`. Legacy `/home-v2` redirects to `/`. `/aid` remains Investor Briefing beta.

## Acceptance criteria

- [ ] Flag `home_v2` registered (default **off**); Admin can enable per-user
- [ ] `/home-v2` renders unified IA when flag on; redirects to `/` when flag off
- [ ] Classic `/` shows Home v2 CTA when flag on (desktop + mobile)
- [ ] Sections present: brief, hero, movers, catalysts, day highlights, allocation, holdings, MCP CTA, Warren nudge
- [ ] `GET /api/home-v2/day-highlights` returns scored chips (move / earnings / news / 52w / alert / ex_div)
- [ ] AID status/feed/digest/earnings-recap accept `aid_beta || home_v2`
- [ ] Telemetry events allow-listed and fired
- [ ] E2E `e2e/home-v2.spec.ts` passes (flag off redirect + flag on happy path)
- [ ] Unit tests for `score-day-highlights`
- [ ] i18n EN + ES for all new strings
- [ ] Release notes entry
- [ ] Spec + this plan kept in sync

## Decisions log

- 2026-08-02: URL **`/home-v2`** (not default `/`) for safe A/B and QA.
- 2026-08-02: Flag **`home_v2`** default off; parallel to `aid_beta`.
- 2026-08-02: Day-highlights MVP uses quotes + calendar + AID cache + alerts — **no** company-analysis batch warm yet.
- 2026-08-02: Reuse AID visit mark (`last_aid_visit_at`) from Home v2 to exercise habit loop without new columns.
- 2026-08-02: Prefer compose/reuse Classic + AID components over forking JSX.

## Plan (implementation order)

### Phase 0 — Knowledge + flag + skill

1. Spec `knowledge/product-specs/unified-homepage.md` + index entry.
2. This exec plan.
3. Skill `.cursor/skills/engineer-homepage/SKILL.md`.
4. Register `home_v2` via `engineer-feature-flags`:
   - `src/lib/db/settings.ts` — `PlatformFeature`, `ALL_PLATFORM_FEATURES` (not in `DEFAULT_ENABLED_FLAGS`)
   - `src/lib/schemas.ts` — `PLATFORM_FEATURE_ENUM`
   - `src/app/api/admin/feature-flags/route.ts`, `src/app/api/feature-flags/route.ts`, `src/app/api/admin/settings/route.ts`
   - `FLAG_META` in `src/app/(app)/admin/feature-flags/page.tsx`
5. `npm run knowledge:gen` if flags are generated.

### Phase 1 — Route + shell + CTA

1. `src/app/(app)/home-v2/page.tsx` — metadata title "Home v2", `robots: { index: false }`.
2. `src/components/homepage/HomeV2Dashboard.tsx` — client shell; if `!flags.home_v2` → `router.replace("/")`.
3. `src/components/homepage/HomeV2BetaCta.tsx` — link to `/home-v2`; mount next to `AidBetaCta` in:
   - `src/components/Dashboard.tsx` (desktop banners)
   - `src/components/mobile/MobileDashboard.tsx`
4. i18n keys in `src/locales/en.ts` + `es.ts` (and other locales EN fallback OK).

### Phase 2 — UI composition (`src/components/homepage/`)

Build against mock order:

| # | Component | Data |
|---|-----------|------|
| 1 | `HomeMorningBrief` | AID status (dual flag) |
| 2 | `HomePortfolioHero` | `use-portfolio-home-data` / `PortfolioHeroCard` |
| 3 | `HomeMoversCard` | client quotes, top 3–5 by € impact or \|%\| |
| 4 | `HomeCatalystsCard` | `/api/events` + holdings, 14d window |
| 5 | `HomeDayHighlights` | `/api/home-v2/day-highlights` |
| 6 | `HomeAllocationBlock` | `AllocationTabs` |
| 7 | `HomeHoldingsBlock` | `PortfolioTable` / `PortfolioCards` |
| 8 | `HomeFinPulseTeaser` | AID feed (1 item) → link `/aid` |
| Rail | `HomeWarrenNudge`, `HomeMcpCta`, digests teaser | existing patterns |

Desktop: `lg:grid-cols-[1fr_320px]`. Mobile: stack; MCP after holdings.

Reuse App chrome only — no custom left rail.

### Phase 3 — APIs + scoring

1. Helper `canAccessAidData(userId)` → `aid_beta || home_v2` in `src/lib/aid/` (or `src/lib/homepage/`).
2. Apply helper to AID routes: `status`, `feed`, `digest`, `earnings-recap` (and layout/insights only if Home v2 needs them — skip layout customize in v1).
3. `GET /api/home-v2/day-highlights/route.ts`:
   - Auth + `home_v2` required
   - Compose highlights; top 8
4. Pure scorer `src/lib/homepage/score-day-highlights.ts` + Vitest.
5. Types in `src/lib/types.ts` or `src/lib/homepage/types.ts`.
6. Home v2 marks visit via `POST /api/aid/status` after ~8s (mirror AID).

### Phase 4 — Telemetry + release notes

Allow-list + emit:

- `home_v2_cta_clicked`
- `home_v2_page_viewed` (`state`: empty \| holdings)
- `home_v2_return_within_24h`
- `home_v2_highlight_clicked`
- `home_v2_mcp_cta_clicked`
- `home_v2_section_viewed`

Release notes: feature/improvement, EN+ES, flag-gated wording. No landing update until graduation.

### Phase 5 — QA gates

- [ ] `e2e/home-v2.spec.ts` — flag off redirect; flag on sections; empty portfolio
- [ ] Unit coverage ≥80% on scorer
- [ ] Theme parity (Default / Canvas / Terminal / Studio)
- [ ] Responsive 375 / 768 / 1280; Capacitor safe areas if shared layout
- [ ] No regression on `/` and `/aid`
- [ ] `legal-advisor` quick check: MCP CTA copy is read-only / no advice overclaim

## Risks

| Risk | Mitigation |
|------|------------|
| AID APIs 403 for home_v2-only users | Dual-flag helper on day one |
| Empty day-highlights looks broken | Hide section when `[]` |
| Performance loading too many AID calls | Parallel fetch; teaser-only FinPulse; no full digest list |
| Confusion with `/aid` | Distinct CTA copy "Home v2 · preview"; noindex |
| Visit mark shared with AID | Documented; OK for beta; split column later if needed |

## Follow-ups (after test URL proves out)

- Graduate `/home-v2` → default `/` behind rollout %
- Redirect `/aid` → `/#briefing` or keep as deep briefing
- Batch-warm company-analysis for holdings (volume, EPS surprise, MAs)
- Demo shell parity when home becomes default
- Landing page if marketed as top-level feature

## Agent implementation checklist (copy)

```
1. Register home_v2 flag (engineer-feature-flags)
2. Page /home-v2 + HomeV2Dashboard gate
3. HomeV2BetaCta on Classic desktop + mobile
4. Compose sections from mock IA
5. day-highlights API + scorer + tests
6. Dual-flag AID data access + visit mark
7. MCP CTA → Profile Developer · MCP
8. Telemetry + release notes + E2E
9. Enable flag for tester user in Admin
```
