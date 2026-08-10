# subscription-tiers

> Tier definitions and quota mapping (Free / Trefolio Pro). See [subscription-model-v2](subscription-model-v2.md) for the full v2.0 universal-access-with-quotas design.

## 1. Summary
Central source of tier → quota map. Every feature is available on both tiers; Pro multiplies the per-feature quota. Used by paywall UI, quota badges, and server-side quota checks.

## 2. Status
- **Tier:** system
- **Feature flag:** _none_
- **Health:** green
- **Owning skill:** [`engineer-payments-subscriptions`](../../.cursor/skills/engineer-payments-subscriptions/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| Library | [`src/lib/platform-config.ts`](../../src/lib/platform-config.ts) | `FEATURE_QUOTAS`, `SOFT_CAPS`. |
| Library | [`src/lib/subscription.ts`](../../src/lib/subscription.ts) | `effectivePlan`, `getHoldingsLimit`, `canAccessTheme` (always `true`). |
| Library | [`src/lib/feature-quotas.ts`](../../src/lib/feature-quotas.ts) | `checkAndIncrementFeatureQuota`, `getAllFeatureQuotas`. |
| Guard | [`src/lib/auth/guards.ts`](../../src/lib/auth/guards.ts) | `requireFeatureQuota(req, featureKey)`. |

## 4. Data model
- Quota counters reuse `rate_limits`, keyed `quota:<feature>` (see subscription-model-v2). No separate `subscriptions` tier table beyond `users.plan` / `plan_expires_at`.

## 5. API surface
- `GET /api/auth/me` exposes `quotas` per feature key.
- `requireFeatureQuota(featureKey)` gates cost-bearing routes.

## 6. UI surface
- Pricing cards on landing (`/pricing`, `PricingSection`), `QuotaUsageBadge`, `QuotaCompareTable`.

## 7. Business logic
- Two plans: `"free" | "pro"` (`SubscriptionPlan` in `src/lib/subscription.ts`). Feature access is universal; `FEATURE_QUOTAS`/`SOFT_CAPS` are the single source of truth for the free/pro limit on each feature — new cost-bearing features add an entry there, not a new gate.

## 8. External dependencies
- Stripe: only `pro_monthly` / `pro_annual` price keys exist (`StripePriceKey` in `src/lib/db/settings.ts`).

## 9. Currency / FX / tax implications
- Prices displayed in EUR (primary), USD (secondary). Stripe handles tax.

## 10. i18n
- Tier display names: "Folio" (free) / "Trefolio" (pro) — see `planDisplayName` in `src/lib/subscription.ts`. "Bifolio" was a mid-tier retired in the 2.0.0 release; do not reintroduce it in copy.

## 11. Permissions / tier gating / rate limits
- Admin (`session.role === "admin"`) bypasses quotas.

## 12. Telemetry
- 429 quota responses filterable via `paywall=true reason=quota_exceeded`.

## 13. Edge cases & gotchas
- Existing Pro users and legacy `"starter"` (Bifolio) Stripe price holders are grandfathered onto `pro` entitlements (see `src/app/api/billing/webhook/route.ts`); no new "starter" signups are possible.

## 14. Tests
- Unit: `src/lib/__tests__/feature-quotas.test.ts`. E2E: `e2e/subscription-quotas.spec.ts`.

## 15. Related skills and rules
- [`engineer-payments-subscriptions`](../../.cursor/skills/engineer-payments-subscriptions/SKILL.md)
- Related specs: [subscription-model-v2](subscription-model-v2.md), [paywall](paywall.md), [pricing](pricing.md), [stripe-checkout](stripe-checkout.md).

## 16. Open questions / planned work
- One-time quota top-up packs (out of scope for v2.0).
