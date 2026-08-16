# landing

> Public `/landing` homepage.

## 1. Summary
Primary marketing page. Hero feature blocks, feature-card grid, pricing tiers, social proof, FAQ, CTA. Mirrors user-facing capabilities via `getHeroFeatures` / `getFeatureCards` (i18n-driven).

## 2. Status
- **Tier:** public
- **Feature flag:** _none_
- **Health:** B
- **Owning skill:** [`product-manager`](../../.cursor/skills/product-manager/SKILL.md), [`sales`](../../.cursor/skills/sales/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| Page | [`src/app/landing/page.tsx`](../../src/app/landing/page.tsx) | Main landing. |
| Copy | [`src/locales/en.ts`](../../src/locales/en.ts) / [`es.ts`](../../src/locales/es.ts) | `landingFeature*` / `landingCard*` keys. |
| Screenshots | [`public/screenshots/`](../../public/screenshots/) | Dark-theme PNGs; screening hero uses `investment-screening.png`. |

## 4. Data model
- None beyond static content.

## 5. API surface
- [`src/app/api/analytics/landing/route.ts`](../../src/app/api/analytics/landing/route.ts) — anonymous landing events.
- [`src/app/api/landing/stats/`](../../src/app/api/landing/stats/) — public stats for social proof.

## 6. UI surface
- Market ticker, nav (`NavAssetSearch` `variant="landing"` → `/analisis/[ticker]`), hero, agents, features (6 hero blocks + card grid), pricing (Folio / Trefolio + quota table), FAQ, PWA / mobile / device, footer.
- Hero order: Portfolio → Dividends → AI Insights → **Investment Screening** → Import → Warren Telegram.
- Screening CTA: `/screening`. Not tier-badged (flag-gated in-app, same weekly quota on Folio and Trefolio).

## 7. Business logic
- `getHeroFeatures` / `getFeatureCards` governed by [`.cursor/rules/landing-page.mdc`](../../.cursor/rules/landing-page.mdc).
- Pricing tiers read from `subscription-tiers`.
- Universal-access model: no "Pro only" badges on screening / screener cards. Agent Office may still show a Trefolio badge.

## 8. External dependencies
- Images in `public/screenshots/`.

## 9. Currency / FX / tax implications
- Prices displayed in EUR/USD.

## 10. i18n
- Multi-locale. New landing keys ship in EN + ES; other locales fall back to English.

## 11. Permissions / tier gating / rate limits
- Public. In-app screening remains behind `investment_screening_enabled`.

## 12. Telemetry
- `landing_view_total`, CTA clicks per section (`feature_screening` for the screening hero CTA).

## 13. Edge cases & gotchas
- Update `getHeroFeatures` / `getFeatureCards` (and EN/ES copy) when a new user-visible capability ships.
- Screening marketing must keep the "research aid / not financial advice" disclaimer.
- Do not badge screening as Trefolio-only.

## 14. Tests
- E2E smoke (`e2e/auth.spec.ts` unauthenticated landing).

## 15. Related skills and rules
- [`.cursor/rules/landing-page.mdc`](../../.cursor/rules/landing-page.mdc)
- [`seo-specialist`](../../.cursor/skills/seo-specialist/SKILL.md)
- [`legal-advisor`](../../.cursor/skills/legal-advisor/SKILL.md) — marketing copy + financial disclaimer
- Related specs: [demo-page](demo-page.md), [pricing](pricing.md), [investment-screening](investment-screening.md), [stock-screener](stock-screener.md).

## 16. Open questions / planned work
- A/B hero variants.
