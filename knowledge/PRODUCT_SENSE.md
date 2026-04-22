# PRODUCT_SENSE.md — product philosophy and positioning

## Who we build for

Primary persona: **European retail investor with a multi-broker, multi-currency
portfolio** who wants clean reporting and EU-compliant tax output without a
spreadsheet.

Secondary: **power users** who want AI-assisted analysis, screening, rebalancing,
and a dedicated desk-top device ("trefolio Leaf").

## Tiers (as of current release)

| Tier | Price | Target |
|------|-------|--------|
| **Folio (Free)** | €0 | First-time trackers; low commitment. |
| **Bifolio** | €2.99/mo | Regulars who want alerts, sharing, history. |
| **Trefolio** | €7.99/mo | Investors who want tax reports, screener, unlimited AI. |

Tier definitions (features and limits) are the source of truth in
[`src/lib/subscription-features.ts`](../src/lib/subscription-features.ts) (or
similar) and mirrored in [`README.md`](../README.md) and
[`src/app/landing/page.tsx`](../src/app/landing/page.tsx). When these drift, we
update the code first, then the marketing.

## Value promises (must stay true)

1. **European first.** EU tax output, 21 currencies, 35 UI locales, €-base.
2. **Explains, not confuses.** AI output is plain-language, not jargon.
3. **Your data stays yours.** GDPR, EU-hosted, no selling, no dark-pattern
   tracking (consent-gated analytics only).
4. **Cheap.** Cheaper than a coffee at the Bifolio tier.
5. **Fast.** Dashboard interactive under one second on mid-range Android.

## What we don't build

- A brokerage. We don't take custody of assets or execute trades.
- A financial-advice service. We surface data; humans decide.
- A US-first product. The US is a long-tail market for us; we don't bend the
  product to it.
- A social trading platform. The social layer is opinions and journals, not
  copy-trading.

## How we decide what ships

1. Does it move a tier's value proposition forward?
2. Does it produce data we can use to improve the next iteration?
3. Can an agent build and maintain it without new human-coded tooling?
4. Does it fit the legibility/reliability bar in
   [`DESIGN.md`](DESIGN.md) / [`RELIABILITY.md`](RELIABILITY.md)?

If all four are "yes," it's a candidate. If the second is "no," we instrument
first.

## Free-to-Pro loops

- Onboarding wizard pushes users to connect a broker (SnapTrade) or import a
  CSV. Value is visible in < 3 minutes.
- Pro-gated UI uses `BlurredProSection` to show the shape of the feature, not
  a locked door.
- Trial invitation cron ([`/api/cron/trial-invitations`](../src/app/api/cron/trial-invitations))
  offers 7-day Trefolio to users with real holdings and a week of activity.

## Pricing psychology

- Annual billing discount built in; monthly is the anchor.
- €2.99 Bifolio is the "yes-no" decision price.
- €7.99 Trefolio is the "I use this daily" price.
- Admin-only [`stripe-prices`](../src/app/api/admin/stripe-prices) endpoint is
  the single source of truth for Stripe `priceId`s. Never hard-code a price.

## Marketing voice

See [`.cursor/skills/ux-writer/SKILL.md`](../.cursor/skills/ux-writer/SKILL.md).
Short sentences. Plain language. Never over-promise. No "magic." Respect the
user's expertise level (beginner/intermediate/experienced/professional).

## Metrics that matter

- Signup -> first holding (activation).
- First holding -> 7-day retention.
- 7-day -> paid conversion.
- Paid -> annual conversion.
- Monthly AI usage per paid user.

Instrumented through
[`analytics-instrumentation`](../.cursor/skills/analytics-instrumentation/SKILL.md).

## Red lines

- Don't sell user data. Ever.
- Don't run unconsented tracking.
- Don't display prices without a financial disclaimer on the same page.
- Don't ship features behind hidden paywalls; be explicit about tiers.
