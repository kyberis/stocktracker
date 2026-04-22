# subscription-tiers

> Tier definitions and feature mapping (Free / Bifolio / Trefolio).

## 1. Summary
Central source of tier → feature map. Used by paywall, UI badges, and server-side checks.

## 2. Status
- **Tier:** system
- **Feature flag:** _none_
- **Health:** green
- **Owning skill:** [`engineer-payments-subscriptions`](../../.cursor/skills/engineer-payments-subscriptions/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| Library | [`src/lib/subscription-features.ts`](../../src/lib/subscription-features.ts), [`pricing.ts`](../../src/lib/pricing.ts) | Maps + price IDs. |

## 4. Data model
- `subscriptions`: price_id, current tier, period_end.

## 5. API surface
- Surfaces helpers `requireSubscriptionFeature(name)` and `getEntitlements(userId)`.

## 6. UI surface
- Pricing cards on landing, badges on Pro features.

## 7. Business logic
- Feature list per tier is the single source of truth; new gated features must be added here.

## 8. External dependencies
- None.

## 9. Currency / FX / tax implications
- Prices displayed in EUR (primary), USD (secondary). Stripe handles tax.

## 10. i18n
- Tier names: "Free" / "Bifolio" / "Trefolio" (unchanged across locales).

## 11. Permissions / tier gating / rate limits
- Admin can override for support purposes.

## 12. Telemetry
- N/A (configuration).

## 13. Edge cases & gotchas
- Users grandfathered at old prices retain their entitlements.

## 14. Tests
- Unit on tier resolution.

## 15. Related skills and rules
- [`engineer-payments-subscriptions`](../../.cursor/skills/engineer-payments-subscriptions/SKILL.md)
- Related specs: [paywall](paywall.md), [stripe-checkout](stripe-checkout.md).

## 16. Open questions / planned work
- Explicit trial tier entitlements.
