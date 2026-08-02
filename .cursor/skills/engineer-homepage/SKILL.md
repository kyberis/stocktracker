---
name: engineer-homepage
description: Owns the unified daily homepage (Home v2 at /home-v2) — information architecture, habit loop, day highlights, movers/catalysts composition, MCP CTA, and graduation path to default /. Use when building or changing the authenticated home preview, day-highlight scoring, or home habit telemetry.
---

# Homepage Engineer (Home v2)

## Scope

Own the **daily check-in homepage** experience that merges Classic portfolio depth with AID briefing patterns.

- Preview route: `/home-v2` behind flag `home_v2`
- Does **not** own Classic `/` tabs/tooling (see `engineer-dashboard`) or full AID control panel (see AID spec) — only composition that reuses them
- Coordinates with `engineer-dashboard`, `engineer-feature-flags`, `analytics-instrumentation`, `theme-parity`, `engineer-mobile`, `ux-writer`

## Primary files

| Area | Path |
|------|------|
| Page | `src/app/(app)/home-v2/page.tsx` |
| Shell | `src/components/homepage/HomeV2Dashboard.tsx` |
| CTA | `src/components/homepage/HomeV2BetaCta.tsx` |
| Sections | `src/components/homepage/Home*.tsx` |
| Scorer | `src/lib/homepage/score-day-highlights.ts` |
| API | `src/app/api/home-v2/day-highlights/route.ts` |
| Spec | `knowledge/product-specs/unified-homepage.md` |
| Plan | `knowledge/exec-plans/active/unified-homepage.md` |
| Mock | `public/mockups/unified-homepage-v1.html` |

## Information architecture (must preserve)

1. Morning brief (since last visit)
2. Portfolio hero + day P&L / matrix
3. Movers \| Catalysts twin row
4. Day highlights chips
5. Allocation (always visible)
6. Holdings table/cards
7. FinPulse / priority teaser (compact)
8. Rail: Warren nudge · Claude MCP CTA · digests

Mobile: same order; MCP after holdings.

## Implementation rules

- **Compose, don’t fork** — import `PortfolioHeroCard`, `AllocationTabs`, `PortfolioTable` / `PortfolioCards`, AID brief/nudge helpers.
- **Flag gate** — page + day-highlights API require `home_v2`. AID data routes: `aid_beta || home_v2`.
- **Empty states** — hide day-highlights / movers / catalysts when no rows; empty portfolio gets add-holding CTA.
- **Design system** — semantic tokens, `.card`, glass chrome; no hard-coded purple marketing gradients on app home.
- **i18n** — all strings via locales; EN + ES required.
- **MCP CTA** — honest PAT / `claude_desktop_config.json` path; never imply OAuth Client ID works.
- **Money** — `formatCurrency` / `formatPercent`; EUR base in calc, display currency for UI.
- **Accessibility** — gain/loss with color + symbol; focusable chips; touch ≥44px on mobile.

## Day-highlight signal priority

1. Earnings today/tomorrow  
2. Large day move (±3% / ±5%) + optional news bullet  
3. High-impact AID news  
4. Triggered alerts  
5. Near 52w high/low  
6. Ex-div within 7–14d  

Defer to later phases: company-analysis volume/MAs/insiders batch warm, MOAT tension, full FinPulse.

## Habit loop

- Mark visit (~8s) via `POST /api/aid/status` while sharing AID visit timestamp (documented beta shortcut).
- Track `home_v2_return_within_24h`, section views, highlight/MCP CTRs.
- Targets: return-in-24h ≥30%; highlight CTR ≥15%; MCP CTR ≥5%.

## Quality gates

Same as `engineer-dashboard` for touched UI:

- [ ] E2E `e2e/home-v2.spec.ts` (flag off + on + empty)
- [ ] Unit tests for scorer
- [ ] Four themes
- [ ] 375 / 768 / 1280
- [ ] Capacitor safe areas if layout shared with mobile shell
- [ ] Release notes when user-visible
- [ ] Do **not** break `/` or `/aid`

## Graduation (later)

When product approves: make Home v2 the default `/`, add demo-shell parity, update landing if marketed, decide `/aid` fate. Until then **never** change default home without an explicit plan update.

## Coordination

| Concern | Skill |
|---------|--------|
| Charts / classic widgets | `engineer-dashboard` |
| Flags | `engineer-feature-flags` |
| Events | `analytics-instrumentation` |
| Copy | `ux-writer` |
| Themes | `theme-parity` |
| Native | `engineer-mobile` |
| MCP docs / PAT | `engineer-integrations` + `trefolio-mcp-user` spec |
| Legal (MCP claims, financial UI) | `legal-advisor` |
