# portfolio-context-demo-mode

> `PortfolioProvider` with a `demoMode` flag that disables all IO.

## 1. Summary

The whole dashboard is wrapped in `PortfolioProvider` from [`src/lib/portfolio-context.tsx`](../../src/lib/portfolio-context.tsx). When `demoMode={true}`, every fetch and localStorage write is short-circuited and state is initialized from static seed JSON. This powers the `/demo` page and any future read-only embeds.

## 2. Status

- **Tier:** Free (demo) + paid (prod)
- **Feature flag:** _none_
- **Health:** green
- **Owning skill:** [`engineer-dashboard`](../../.cursor/skills/engineer-dashboard/SKILL.md)

## 3. Entry points

| Type | Path | Notes |
|------|------|-------|
| Context | [`src/lib/portfolio-context.tsx`](../../src/lib/portfolio-context.tsx) | Provider implementation. |
| Authenticated shell | [`src/app/(app)/layout.tsx`](../../src/app/(app)/layout.tsx) | Normal mounts. |
| Demo shell | [`src/app/demo/demo-shell.tsx`](../../src/app/demo/demo-shell.tsx) | `demoMode={true}`. |
| Seed data | [`data/seed-holdings.json`](../../data/seed-holdings.json), [`data/seed-cash.json`](../../data/seed-cash.json), [`data/demo-quotes.json`](../../data/demo-quotes.json), [`data/demo-exchange-rates.json`](../../data/demo-exchange-rates.json) | Static JSON. |

## 4. Data model

- Context holds: `holdings`, `cash`, `quotes`, `exchangeRates`, `portfolios`, `alerts`, `settings`.
- In demo mode, state is seeded from JSON; no DB reads.

## 5. API surface

- Normally reads from `/api/holdings`, `/api/cash`, `/api/quote`, `/api/exchange-rates`, `/api/portfolios`, `/api/alerts`.
- In demo mode: no fetches.

## 6. UI surface

- All dashboard components consume this context directly.

## 7. Business logic

- Any new effect that fetches or writes localStorage must be wrapped `if (demoMode) return;`.
- Mutation callbacks (`addHolding`, etc.) are no-ops in demo mode.
- Auto-refresh intervals disabled in demo mode.

## 8. External dependencies

- None (provider is pure React).

## 9. Currency / FX / tax implications

- Demo uses fixed rates from `demo-exchange-rates.json` so charts are reproducible.

## 10. i18n

Copy comes from `src/locales/` regardless of mode.

## 11. Permissions / tier gating / rate limits

N/A.

## 12. Telemetry

- Demo mode emits `demo.viewed` events.

## 13. Edge cases & gotchas

- Adding a new provider to `(app)/layout.tsx` requires mirroring it in `demo-shell.tsx` (enforced by [`.cursor/rules/demo-page.mdc`](../../.cursor/rules/demo-page.mdc)).
- New data types on `Holding`/`Quote` must be reflected in the seed JSON.

## 14. Tests

- Manual smoke on `/demo`.
- E2E checks dashboard renders with static data.

## 15. Related skills and rules

- [`.cursor/rules/demo-page.mdc`](../../.cursor/rules/demo-page.mdc)
- [`engineer-dashboard`](../../.cursor/skills/engineer-dashboard/SKILL.md)
- Related specs: [demo-page](demo-page.md), [dashboard-shell](dashboard-shell.md).

## 16. Open questions / planned work

- Write-capable demo sandbox that persists to `sessionStorage` (not persistent).
