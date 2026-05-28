# Advanced Investor Dashboard (AID)

> Beta control panel: portfolio pulse, scannable AI news, and Warren / Will / Clara — one screen to see how you're doing and what's happening.

## 1. Summary

**AID** is a feature-flagged (`aid_beta`) alternative landing experience for authenticated users. It answers “how am I doing and what’s happening?” without replacing the classic dashboard for all users. Entry is a **Beta · AID** CTA on the current home. Two states: **with holdings** (full panel) and **empty portfolio** (onboarding). HTML mockups: `public/mockups/control-panel-cockpit.html` and `control-panel-cockpit-empty.html`.

## 2. Status

- **Tier:** Authenticated (beta via feature flag; tier TBD after beta)
- **Feature flag:** `aid_beta`
- **Health:** yellow (beta shipped; flag-gated at `/aid`)
- **Owning skill:** [`engineer-dashboard`](../../.cursor/skills/engineer-dashboard/SKILL.md)
- **Exec plan:** [`../exec-plans/active/advanced-investor-dashboard.md`](../exec-plans/active/advanced-investor-dashboard.md)
- **Rollout:** [`../runbooks/aid-beta-rollout.md`](../runbooks/aid-beta-rollout.md)

## 3. Entry points

| Type | Path | Notes |
|------|------|-------|
| Page | `src/app/(app)/aid/page.tsx` | Client shell → `AidDashboard` |
| CTA | Home dashboard (`/`) desktop + mobile | `AidBetaCta` when `aid_beta` |
| API | `src/app/api/aid/*` | digest, refresh, insights |
| Cron | `/api/cron/aid-digest` | Pre-warm cache every 6h |
| Component | `src/components/aid/*` | 15 components |

## 4. Data model

- `aid_news_cache` — per-user ticker digest summaries (migration v114)
- Reuse: holdings, quotes, moat cache, dividend calendar, rebalance targets, calendar events, alerts

## 5. API surface

| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| GET | `/api/aid/digest` | user | `aid_beta` | Cached 48h news rows for portfolio |
| POST | `/api/aid/refresh` | user | `aid_beta` | Force web refresh for one ticker |
| GET | `/api/aid/insights` | user | `aid_beta` | Clara savings + Will recent tags |

Warren moat: reuse `/api/warren/chat` and stock evaluation routes.

## 6. UI surface

### Chrome (reuse)

- `MarketTickerBar`, `AppNav`, `AppPortfolioCommandStrip` / `DashboardToolbar`

### Main (with holdings)

- Portfolio value + **Allocation** + **Dividends** modals
- Period tabs: day / week / month; asset-type table (no chart v1)
- News digest with filters, refresh, web/cache badges
- Extras row: movers, vs target, events (7d), alerts, dividends, concentration
- Moats saved + Strategies saved shortcuts

### Main (empty)

- €0, welcome CTAs: Import, Add stock, View demo
- Empty news / moats / strategies preview states

### Right column

- Warren chat (embedded desktop; collapsible sheet mobile)
- Will tags + excerpt (via insights API)
- Clara free investing bucket + broker cash note

## 7. Business logic

- Allocation: `computeAllocationByType`, taxonomy donuts, rebalance drift via `/api/rebalance-targets`
- Dividends: `computeEstimatedDividends`, yield by asset type, ex-div calendar
- News: earnings detection → Tavily (optional) → LLM summary → `aid_news_cache`
- Insights: Clara/Will internal office APIs via `resolveOfficeIdentity`
- Empty: `holdings.length === 0 && cashEntries.length === 0`

## 8. External dependencies

- `TAVILY_API_KEY` (optional) — earnings web search
- OpenAI / AI Gateway — summaries
- `CLARA_BASE_URL`, `WILL_BASE_URL`, `IDP_SERVICE_TOKEN` — sister app insights
- Market data providers (existing quotes)

## 9. Currency / FX / tax implications

- Display in user/portfolio currency; storage EUR-base
- Dividend amounts estimated
- Page footer: financial + AI + beta disclaimers

## 10. i18n

- Keys: `aid*` in `src/locales/en.ts` (source of truth), `es.ts`; other locales fall back to EN via `useI18n`

## 11. Permissions / tier gating / rate limits

- `aid_beta` feature flag required
- Digest generation capped per request (`maxGenerate` in `buildAidDigest`)
- Warren quotas unchanged

## 12. Telemetry

- `aid_beta_cta_clicked`
- `aid_page_viewed` (`state`: empty | holdings)
- `aid_allocation_opened`, `aid_dividends_opened`
- `aid_digest_loaded`, `aid_digest_refresh`, `aid_news_refresh_requested`
- `aid_warren_chip_used`

## 13. Related docs

- Mockups: `public/mockups/control-panel-cockpit*.html`
- E2E: `e2e/aid-dashboard.spec.ts`
- Warren: `src/lib/ai/warren/`
