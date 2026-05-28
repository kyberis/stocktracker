# AID — Advanced Investor Dashboard (exec plan + agent prompt)

- **Status:** active
- **Owner:** product + dashboard agents
- **Started:** 2026-05-27
- **Codename:** AID (`Advanced Investor Dashboard`)
- **Mockups (source of truth for UX):**
  - With holdings: [`public/mockups/control-panel-cockpit.html`](../../../public/mockups/control-panel-cockpit.html)
  - Empty portfolio: [`public/mockups/control-panel-cockpit-empty.html`](../../../public/mockups/control-panel-cockpit-empty.html)

---

## Agent implementation prompt (copy from here)

You are implementing **AID (Advanced Investor Dashboard)** for trefolio — a new **beta** home experience for authenticated users who want a single “control panel” view: portfolio pulse, scannable news, and Warren / Will / Clara context without leaving the page.

### Product intent

When the user opens AID they should answer in under 30 seconds:

1. **How am I doing?** — total value, day / week / month % and € by asset type (no intraday chart in v1).
2. **What’s moving?** — AI summaries of news and earnings for *their* tickers only (last 48h).
3. **What should I remember?** — Will tags (non-chat), Clara unspent cash (non-chat), saved moats/strategies.
4. **What can I ask?** — Warren chat with web search (Renata-style), moat evaluation in chat, suggested questions.

### Entry point (required)

- Add a **CTA on the current authenticated home** (`/`, dashboard) visible when feature flag `aid_beta` is on.
- **Label:** `Beta` (badge) + **`AID`** or subtitle **“Advanced Investor Dashboard”**.
- **Copy (EN):** `Beta · AID` — `Advanced Investor Dashboard`
- **Copy (ES):** `Beta · AID` — `Panel avanzado para inversores`
- Navigates to **`/aid`** (preferred) or rewrites home when flag + user pref (decide in implementation; default **dedicated route**).
- CTA must not replace existing home for all users — **flag-gated** only.
- Track click: `aid_beta_cta_clicked`.

### Shell & chrome (reuse production — do not invent a side rail)

Use existing app chrome exactly as production:

| Layer | Reuse |
|-------|--------|
| Ticker | `MarketTickerBar` |
| Header | `AppNav` — logo, `NavAssetSearch`, notifications, stealth, theme, language, user |
| Toolbar | `AppPortfolioCommandStrip` / `DashboardToolbar` — portfolio selector, Holdings/Tools/Views/…, Sync, Import, Add |

**Do not** add a left icon rail (that was mock-only and was removed).

Follow [`.cursor/rules/ui-design-system.mdc`](../../../.cursor/rules/ui-design-system.mdc) — semantic tokens, `.card`, `.glass-overlay`, `useTheme()`.

### Layout

Two columns (desktop):

| Column | Width | Content |
|--------|-------|---------|
| Main | flex | Portfolio hero, asset table, news, moats/strategies shortcuts, optional “coming soon” tiles |
| Right | ~360px | Warren chat (top), Will card, Clara card |

Mobile: stack — Warren collapsible sheet or below fold; preserve touch targets (44px).

### Main column — with holdings

#### 1. Portfolio card (`#portfolio-card`)

- **Title row:** `Portfolio value` + two pill buttons:
  - **Asignación** (green) → opens allocation popup
  - **Dividendos** (amber) → opens dividends popup
- **Hero:** total value + today change (EUR, stealth-aware).
- **Period tabs:** Día / Semana / Mes — update hero sub-stats row (3 small cards). **No line/area chart** in v1.
- **Asset table** (numbers only):

| Tipo | Valor | Día | Semana | Mes |
|------|-------|-----|--------|-----|

Rows: Stocks, ETFs, Crypto, Cash — click row → allocation popup focused on that type.

Footer hint: *Click type · Allocation · Dividends*

#### 2. Allocation popup (modal)

Same data as `AllocationTabs` / diversification views:

- Tabs: **Por tipo** | **Sectores** | **Regiones**
- Donut + legend + **vs objetivo** (if user has targets)
- Detail list for selected type (top positions %)
- Reuse `computeAllocationByType`, `computeTaxonomyAllocations`, donut helpers from [`src/components/dashboard-v2/AllocationTabs.tsx`](../../../src/components/dashboard-v2/AllocationTabs.tsx)

#### 3. Dividends popup (modal)

Quick view before full Dividends tab:

- Tabs: **Este mes** | **Próximos** | **Rendimiento**
- Month: estimated income €, portfolio yield, per-ticker lines
- Upcoming: ex-div / pay dates (reuse dividend calendar data layer)
- Yield: by asset type + top payers
- Link: “Open full Dividends tab” → `?tab=dividends`

#### 4. Qué está pasando (news)

**Scannable, not essay.** Per ticker row:

- Ticker + % move (color)
- **One headline** (bold)
- **2–3 bullets** max
- Pills: impact (Alto/Medio/Bajo), optional `Web · guardado` / `Caché {date}`

**Data pipeline:**

1. Detect portfolio tickers with material events (earnings today, big move, etc.).
2. For earnings / explicit refresh: **Warren web search** (Tavily-style, same pattern as Renata in `external/curriculumsupport` — see [`web-search.ts`](../../../external/curriculumsupport/lib/web-search.ts)).
3. Summarize with LLM → **persist cache** keyed by `userId + ticker + eventId` (or `reportDate`) — **do not re-fetch/re-summarize** until next event or TTL (e.g. 24h after last material news).
4. Filters: Todo | Resultados | Movimiento (client-side filter on cached items).

Banner when ≥1 earnings today: *“N resultados hoy — Warren buscó, resumió y guardó.”*

#### 5. Moats guardados + Estrategias guardadas

Compact lists (3–5 rows) → link to Tools. Empty → CTA to Moat Evaluation / Strategies.

#### 6. Optional tiles row (v2 or mock-only in v1)

Top movers, vs target, calendar, alerts — only if data exists; hide section when empty.

### Main column — empty portfolio (`holdingsCount === 0 && cashEntries.length === 0`)

Match [`control-panel-cockpit-empty.html`](../../../public/mockups/control-panel-cockpit-empty.html):

- Value **€0**, periods disabled (—)
- **Welcome block** with 3 CTAs:
  1. **Import portfolio** → `/import` (primary)
  2. **Add stock** → existing add flow
  3. **View demo** → `/demo`
- Ghost preview of asset table (disabled)
- News: empty state — “Add holdings to see portfolio news”
- Moats/strategies: empty + link to Tools (moat eval works without holdings)
- Tiles: “When you have positions you’ll see…” (preview labels)
- **No allocation/dividends popups** (buttons hidden or disabled with tooltip)

### Right column — agents

#### Warren (conversational)

- Full chat panel; badges: **web**, **moat**
- **Suggested questions** (chips) — populate from analytics later; ship static list:

**With holdings:** portfolio today, top movers, news 48h, concentration, weekly performance, allocation vs target, earnings this week, dividends this month, moat of {ticker}.

**Empty:** import from DEGIRO, add first stock, what will I see here, moat of AAPL, what is moat screener, NVDA news example.

- **Web search:** user asks or cron detects earnings → search → summarize → **cache** (display “Buscando…” then “resumen guardado”).
- **Moat in chat:** call existing `evaluateMoat` / moat API — render card (score /100, verdict, criteria dots, Guardar / Ver en Tools). Works **without** position in portfolio.

#### Will (non-chat)

- Investment note **tags** only + optional one-line snippet
- No chat input

#### Clara (non-chat)

- **Unspent cash** available to invest (bucket) — from Clara product data when linked
- Empty: “Connect Clara” or em dash if not configured
- No chat input

### Feature flag & tier

- Flag: `aid_beta` in [`src/lib/feature-flags.ts`](../../../src/lib/feature-flags.ts) (registry + admin UI).
- Default: off. Enable for staff / beta testers first.
- Tier: start **all authenticated** with flag; revisit Pro-only after beta.

### Routes & files (suggested)

```
src/app/(app)/aid/page.tsx          # server shell
src/app/(app)/aid/aid-dashboard.tsx # client AID layout
src/components/aid/                 # AID-specific (or extend dashboard-v2)
src/app/api/aid/                    # optional: news digest, cache read
src/lib/db/aid-news-cache.ts        # persistence for summaries
```

Wire CTA in [`src/components/Dashboard.tsx`](../../../src/components/Dashboard.tsx) or home hero — **only when `aid_beta`**.

### Mandatory cross-cutting

| Rule / skill | Action |
|--------------|--------|
| [release-notes.mdc](../../../.cursor/rules/release-notes.mdc) | `feature` entry EN + ES |
| [demo-page.mdc](../../../.cursor/rules/demo-page.mdc) | N/A unless AID becomes demo — prefer link to `/demo` from empty state |
| [landing-page.mdc](../../../.cursor/rules/landing-page.mdc) | Only when launching beta publicly |
| [legal-advisor](../../../.cursor/skills/legal-advisor/SKILL.md) | AI summaries, web search, financial display |
| [accessibility-reviewer](../../../.cursor/skills/accessibility-reviewer/SKILL.md) | Modals, tabs, chat, keyboard |
| [mobile-usability-reviewer](../../../.cursor/skills/mobile-usability-reviewer/SKILL.md) | Two-column → stack |

### Acceptance criteria

- [x] Beta CTA on home when `aid_beta` on; navigates to `/aid`
- [x] Full trefolio nav chrome; no fake side rail
- [x] Holdings state: € total, Día/Semana/Mes, asset table, no chart
- [x] Allocation + Dividends modals match mockup behavior (yield by type in dividends modal)
- [x] News: bullet rows, 48h, cache + web for earnings
- [x] Empty state: onboarding CTAs, no fake portfolio data
- [x] Warren: suggestions + web + moat card (via WarrenDrawer)
- [x] Will/Clara: read-only insight cards (`/api/aid/insights`)
- [x] `aid_beta` flag; release notes
- [x] `aid_beta` flag; release notes
- [x] WCAG AA checklist — see [`knowledge/compliance/aid-beta-compliance.md`](../../compliance/aid-beta-compliance.md)
- [x] Legal checklist + Privacy Policy processors — see same doc

### Out of scope (v1)

- Replacing default home for everyone
- Intraday portfolio chart in AID card
- Full Agent Office in right column (keep Warren host; optional Clara/Will API later)
- Sample portfolio seeding on empty (forbidden per release notes — real import/add/demo only)

---

## Skills & agents to involve

Use this table at kickoff and in PR description. **Read the skill file before coding** in that domain.

| Phase | Skill | Responsibility |
|-------|--------|----------------|
| **Product** | [product-manager](../../../.cursor/skills/product-manager/SKILL.md) | Scope, tier, flag rollout, CTA placement, design-system parity |
| **UX copy** | [ux-writer](../../../.cursor/skills/ux-writer/SKILL.md) | AID, Beta, empty states, Warren chips, ES+EN |
| **Dashboard UI** | [engineer-dashboard](../../../.cursor/skills/engineer-dashboard/SKILL.md) | Layout, cards, modals, home CTA, `/aid` route |
| **Charts** | [engineer-charts](../../../.cursor/skills/engineer-charts/SKILL.md) | Donut in allocation popup only (reuse AllocationTabs patterns) |
| **Financial math** | [financial-calculations](../../../.cursor/skills/financial-calculations/SKILL.md) | Dividend estimates, yield, FX display, % by period |
| **Tools / Moat** | [engineer-tools](../../../.cursor/skills/engineer-tools/SKILL.md) | Moat card in Warren; moats saved list |
| **Integrations** | [engineer-integrations](../../../.cursor/skills/engineer-integrations/SKILL.md) | Tavily/web search for earnings; news providers |
| **Data** | [engineer-data](../../../.cursor/skills/engineer-data/SKILL.md) | `aid_news_cache` table, cache keys, TTL |
| **Feature flags** | [engineer-feature-flags](../../../.cursor/skills/engineer-feature-flags/SKILL.md) | `aid_beta` registry + admin |
| **Warren / AI** | Warren prompts in `src/lib/ai/warren/` + [automated-user-comms](../../../.cursor/skills/automated-user-comms/SKILL.md) | Summaries honesty, no advice; cached digest text |
| **Import empty** | [pm-import](../../../.cursor/skills/pm-import/SKILL.md) | Empty state import path and copy |
| **Auth** | [engineer-user-auth](../../../.cursor/skills/engineer-user-auth/SKILL.md) | Route guard, session |
| **Analytics** | [analytics-instrumentation](../../../.cursor/skills/analytics-instrumentation/SKILL.md) | `aid_*` events |
| **A11y** | [accessibility-reviewer](../../../.cursor/skills/accessibility-reviewer/SKILL.md) | Modals, focus trap, aria |
| **Mobile** | [mobile-usability-reviewer](../../../.cursor/skills/mobile-usability-reviewer/SKILL.md) | Breakpoints, chat sheet |
| **Legal** | [legal-advisor](../../../.cursor/skills/legal-advisor/SKILL.md) | AI news, web search, disclaimers on AID |
| **QA** | [qa-tester](../../../.cursor/skills/qa-tester/SKILL.md) | Test matrix both states |
| **Release** | [release-manager](../../../.cursor/skills/release-manager/SKILL.md) | Version + note curation |
| **Theme** | [theme-parity](../../../.cursor/skills/theme-parity/SKILL.md) | default / terminal / canvas / studio |

### Optional / later

| Skill | When |
|-------|------|
| [engineer-social](../../../.cursor/skills/engineer-social/SKILL.md) | Share AID snapshot cards |
| [engineer-payments-subscriptions](../../../.cursor/skills/engineer-payments-subscriptions/SKILL.md) | If AID becomes Pro-only |
| [seo-specialist](../../../.cursor/skills/seo-specialist/SKILL.md) | Only if public marketing page for AID |
| [sales](../../../.cursor/skills/sales/SKILL.md) | Landing copy if beta goes wide |

### Sister products (read-only context)

| Agent | Reference |
|-------|-----------|
| Renata web search | `external/curriculumsupport` — Tavily tool pattern |
| Clara / Will | [clara-idp-integration.md](../../design-docs/clara-idp-integration.md), Will notes bridge |

---

## Design decisions log

| Date | Decision |
|------|----------|
| 2026-05-27 | AID is a **beta** route, not default home — CTA + `aid_beta` flag |
| 2026-05-27 | Reuse **AppNav + toolbar**; no left rail |
| 2026-05-27 | **No intraday chart** — table by asset type (Día/Semana/Mes) |
| 2026-05-27 | **Allocation** + **Dividends** as header popups (not full page) |
| 2026-05-27 | News: **bullets + impact pills**; web search + **cache** on earnings |
| 2026-05-27 | Warren: **suggested questions** + **moat in chat** + web |
| 2026-05-27 | Will/Clara: **insight cards only** (no chat in right column) |
| 2026-05-27 | Empty: **import / add / demo** — no sample seed on real accounts |

---

## Implementation phases

### Phase 0 — Mockup sign-off ✅

HTML mockups in `public/mockups/` (linked above).

### Phase 1 — Skeleton

1. `aid_beta` flag
2. Route `/aid` + layout shell (chrome + empty main/right placeholders)
3. Beta CTA on home

### Phase 2 — Holdings UI

1. Portfolio card + asset table + period tabs
2. Allocation modal (wire real data)
3. Dividends modal
4. News list UI + empty filters

### Phase 3 — Data & AI

1. News digest job / on-demand fetch
2. Web search + cache table
3. Warren panel + suggestions + moat tool render

### Phase 4 — Empty state + polish ✅

1. Empty branch on `holdingsCount`
2. Will/Clara cards
3. Moats/strategies shortcuts
4. A11y, mobile, i18n (EN/ES + EN fallback), release notes, legal, CI E2E

**Will deploy:** ship `external/notetaker` `recent-tags` route before expecting production tag cloud.

---

## Test plan (smoke)

| Case | Steps |
|------|--------|
| CTA | Flag on → home shows Beta/AID → opens `/aid` |
| Holdings | Import user → values, table, allocation popup, dividends popup |
| News | Tickers with earnings show cached/web badge |
| Warren | Chip fills input; moat request returns card |
| Empty | New user → €0, CTAs, no popups, Warren onboarding chips |
| Mobile | 375px — stack, modals full-screen sheet |

---

## Risks

| Risk | Mitigation |
|------|------------|
| Web search cost / latency | Cache aggressively; only earnings + explicit ask |
| Duplicate UX with dashboard tabs | AID = summary; deep links to Holdings/Dividends/Tools |
| Legal on AI news | Disclaimers + “not advice”; legal-advisor review |
| Flag leak to all users | Default off; staff dogfood first |

---

## Follow-ups

- Product spec: [`../../product-specs/advanced-investor-dashboard.md`](../../product-specs/advanced-investor-dashboard.md)
- Consider PWA / mobile default landing for power users after beta metrics
- Analytics: time-on-AID vs classic home
