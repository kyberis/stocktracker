# landing

> Public `/landing` homepage.

## 1. Summary
Primary marketing page. Features section, pricing tiers, social proof, FAQ, CTA. Mirrors user-facing features via the `FEATURES` array.

## 2. Status
- **Tier:** public
- **Feature flag:** _none_
- **Health:** B
- **Owning skill:** [`product-manager`](../../.cursor/skills/product-manager/SKILL.md), [`sales`](../../.cursor/skills/sales/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| Page | [`src/app/landing/page.tsx`](../../src/app/landing/page.tsx) | Main landing. |
| Component | Rich feature cards + screenshots from `public/screenshots/`. |

## 4. Data model
- None beyond static content.

## 5. API surface
- None.

## 6. UI surface
- Hero, features grid, pricing, testimonials, FAQ.
- Header includes `NavAssetSearch` (`variant="landing"`) → `/analisis/[ticker]?exchange=…`.

## 7. Business logic
- FEATURES array governed by [`landing-page` rule](../../.cursor/rules/landing-page.mdc).
- Pricing tiers read from `subscription-tiers`.

## 8. External dependencies
- Images in `public/screenshots/`.

## 9. Currency / FX / tax implications
- Prices displayed in EUR/USD.

## 10. i18n
- Multi-locale.

## 11. Permissions / tier gating / rate limits
- Public.

## 12. Telemetry
- `landing_view_total`, CTA clicks per section.

## 13. Edge cases & gotchas
- Update FEATURES whenever a new user-visible Pro capability ships.

## 14. Tests
- E2E smoke.

## 15. Related skills and rules
- [`.cursor/rules/landing-page.mdc`](../../.cursor/rules/landing-page.mdc)
- [`seo-specialist`](../../.cursor/skills/seo-specialist/SKILL.md)
- Related specs: [demo-page](demo-page.md), [pricing](pricing.md).

## 16. Open questions / planned work
- A/B hero variants.
