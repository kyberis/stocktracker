# AID beta — compliance & accessibility sign-off

**Feature:** Advanced Investor Dashboard (`/aid`, flag `aid_beta`)  
**Last reviewed:** 2026-05-27  
**Status:** Ready for limited beta (staff + named testers)

## Legal (GDPR / financial)

| Check | Status | Notes |
|-------|--------|-------|
| Financial disclaimers on AID surfaces | Done | Page footer: `financialDataDisclaimer`, `aiDisclaimer`, `aidPageDisclaimer` |
| AI-generated news digest labeled | Done | Impact pills, cache/web badges, refresh honesty |
| Third-party processors documented | Done | Privacy Policy §5: Tavily, Clara, Will (2026-05-27) |
| Sister apps (Clara/Will) server-to-server only | Done | `GET /api/aid/insights`; no browser calls to sister URLs with service token |
| No new personal data fields in trefolio DB | Done | Reuses holdings, cache, IdP identity |
| Tavily receives ticker + search query only | Done | `src/lib/aid/tavily-search.ts` |
| OpenAI receives portfolio/news context for summaries | Done | Same stack as Warren; disclosed under OpenAI row |

**Residual:** Formal legal counsel review recommended before public marketing of AID.

## Accessibility (WCAG 2.1 AA target)

| Check | Status | Notes |
|-------|--------|-------|
| Semantic `<main>` on `/aid` | Done | `AidDashboard` |
| Modals: focus trap, Escape, labelled close | Done | `AidModalShell` |
| Period tabs: `role="tablist"` / `aria-selected` | Done | Portfolio + dividend modals |
| Touch targets ≥44px on primary controls | Done | Pills, modal close, Warren mobile opener |
| Focus visible on interactive elements | Done | `focus-visible:ring-2` on AID buttons/links |
| Color + text for gain/loss | Done | +/- percent with color |
| Live regions for loading / web search | Done | `role="status"` on loading and refresh |
| Icon-only controls have `aria-label` | Done | Modal close, refresh per ticker |

**Residual:** Full manual audit with screen reader (VoiceOver/NVDA) before GA.

## QA / launch

| Check | Status | Notes |
|-------|--------|-------|
| Unit tests API (`/api/aid/*`, cron) | Done | Vitest |
| E2E Playwright `e2e/aid-dashboard.spec.ts` | Done | CI job `e2e-aid` |
| Runbook | Done | `knowledge/runbooks/aid-beta-rollout.md` |
| Per-user flag script | Done | `scripts/enable-aid-beta-users.ts` |

## Cross-repo

| Check | Status | Notes |
|-------|--------|-------|
| Will `GET /api/internal/office/recent-tags` | Done | `external/notetaker` — deploy Will before relying on tags in prod |
