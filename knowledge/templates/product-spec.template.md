# <Feature name>

> One-line tagline that describes what this feature is.

## 1. Summary

<1-3 sentences: who uses it, what it does, why it exists.>

## 2. Status

- **Tier:** Free / Bifolio / Trefolio / Admin / Experimental
- **Feature flag:** `<flag key>` or _none_
- **Health:** green / yellow / red (see [QUALITY_SCORE](../QUALITY_SCORE.md))
- **Owning skill:** [`.cursor/skills/<skill>/SKILL.md`](../../.cursor/skills/)

## 3. Entry points

| Type | Path | Notes |
|------|------|-------|
| Page | `src/app/...` | |
| API | `src/app/api/.../route.ts` | |
| Cron | `src/app/api/cron/.../route.ts` | schedule from [`cron-registry.ts`](../../src/lib/cron-registry.ts) |
| Modal/Component | `src/components/...` | |
| Webhook | `src/app/api/webhooks/...` | |

## 4. Data model

Tables in [`src/lib/db/`](../../src/lib/db) and types in [`src/lib/types.ts`](../../src/lib/types.ts):

- `table_name` — columns, indexes, unique constraints.
- `TypeName` — shape used across layers.

Schema source: migrations in [`src/lib/db/migrations.ts`](../../src/lib/db/migrations.ts).

## 5. API surface

| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| GET | `/api/...` | user / admin | Free | ... |

Input/output shapes (Zod): reference `src/app/api/.../route.ts`.

## 6. UI surface

- Page(s): `src/app/...`
- Components: `src/components/...`
- Context consumers: `PortfolioProvider`, `FeatureFlagProvider`, ...

## 7. Business logic

- Pure functions: `src/lib/...`
- Side-effectful services: `src/lib/...`
- Algorithms or formulas worth calling out.

## 8. External dependencies

- Providers / SDKs: Stripe / Resend / Yahoo / OpenAI / SnapTrade / ...
- Env vars used.
- Rate limits or quotas.

## 9. Currency / FX / tax implications

- Is money stored in EUR? How is it displayed?
- FX fetch path and fallbacks.
- Withholding-tax country rules (if applicable).

## 10. i18n

- Locales covered. Copy keys live in [`src/locales/`](../../src/locales).
- Email locales in [`src/lib/email-i18n/`](../../src/lib/email-i18n).

## 11. Permissions / tier gating / rate limits

- Required `SubscriptionFeature` keys.
- Rate-limit table entries ([`src/lib/db/rate-limits.ts`](../../src/lib/db/rate-limits.ts)).
- Admin-only access flag.

## 12. Telemetry

- Events emitted (`analytics_events`, Meta Pixel, GA, conversion events).
- Metrics pushed (`prom-client`, Grafana).
- Log lines worth searching for.

## 13. Edge cases & gotchas

- Empty state / null values.
- Timezone issues.
- Market-hours behavior.
- Demo-mode behavior (`data/demo-*.json`).
- Mobile/Capacitor-specific behavior (if any).

## 14. Tests

- Unit: `src/lib/**/__tests__/...` or `*.test.ts`.
- E2E: [`e2e/...`](../../e2e).
- Manual smoke steps (if any).

## 15. Related skills and rules

- Skills: `.cursor/skills/<skill>/SKILL.md`
- Rules: `.cursor/rules/<rule>.mdc`
- Related specs: `knowledge/product-specs/<slug>.md`

## 16. Open questions / planned work

- List issues, debts, unanswered questions.
- Active plans: [`knowledge/exec-plans/active/`](../exec-plans/active).
