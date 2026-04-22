# backtest-whatif

> "What if I had bought X on Y" backtesting tool.

## 1. Summary
Let the user imagine an alternative past. Swap one holding for another, change the date, or change the amount; we re-run the portfolio against historical prices and produce a comparative chart.

## 2. Status
- **Tier:** Trefolio
- **Feature flag:** _none_
- **Health:** C (perf on long histories).
- **Owning skill:** [`engineer-tools`](../../.cursor/skills/engineer-tools/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| Page | [`src/app/(app)/tools/backtest/`](../../src/app/(app)/tools/backtest) | Page. |
| API | [`src/app/api/backtest/`](../../src/app/api/backtest) | Compute endpoint. |
| Library | [`src/lib/backtest.ts`](../../src/lib/backtest.ts) | Core math. |

## 4. Data model
- No storage (ephemeral computation).

## 5. API surface
| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| POST | `/api/backtest` | user | Pro | `{ scenario }` returns series. |

## 6. UI surface
- Scenario form + result chart overlayed on current portfolio.

## 7. Business logic
- Uses historical quotes + derived holdings.
- Performance metrics computed via `ttwror-xirr-performance`.

## 8. External dependencies
- Yahoo historical.

## 9. Currency / FX / tax implications
- Historical FX applied consistently.

## 10. i18n
- All locales.

## 11. Permissions / tier gating / rate limits
- `requireSubscriptionFeature('simulator')`.
- 20/hour/user.

## 12. Telemetry
- `backtest_runs_total`.

## 13. Edge cases & gotchas
- Delisted tickers break a scenario; UI warns.

## 14. Tests
- Unit on the scenario runner.

## 15. Related skills and rules
- [`engineer-tools`](../../.cursor/skills/engineer-tools/SKILL.md)
- Related specs: [historical-prices](historical-prices.md), [ttwror-xirr-performance](ttwror-xirr-performance.md).

## 16. Open questions / planned work
- Monte-Carlo "next 10 years" forward simulation.
