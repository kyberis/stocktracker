# paywall

> Enforces tier gating on Pro features both server- and client-side.

## 1. Summary
Client-side component that shows an upgrade card when a user hits a Pro feature, and server helpers (`requireSubscriptionFeature`) that return 402 on Pro-only endpoints.

## 2. Status
- **Tier:** system
- **Feature flag:** _none_
- **Health:** B
- **Owning skill:** [`engineer-payments-subscriptions`](../../.cursor/skills/engineer-payments-subscriptions/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| Component | `PaywallCard.tsx` (if present). |
| Library | [`src/lib/subscription-features.ts`](../../src/lib/subscription-features.ts) | Gate helpers. |

## 4. Data model
- Reads `subscriptions`.

## 5. API surface
- 402 status with `{ feature, tier_required }` body when gated.

## 6. UI surface
- Upgrade card with CTAs.

## 7. Business logic
- Centralized mapping of feature → required tier.
- Respects active trials.

## 8. External dependencies
- Stripe.

## 9. Currency / FX / tax implications
- Prices localized via tiers.

## 10. i18n
- All locales.

## 11. Permissions / tier gating / rate limits
- System-wide.

## 12. Telemetry
- `paywall_hits_total{feature}`.

## 13. Edge cases & gotchas
- Double-gating (flag + tier) must be ordered: flag first, then tier.

## 14. Tests
- Unit on gate resolution.

## 15. Related skills and rules
- [`engineer-payments-subscriptions`](../../.cursor/skills/engineer-payments-subscriptions/SKILL.md)
- Related specs: [subscription-tiers](subscription-tiers.md).

## 16. Open questions / planned work
- Soft paywall for "peek" screens.
