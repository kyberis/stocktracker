# Exec plan: Universal access with quotas (subscription model v2)

> Replace the binary "free vs pro feature gates" with a universal-access model
> with per-feature monthly/daily/yearly quotas. Free obtains all features with
> soft anti-abuse caps; Pro multiplies the AI- and premium-data quotas.

## Status

Implemented and shipped in release **2.0.0** (April 2026). This document is
retained for traceability; new follow-ups land in
[`tech-debt-tracker.md`](../tech-debt-tracker.md).

## Outcome

- Single Pro tier at €7.99/mo (annual €59.99/yr).
- Folio (Free) tier: every feature accessible, with quotas and soft storage caps.
- All `requirePro` and `requireFeatureAccess` call sites in API routes were
  migrated to `requireFeatureQuota(featureKey)`.
- New per-user quota counters reuse the existing `rate_limits` table under
  `provider = "quota:<feature>"`. No schema migration required.
- `/api/auth/me` now exposes a `quotas` object consumed by `QuotaUsageBadge`
  and `QuotaCompareTable`.
- Stripe legacy starter price keys removed.
- Locales `en` + `es` updated with quota copy. Other 33 locales fall back to en.

## Key files

- [`src/lib/platform-config.ts`](../../../src/lib/platform-config.ts) — `FEATURE_QUOTAS`, `SOFT_CAPS`.
- [`src/lib/feature-quotas.ts`](../../../src/lib/feature-quotas.ts) — counter helpers.
- [`src/lib/auth/guards.ts`](../../../src/lib/auth/guards.ts) — `requireFeatureQuota`.
- [`src/lib/subscription.ts`](../../../src/lib/subscription.ts) — `effectivePlan`, `getHoldingsLimit`.
- [`src/components/QuotaUsageBadge.tsx`](../../../src/components/QuotaUsageBadge.tsx).
- [`src/components/QuotaCompareTable.tsx`](../../../src/components/QuotaCompareTable.tsx).
- [`src/app/api/auth/me/route.ts`](../../../src/app/api/auth/me/route.ts).
- [`src/lib/release-notes.ts`](../../../src/lib/release-notes.ts) — version 2.0.0 entry.

## Open follow-ups

- Quota top-up packs (extra credits) — design pending.
- Re-enable mid-tier ("Bifolio") if data shows demand.
- Add Grafana dashboard for quota-exceeded 429s by feature.
