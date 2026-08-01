# Company analysis (`/analisis`)

- **Status:** active
- **Owner:** agent
- **Started:** 2026-07-20
- **Target:** 2026-07-20

## Goal

Ship `/analisis` + `/analisis/[ticker]` with aggregated market data (incl. US Congress via FMP), trefolio-styled report UI, grounded AI narratives, and legal/editorial disclaimers.

## Acceptance criteria

- [x] Branch `feature/company-analysis` from main
- [x] Quota `company_analysis` + FMP senate/house helpers
- [x] `GET /api/company-analysis` with ticker validation, parallel sources, cache, no invented numbers
- [x] UI + primary nav Pro entry
- [x] Narrative endpoint grounded in payload
- [x] Spec, release notes, landing card
- [x] Unit tests for ticker/URL/technicals/congress empty/peer pick

## Launch checklist (product / legal — not tech blockers)

- [ ] Product/legal review of “Sector investment alternative” editorial framing
- [ ] Confirm FMP plan includes senate-trades / house-trades in production
- [ ] Privacy Policy: FMP already listed for market data; verify Congress disclosure wording if needed
- [ ] Optional screenshot for landing hero FEATURES array (card grid updated)

## Decisions log

- 2026-07-20: Primary nav `/analisis` (Spanish path as requested); Pro badge; StockChart not TradingView; FMP for Congress v1.

## Risks

- FMP Congress endpoints may be plan-restricted → section shows unavailable/empty.
- Peer list empty for some tickers → alternative unavailable.

## Follow-ups

- Optional: company-issued revenue guidance when a structured source exists (never label consensus as guidance).
- ~~Optional deep-link from `/stock/[ticker]` into `/analisis/[ticker]`.~~ Superseded by [`stock-page-unification.md`](stock-page-unification.md), which merges `/stock/[ticker]` into `/analisis/[ticker]` outright.
- Anonymous (no-login) access to this page and its APIs is tracked in [`public-analisis-access.md`](public-analisis-access.md).
