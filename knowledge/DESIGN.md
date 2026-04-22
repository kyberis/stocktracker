# DESIGN.md — engineering design principles

These are the invariants that keep the codebase legible to future agent runs.
Deep patterns live in [`design-docs/`](design-docs/README.md); this file is the
short list of non-negotiables.

## 1. Parse at the boundary

Every untyped input — API request body, query string, provider response,
broker CSV row, AI output — is parsed with Zod (or equivalent) at the first
layer that receives it. Inside the app, we treat types as truth. See
[`src/lib/api-response.ts`](../src/app/lib/api-response.ts) and
[`src/lib/api-providers/response.ts`](../src/lib/api-providers/response.ts).

## 2. EUR is the base currency

All stored money lives in EUR. Quotes are fetched in native currency and
converted using [`src/lib/exchange-rates.ts`](../src/lib/exchange-rates.ts).
Display conversion happens at the UI edge, never mid-calculation. GBX is
handled explicitly (penny sterling, divide by 100). See
[`design-docs/eur-base-fx.md`](design-docs/eur-base-fx.md).

## 3. Money is never rounded mid-calculation

Use full precision in math. Round at display time using the currency
formatters in [`src/lib/formatters.ts`](../src/lib/formatters.ts) (or similar).
Never multiply/divide rounded values.

## 4. Reads are hot, writes are cold

Data access in [`src/lib/db/`](../src/lib/db) is organized so that dashboard
renders are a handful of fast reads against indexed columns, and writes
(transactions, imports, sync) go through explicit service functions that
derive holdings ([`src/lib/derive-holdings.ts`](../src/lib/derive-holdings.ts)).

## 5. Snapshots are the source of historical truth

Intraday values come from live quotes. Historical series come from
`portfolio_snapshots`. Never compute history on the fly from transactions in a
user-facing path; materialize it instead. See
[`design-docs/snapshots-materialization.md`](design-docs/snapshots-materialization.md).

## 6. Demo mode is a first-class constraint

`PortfolioProvider` supports `demoMode={true}` which disables every API fetch
and every localStorage write. The demo page renders the real dashboard with
static seed data. Any new effect that makes an API call or writes to
localStorage must be gated behind `if (demoMode) return;`. See
[`.cursor/rules/demo-page.mdc`](../.cursor/rules/demo-page.mdc) and
[`design-docs/demo-mode-contract.md`](design-docs/demo-mode-contract.md).

## 7. Feature flags gate experimental work

New experimental features ship behind a flag consumed with `useFeatureFlag()`
on the client and `getServerFeatureFlag()` on the server. Flags are per-user
overridable from the admin UI. See
[`design-docs/tier-gating-pattern.md`](design-docs/tier-gating-pattern.md).

## 8. Cron jobs are a registry, not ad-hoc

Every scheduled job must be registered in
[`src/lib/cron-registry.ts`](../src/lib/cron-registry.ts) **and**
`vercel.json`, must use `withCronLogging()` for `cron_executions` visibility,
and must push Prometheus gauges via the `push-gauges` cron. See
[`.cursor/rules/cron-jobs.mdc`](../.cursor/rules/cron-jobs.mdc).

## 9. Release notes are mandatory

Every user-visible change (`feature`, `improvement`, `fix`) adds an entry to
[`src/lib/release-notes.ts`](../src/lib/release-notes.ts) in both English
(`text`) and Spanish (`textEs`). See
[`.cursor/rules/release-notes.mdc`](../.cursor/rules/release-notes.mdc).

## 10. Prefer shared utilities over one-off helpers

If you're about to write `formatCurrency`, a retry-with-backoff, or a concurrency
limiter — check [`src/lib/`](../src/lib) first. If it exists, use it. If it
almost exists, extend it. One-off copies compound and drift.

## 11. Agent legibility beats cleverness

Code is written to be readable by the next agent run. This means:

- Explicit names over abbreviations.
- Small, single-purpose functions.
- Pure logic separated from IO.
- Zod schemas co-located with routes.
- Skills and rules that tell the agent *where to look*, not just *what to do*.

## 12. Taste invariants enforced mechanically

Where human taste matters — logging shape, file size, naming — we encode it as
a lint or a test so it applies everywhere at once, not as a Slack reminder.
See the doc-gardener skill at
[`.cursor/skills/doc-gardener/SKILL.md`](../.cursor/skills/doc-gardener/SKILL.md).

## 13. Landing page and demo stay in sync with the product

Two always-applied rules enforce this:
[`landing-page.mdc`](../.cursor/rules/landing-page.mdc) and
[`demo-page.mdc`](../.cursor/rules/demo-page.mdc). When a new user-visible
capability ships, both are updated in the same PR.

## 14. Legal disclaimers are load-bearing

We're not a licensed broker. Every page that shows market or investment data
carries the financial-disclaimer footer. See
[`.cursor/rules/legal-compliance.mdc`](../.cursor/rules/legal-compliance.mdc)
and [`src/app/privacy/page.tsx`](../src/app/privacy/page.tsx),
[`src/app/terms/page.tsx`](../src/app/terms/page.tsx).

## 15. Tests answer the question "will this break in prod"

- Unit tests for pure logic (math, parsers, formatters).
- Integration tests for DB functions using an in-memory libSQL.
- E2E (Playwright) for critical journeys: signup, import, add holding, alerts.
- Chaos tests live in `src/lib/__tests__/chaos/` and run separately.

See [`qa-tester`](../.cursor/skills/qa-tester/SKILL.md) and
[`regression-tester`](../.cursor/skills/regression-tester/SKILL.md) skills.
