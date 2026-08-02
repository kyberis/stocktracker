# Unified Homepage (Home v2)

> Flag-gated daily home at `/home-v2`: portfolio pulse + movers + catalysts + day highlights + Claude MCP CTA — test route before replacing Classic `/`.

## 1. Summary

**Home** (formerly Home v2) is the **default** authenticated homepage at `/`. It answers in under 30 seconds: how am I doing, what’s moving, what’s coming (catalysts), and how to dig deeper (holdings, allocation, Warren, Claude MCP). The legacy Classic dashboard lives at `/classic` behind flag `classic_home`. `/aid` remains the Investor Briefing beta.

## 2. Status

- **Tier:** Authenticated (all tiers; AI/AID-backed bits follow existing AID/Pro rules where applicable)
- **Feature flags:** `home_v2` (default **on** — powers home APIs); `classic_home` (default **off** — opt-in Classic at `/classic`)
- **Health:** green (default home)
- **Owning skill:** [`.cursor/skills/engineer-homepage/SKILL.md`](../../.cursor/skills/engineer-homepage/SKILL.md)
- **Exec plan:** [`../exec-plans/active/unified-homepage.md`](../exec-plans/active/unified-homepage.md)
- **Mockup:** [`public/mockups/unified-homepage-v1.html`](../../public/mockups/unified-homepage-v1.html)

## 3. Entry points

| Type | Path | Notes |
|------|------|-------|
| Page | `src/app/(app)/page.tsx` → `DashboardShell` → `HomeV2Dashboard` | Default home |
| Legacy preview | `src/app/(app)/home-v2/page.tsx` | Redirects to `/` |
| Classic | `src/app/(app)/classic/page.tsx` | Requires `classic_home` |
| CTA | Home → Classic | Header link when `classic_home` |
| API | `GET /api/home-v2/day-highlights` | Scored per-ticker chips (`home_v2`) |
| AID reuse | `/api/aid/{status,feed,digest,earnings-recap}` | Guard: `aid_beta \|\| home_v2` |
| Components | `src/components/homepage/*` | Composition layer |
| Lib | `src/lib/homepage/score-day-highlights.ts` | Pure scoring |

## 4. Data model

No new tables in MVP.

- Reuse: holdings, quotes, cash, calendar events, alerts, `aid_news_cache`, `user_settings.last_aid_visit_at` (visit mark shared with AID during beta).
- Types: `HomeDayHighlight` (+ reason discriminated union) in `src/lib/homepage/types.ts` or `src/lib/types.ts`.

## 5. API surface

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/home-v2/day-highlights` | user + `home_v2` | Top ≤8 ticker highlights for today |
| GET/POST | `/api/aid/status` | user + (`aid_beta` \| `home_v2`) | Brief counts + mark visit |
| GET | `/api/aid/feed` | same | Priority teaser |
| GET | `/api/aid/digest` | same | News bullets for highlight enrichment |
| GET | `/api/aid/earnings-recap` | same | Post-earnings context |
| GET | `/api/events` | user (existing) | Catalysts (earnings / ex-div) |

### `HomeDayHighlight` shape

```ts
type HomeDayHighlightReason =
  | { kind: "move"; pct: number; eurImpact: number }
  | { kind: "earnings"; when: "today" | "tomorrow" | string }
  | { kind: "news"; headline: string; impactScore: number }
  | { kind: "near_52w"; side: "high" | "low"; distancePct: number }
  | { kind: "alert"; label: string }
  | { kind: "ex_div"; date: string };

type HomeDayHighlight = {
  ticker: string;
  rank: number;
  reasons: HomeDayHighlightReason[];
};
```

## 6. UI surface

**Main column (desktop):** Morning brief → Portfolio hero → **Portfolio recommendation card** → Movers \| Catalysts → Day highlights → Holdings → FinPulse teaser → Portfolio News (compact).

**Portfolio hero modes:** Default is a compact **Portfolio total** card (total value in display currency, day P&L, cost basis, total return %, holdings count) with an **Advanced** CTA. Advanced swaps in-place to the existing `PortfolioHeroCard` (invested assets, breakdown, performance matrix). **Summary** restores the compact card. Preference persisted as `home_v2_hero_mode` (`simple` | `advanced`).

**Portfolio recommendation card:** Deterministic tip queue (diversify / concentration / cash / FX). Hide when empty or demo. Diversify CTA → `/recommendations/diversify`. Spec: [home-portfolio-recommendations.md](home-portfolio-recommendations.md).

**Rail (~320px):** Allocation (CTA → `/tools/taxonomy` to fix unclassified) → Warren daily nudge → Claude MCP CTA → Daily/weekly digests teaser → quick stats. Hidden when empty (no holdings). On mobile, Allocation stays in the main column above holdings.

**Empty (no holdings):** Same `EmptyPortfolio` CTA as Classic `/` (import + add stock). Cash-only still counts as empty for this gate.

**Mobile:** Same order stacked; MCP CTA after holdings; touch targets ≥44px.

**Chrome:** Existing `AppNav` + `AppPortfolioCommandStrip` / toolbar. No left icon rail.

**Out of scope (v1):** Full FinPulse feed, AID drag-layout, replacing `/`, demo-shell parity.

## 7. Business logic

- **Movers:** Rank holdings by absolute EUR day impact (fallback \|%\|); show 3–5.
- **Catalysts:** Events in next 14 days for holding tickers (earnings, ex-div); optional `nextCatalystDate` when already cached.
- **Day-highlight scoring:** Prefer large moves (±3% / ±5%), earnings window, high-impact AID news, triggered alerts, near 52w high/low (≤3% distance), upcoming ex-div. Hide section if empty.
- **Visit / habit:** After ~8s on page with holdings, `POST /api/aid/status` to update `last_aid_visit_at`.
- **MCP CTA:** Navigate to Profile → Developer · MCP; copy must say read-only PAT setup (no fake OAuth Client ID).

## 8. External dependencies

- Same as portfolio quotes + AID (OpenAI/Tavily for digest when warmed).
- No new env vars.

## 9. Currency / FX / tax implications

- Totals and EUR impact use existing portfolio EUR-base + display currency helpers (`formatCurrency`).
- MCP tax tools mentioned in CTA are educational only — no filing claims on the home card.

## 10. i18n

- Keys under `homeV2*` in `src/locales/en.ts` and `es.ts` at minimum.
- Voice: friendly, jargon-light; “Catalizadores” with plain subtitle.

## 11. Permissions / tier gating / rate limits

- Default UI at `/` is ungated for authenticated users.
- Day-highlights API: `home_v2` (default on).
- Classic UI at `/classic`: `classic_home` (default off).
- Holding limits and AI quotas unchanged.
- AID data endpoints: either `aid_beta` or `home_v2`.

## 12. Telemetry

| Event | Purpose |
|-------|---------|
| `home_v2_page_viewed` | Load (`state`: empty \| holdings) |
| `home_v2_return_within_24h` | Habit signal |
| `home_v2_section_viewed` | Scroll into section |
| `home_v2_highlight_clicked` | Chip click (`kind`, `ticker`) |
| `home_v2_mcp_cta_clicked` | MCP card CTA |
| `home_rec_viewed` / `home_rec_next` / `home_rec_acted` | Recommendation card lifecycle |
| `home_rec_diversify_opened` / `home_rec_candidate_clicked` | Diversify research funnel |

### Success thresholds

| Metric | Target |
|--------|--------|
| Return within 24h | ≥ 30% |
| Highlight CTR | ≥ 15% of page views with highlights |
| MCP CTA CTR | ≥ 5% of holdings sessions |

## 13. Testing

- Unit: `src/lib/homepage/score-day-highlights.test.ts`, `src/lib/homepage/build-portfolio-recommendations.test.ts`
- Theme + responsive gates per `engineer-homepage` / `engineer-dashboard`
- E2E: `e2e/home-v2.spec.ts`

## 14. Rollout / migration

1. Done: Home is default at `/`; Classic behind `classic_home` at `/classic`.
2. `/home-v2` redirects to `/`.
3. `/demo` still uses Classic `Dashboard` for static seed parity.

## 15. Open questions

- Split `last_home_v2_visit_at` from AID visit when graduating.
- Whether company-analysis warm for holdings is Phase 2 of this flag or a separate plan.
- Tier packaging of AI brief after beta.

## 16. Related docs

- [`advanced-investor-dashboard.md`](advanced-investor-dashboard.md)
- [`company-analysis.md`](company-analysis.md)
- [`trefolio-mcp-user.md`](trefolio-mcp-user.md)
- [`dashboard-shell.md`](dashboard-shell.md)
- [`event-calendar.md`](event-calendar.md)
