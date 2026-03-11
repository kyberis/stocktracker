# Product Context Reference

## Target Segments

- **Primary ("Marta"):** Beginner-to-intermediate European retail investors, 25-45, holding 5-50 stocks/ETFs
- **Secondary ("Jens"):** Expats managing multi-currency portfolios across 2-3 exchanges
- **Tertiary ("Lucia"):** Non-English-speaking European investors relying on 35-language support

Full persona definitions: [design-system.md](design-system.md) Section A.

## Positioning

- Core promise: the simplest way to track your stock portfolio with AI-powered insights
- Differentiators: AI assistance, 35 European languages, 14 broker imports (DEGIRO, IBKR, Trading 212, Revolut, etc.), benchmark and projection tools, affordable 3-tier pricing
- Tagline: "Your portfolio. Understood."

## Pricing Model

| Tier | Name | Monthly | Annual | Holdings | AI Calls | Alerts |
|---|---|---|---|---|---|---|
| Free | **Folio** | 0 EUR | 0 EUR | 15 | 5/month | 2 (in-app) |
| Starter | **Bifolio** | 2.99 EUR | 23.99 EUR | 50 | 20/month | 10 + email/push |
| Pro | **Trefolio** | 7.99 EUR | 59.99 EUR | Unlimited | Unlimited | Unlimited |

Trefolio also includes: fundamentals, economic indicators, intelligence (news/insider/institutional), dividend calendar, tax reports, portfolio sharing, and priority support.

## Decision Heuristics

Prefer features that:
- improve portfolio clarity, confidence, or actionability for primary users
- strengthen Folio-to-Bifolio or Bifolio-to-Trefolio upgrade value
- reduce user setup friction (import, onboarding, defaults)
- are measurable with existing analytics pipeline

De-prioritize features that:
- add complexity without clear adoption value
- serve edge personas over the primary segment
- require large maintenance cost without retention or conversion upside

## Design Reference

For visual tokens, component patterns, voice/tone, and customer personas, see the full design system: [design-system.md](design-system.md).

## Data Sources To Check

- `src/app/api/admin/analytics/route.ts`
- `src/app/api/analytics/events/route.ts`
- `src/lib/db/index.ts` (`trackEvent` and analytics summary methods)
- `src/lib/release-notes.ts` for recent shipped functionality
