# Subscription Model v2 — Universal access with quotas

> Every feature is included on Free; Pro multiplies the per-feature monthly/daily limits.

## 1. Summary

trefolio v2.0.0 collapsed the previous binary "free vs pro feature gating" into a
single universal-access model. Every authenticated user can open every screen
in the app — fundamentals, intelligence, screener, moat reports, tax reports,
AI analysis, exports, share links, etc. What differs between Folio (Free) and
Trefolio (Pro) is the **monthly (or daily/yearly) quota** for each cost-bearing
endpoint.

## 2. Status

- **Tier:** Free / Trefolio
- **Feature flag:** _none_ (always-on after release `2.0.0`)
- **Health:** green
- **Owning skill:** [`.cursor/skills/engineer-payments-subscriptions/SKILL.md`](../../.cursor/skills/engineer-payments-subscriptions/SKILL.md)

## 3. Entry points

| Type | Path | Notes |
|------|------|-------|
| Library | [`src/lib/platform-config.ts`](../../src/lib/platform-config.ts) | `FEATURE_QUOTAS`, `SOFT_CAPS`, `FeatureQuotaKey` |
| Library | [`src/lib/feature-quotas.ts`](../../src/lib/feature-quotas.ts) | `checkAndIncrementFeatureQuota`, `refundFeatureQuota`, `getAllFeatureQuotas` |
| Guard | [`src/lib/auth/guards.ts`](../../src/lib/auth/guards.ts) | `requireFeatureQuota(req, featureKey)` |
| Library | [`src/lib/subscription.ts`](../../src/lib/subscription.ts) | `effectivePlan`, `getHoldingsLimit`, `canAccessTheme` |
| API | [`src/app/api/auth/me/route.ts`](../../src/app/api/auth/me/route.ts) | exposes per-feature `quotas` to the client |
| Component | [`src/components/QuotaUsageBadge.tsx`](../../src/components/QuotaUsageBadge.tsx) | "12 / 20 this month" badge |
| Component | [`src/components/QuotaCompareTable.tsx`](../../src/components/QuotaCompareTable.tsx) | landing/upsell quota table |

## 4. Data model

We **reuse** the existing `rate_limits` table (no new migrations).

- Quota counters are stored under provider keys prefixed with `quota:<feature>`,
  one row per `(user_id, "quota:<feature>", window)` tuple.
- The `window` value is one of `month`, `day`, or `year`.
- Reset bookkeeping is handled in `feature-quotas.ts` based on `FEATURE_QUOTAS[key].window`.

The legacy AI-call columns on `users` (`ai_calls_this_month`, `ai_calls_today`,
`portfolio_review_count`, `portfolio_review_reset_at`) remain populated for
backwards-compatible read paths but are no longer the source of truth for quota
enforcement.

## 5. API surface

| Method | Route | Auth | Quota | Description |
|--------|-------|------|-------|-------------|
| GET | `/api/auth/me` | session | — | Returns `quotas` object |
| POST | `/api/ai-analysis` | session | `ai_consult` | AI insight |
| POST | `/api/portfolio/ai-chat` | session | `ai_consult` | AI chat |
| POST | `/api/portfolio/chart-chat` | session | `ai_consult` | AI chart chat |
| POST | `/api/stock-evaluation/ai` | session | `ai_consult` | AI stock eval |
| POST | `/api/portfolio-review` | session | `ai_portfolio_review` | AI review |
| GET  | `/api/fundamentals/:symbol` | session | `fundamentals` | FMP fundamentals |
| GET  | `/api/etf-holdings/:symbol` | session | `etf_holdings` | ETF holdings |
| GET  | `/api/intelligence/:symbol` | session | `intelligence` | News + insights |
| GET  | `/api/economic-indicators` | session | `economic_indicators` | FRED data |
| GET  | `/api/screener` | session | `screener` | FMP screener |
| GET  | `/api/stock-evaluation` | session | `stock_evaluation` | FMP rating |
| GET  | `/api/crypto/*` | session | `crypto_pro` | Crypto premium |
| GET  | `/api/tax/report` | session | `tax_report` | Tax report (yearly) |
| GET  | `/api/portfolio/score` | session | `portfolio_score` | Score |
| GET  | `/api/export/portfolio` | session | `csv_export` | CSV/XLSX export |
| POST | `/api/support-chat` | session | `support_chat` | Support chat (daily) |

When a quota is exceeded, the guard returns HTTP **429** with body:

```json
{
  "paywall": true,
  "reason": "quota_exceeded",
  "feature": "fundamentals",
  "used": 20,
  "limit": 20,
  "resetAt": "2026-05-01T00:00:00.000Z",
  "upgradeUrl": "/billing"
}
```

## 6. UI surface

- `QuotaUsageBadge` — shown next to feature titles. Pulls usage from
  `useAuth().user.quotas[feature]`.
- `QuotaCompareTable` — embedded in `ProCompareCard` and the landing pricing
  section.
- `TierFeatureBadge` — kept as a no-op for backward compatibility (most call
  sites still import it).

## 7. Business logic

- Quota check & increment is atomic per request: increment first, then on
  downstream failure call `refundFeatureQuota`.
- Admin users (`session.role === "admin"`) bypass quotas.
- Soft caps (`SOFT_CAPS`) gate **storage** entities (holdings, portfolios,
  alerts, manual assets, share links). They are not API quotas — exceeding them
  just blocks new inserts.

## 8. External dependencies

- OpenAI — protected by `ai_consult` / `ai_portfolio_review` / `ai_import` quotas
  plus the global `requireRateLimit("openai")` guard.
- FMP / Alpha Vantage / Finnhub — protected by per-feature quotas plus the
  global per-provider rate-limit guards.
- Stripe — checkout endpoint maps `pro_monthly` and `pro_annual` only; legacy
  starter price keys removed from `StripePriceKey` and admin UI.

## 9. Currency / FX / tax implications

None.

## 10. i18n

- Canonical: [`src/locales/en.ts`](../../src/locales/en.ts) and
  [`src/locales/es.ts`](../../src/locales/es.ts).
- New keys: `quotaUsageAria`, `quotaUsageUpgrade`, `quotaExceededTitle`,
  `quotaExceededBody`, `quotaRemainingShort`, `quotaResetsOn`,
  `quotaTableTitle`, `quotaTableFeature`, `quotaTableFree`, `quotaTablePro`,
  `quotaTableUnit`, `quotaTableUnitDay`, `quotaTableUnitYear`,
  `quotaTableUnlimited`, `landingPricingQuotasHeading`,
  `landingPricingQuotasSubtitle`.
- Other 33 locales fall back to `en` via `t()` (lookup is `strings[key] || en[key] || key`).

## 11. Permissions / tier gating / rate limits

- Plan gating: removed. Every feature is universally accessible.
- Rate limits: enforced per-feature via `requireFeatureQuota`.
- Upstream-provider rate limits: still enforced via `requireRateLimit`.

## 12. Telemetry

- 429 quota responses can be filtered in observability with
  `paywall=true reason=quota_exceeded`.
- Stripe checkout events are emitted by `ProCompareCard` (`upgrade_compare_*`).

## 13. Edge cases & gotchas

- **Demo mode**: `/demo` uses static data and does not call quota-protected
  routes, so counters are never incremented.
- **Refunds**: Every quota-consuming route refunds the increment if the
  downstream provider call fails or returns an error.
- **Existing Pro users**: untouched. Their plan still resolves via `effectivePlan`.
- **Existing Free users with >100 holdings**: grandfathered — they keep their
  data but cannot insert new ones until under the soft cap.

## 14. Tests

- Unit: see `src/lib/__tests__/feature-quotas.test.ts` (this release).
- E2E: see `e2e/subscription-quotas.spec.ts` (this release).

## 15. Related skills and rules

- Skill: [`.cursor/skills/engineer-payments-subscriptions/SKILL.md`](../../.cursor/skills/engineer-payments-subscriptions/SKILL.md)
- Skill: [`.cursor/skills/engineer-feature-flags/SKILL.md`](../../.cursor/skills/engineer-feature-flags/SKILL.md)
- Rule: [`.cursor/rules/release-notes.mdc`](../../.cursor/rules/release-notes.mdc)
- Rule: [`.cursor/rules/landing-page.mdc`](../../.cursor/rules/landing-page.mdc)

## 16. Open questions / planned work

- One-time top-up packs (extra quota purchases) — out of scope for v2.0.
- Mid-tier ("Bifolio") — explicitly retired in this release.
- Future: per-feature overage pricing (charge for usage beyond Pro limits).
