# pricing

> Pricing section on landing + `/pricing` standalone page.

## 1. Summary
Visual pricing cards per tier (Free / Bifolio / Trefolio), including monthly/yearly/lifetime toggles.

## 2. Status
- **Tier:** public
- **Feature flag:** _none_
- **Health:** green
- **Owning skill:** [`sales`](../../.cursor/skills/sales/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| Component | Pricing cards on landing + `/pricing`. |
| Library | [`src/lib/pricing.ts`](../../src/lib/pricing.ts) | Price map. |

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
