# demo-mode-contract

> How `PortfolioProvider` behaves when `demoMode={true}`.

## Contract
When `demoMode={true}`:
- All API fetches are skipped (holdings, cash, quotes, FX, portfolios, alerts).
- State initializes from `initialHoldings`, `initialCash`, `initialQuotes`, `initialExchangeRates`.
- All mutation callbacks (`addHolding`, `removeHolding`, etc.) are no-ops.
- Auto-refresh intervals and name-enrichment effects are disabled.
- `localStorage` reads/writes are skipped.

## Keep in sync
Any new provider added to `src/app/(app)/layout.tsx` must also be added to `src/app/demo/demo-shell.tsx`. Any new context field consumed by the dashboard must have a sensible default in demo mode.

## Seeds
Seed data lives in:
- `data/seed-holdings.json`
- `data/seed-cash.json`
- `data/demo-quotes.json`
- `data/demo-exchange-rates.json`

## Related
- [demo-page](../product-specs/demo-page.md)
- [portfolio-context-demo-mode](../product-specs/portfolio-context-demo-mode.md)
- [.cursor/rules/demo-page.mdc](../../.cursor/rules/demo-page.mdc)
