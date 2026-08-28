# Jobs nav (Add / Review / Discover)

> Command-strip goal switcher that surfaces Import, Alerts, Screener, and Moat at one tap.

## 1. Summary

Authenticated default-theme chrome can replace Holdings/Tools/Views pills with a three-job switcher — **Add**, **Review**, **Discover** — plus contextual chips. Search, portfolio selector, Sync, and Add stay in the desktop strip. Mobile Home shows only the switcher and chips (same as today’s hidden command strip on Home, plus jobs). Studio and the bottom tab bar are unchanged.

## 2. Status

- **Tier:** Authenticated (all plans)
- **Feature flag:** `jobs_nav` (default **off**; admin-first)
- **Health:** yellow (flag off in production until rollout)
- **Owning skill:** [`.cursor/skills/engineer-dashboard/SKILL.md`](../../.cursor/skills/engineer-dashboard/SKILL.md)

## 3. Entry points

| Type | Path | Notes |
|------|------|-------|
| Catalog | [`src/lib/jobs-nav.ts`](../../src/lib/jobs-nav.ts) | Jobs, chips, matchers |
| Context | [`src/contexts/jobs-nav-context.tsx`](../../src/contexts/jobs-nav-context.tsx) | `localStorage` persistence |
| Strip | [`src/components/AppPortfolioCommandStrip.tsx`](../../src/components/AppPortfolioCommandStrip.tsx) | Flag gate + mobile Home compact |
| Toolbar | [`src/components/DashboardToolbar.tsx`](../../src/components/DashboardToolbar.tsx) | `jobsNav` / `compactMobile` / `stacked` |
| UI | [`src/components/JobsNavSwitcher.tsx`](../../src/components/JobsNavSwitcher.tsx), [`src/components/JobsNavChips.tsx`](../../src/components/JobsNavChips.tsx) | Tablist + chips |
| Layout | [`src/app/(app)/app-layout-client.tsx`](../../src/app/(app)/app-layout-client.tsx) | `JobsNavProvider` |
| Mock | [`public/mocks/nav-header-jobs-hifi.html`](../../public/mocks/nav-header-jobs-hifi.html) | Visual reference |

## 4. Data model

No new tables. Selected job is client-only:

- Key: `trefolio_jobs_nav_job`
- Values: `alta` \| `evaluar` \| `descubrir`
- Default: `evaluar`

## 5. API surface

None. Flag resolution uses existing `GET /api/feature-flags`.

## 6. UI surface

- **Desktop (flag on):** portfolio selector · job switcher · chips · Settings / Sync / Import / Add. QuickLinks hidden.
- **Mobile Home (flag on):** switcher full-width + horizontally scrolling chips. Sync / Add / settings / portfolio selector hidden (Add lives on the Add job + bottom Import tab).
- **Mobile other routes (flag on):** stacked switcher + chips; actions remain.
- **Flag off:** previous QuickLinks strip; mobile Home still hides the strip.

Chip destinations:

| Job | Chips |
|-----|--------|
| Add (`alta`) | Import `/import`, Add (`gatedAdd("stock")`), Warren (`openWarren`) |
| Review (`evaluar`) | Home `/`, Alerts `/tools/alerts`, Portfolio `/portfolio`, Allocation `/tools/taxonomy`, Tools `/tools` (hub only) |
| Discover (`descubrir`) | Screener `/tools/screener`, Moat `/tools/evaluation`, Analysis `/analisis`, Explore `/explore` |

`/screening` is **not** a chip in v1.

## 7. Business logic

- `getChipsForJob(job, flags)` in [`src/lib/jobs-nav.ts`](../../src/lib/jobs-nav.ts). `flags` reserved for later gated chips.
- Tools hub chip matches exact `/tools` so Alerts / Screener / Moat stay distinct.
- Studio theme and `MobileTabBar` are out of scope.

## 8. External dependencies

- None.

## 9. Currency / FX / tax implications

- N/A.

## 10. i18n

- Keys in [`src/locales/en.ts`](../../src/locales/en.ts) and [`src/locales/es.ts`](../../src/locales/es.ts): `jobsNavAlta`, `jobsNavEvaluar`, `jobsNavDescubrir`, chip short labels. Other locales fall back to English.

## 11. Permissions / tier gating / rate limits

- No extra subscription gate. Destination pages keep their existing Pro / flag checks (Screener, Analysis, etc.).

## 12. Telemetry

- `jobs_nav_job_selected` — `{ job }`
- `jobs_nav_chip_clicked` — `{ job, chip }`
- Client `useTrack` → GA only.

## 13. Edge cases & gotchas

- Invalid `localStorage` values fall back to Review.
- Demo `/demo` on mobile with flag on shows the compact jobs strip (unlike flag-off, which hides the strip).
- Warren chip requires `AgentChromeProvider` (already wrapping the app shell).

## 14. Tests

- Unit: [`src/lib/jobs-nav.test.ts`](../../src/lib/jobs-nav.test.ts)
- Manual: enable `jobs_nav` in Admin → Feature flags; check desktop strip, mobile Home compact, keyboard arrows on the job tablist.

## 15. Related skills and rules

- Skills: [`.cursor/skills/engineer-dashboard/SKILL.md`](../../.cursor/skills/engineer-dashboard/SKILL.md), [`.cursor/skills/engineer-feature-flags/SKILL.md`](../../.cursor/skills/engineer-feature-flags/SKILL.md), [`.cursor/skills/accessibility-reviewer/SKILL.md`](../../.cursor/skills/accessibility-reviewer/SKILL.md)
- Related specs: [dashboard-toolbar](dashboard-toolbar.md), [unified-homepage](unified-homepage.md), [feature-flags](feature-flags.md)

## 16. Open questions / planned work

- Studio theme jobs strip.
- Replace or remap `MobileTabBar` to jobs.
- Discover chip for `/screening` behind `investment_screening_enabled`.
- Server-persisted job preference.
