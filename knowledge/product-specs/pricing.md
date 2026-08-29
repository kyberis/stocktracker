# pricing

> Pricing section on landing + `/pricing` standalone page.

## 1. Summary
Visual pricing cards for Free / Basic / Pro / Wealth · Ultra, including monthly/annual toggle. Hidden entirely when the `commerce_enabled` flag is off. See [subscription-tiers-v3](subscription-tiers-v3.md).

## 2. Status
- **Tier:** public
- **Feature flag:** `commerce_enabled` (hides pricing cards, upsell CTAs, and checkout when off)
- **Health:** green
- **Owning skill:** [`sales`](../../.cursor/skills/sales/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| Component | `PricingSection` in [`src/app/landing/page.tsx`](../../src/app/landing/page.tsx) | Landing + `/pricing`. |
| Library | [`src/lib/platform-config.ts`](../../src/lib/platform-config.ts), [`src/lib/subscription.ts`](../../src/lib/subscription.ts) | Quota + plan source of truth. |
| Library | [`src/lib/db/settings.ts`](../../src/lib/db/settings.ts) | `StripePriceKey` (`pro_monthly`, `pro_annual`) — Stripe price IDs, never hard-coded. |

## 4. Data model
- Prices in code, Stripe price IDs in DB.

## 5. API surface
- None.

## 6. UI surface
- Interval toggle + "most popular" badge.

## 7. Business logic
- Hidden promo banners driven by `admin-promo-banner`.

## 8. External dependencies
- None.

## 9. Currency / FX / tax implications
- EUR primary, USD secondary; VAT handled by Stripe.

## 10. i18n
- All locales.

## 11. Permissions / tier gating / rate limits
- Public.

## 12. Telemetry
- `pricing.cta_click_total`.

## 13. Edge cases & gotchas
- Keep feature list aligned with `subscription-tiers`.

## 14. Tests
- Smoke.

## 15. Related skills and rules
- [`sales`](../../.cursor/skills/sales/SKILL.md)
- [`.cursor/rules/landing-page.mdc`](../../.cursor/rules/landing-page.mdc)
- Related specs: [subscription-tiers](subscription-tiers.md).

## 16. Open questions / planned work
- Localized pricing.
