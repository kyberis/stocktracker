# Product Context Reference

## Target Segments

- Primary: beginner-intermediate retail investors in Europe with 5-50 stocks/ETFs
- Secondary: expats managing multi-currency portfolios
- Tertiary: Spanish-speaking investors (Spain and Latin America)

## Positioning

- Core promise: portfolio tracking with clear insights and low-friction UX
- Differentiators: AI assistance, bilingual experience (EN/ES), broker import (DEGIRO), benchmark and projection tools

## Pricing Model

- Free:
  - limited AI usage (5 calls/month)
  - no Alpha Vantage premium data features
- Pro (2 EUR/month):
  - unlimited AI usage
  - Alpha Vantage-powered features
  - advanced insights and data features

## Decision Heuristics

Prefer features that:
- improve portfolio clarity, confidence, or actionability for primary users
- strengthen Free-to-Pro upgrade value
- reduce user setup friction (import, onboarding, defaults)
- are measurable with existing analytics pipeline

De-prioritize features that:
- add complexity without clear adoption value
- serve edge personas over the primary segment
- require large maintenance cost without retention or conversion upside

## Data Sources To Check

- `src/app/api/admin/analytics/route.ts`
- `src/app/api/analytics/events/route.ts`
- `src/lib/db/index.ts` (`trackEvent` and analytics summary methods)
- `src/lib/release-notes.ts` for recent shipped functionality
