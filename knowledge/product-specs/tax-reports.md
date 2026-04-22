# tax-reports

> EU tax report generation (DE, FR, ES, NL, IT).

## 1. Summary
Produces a year-end tax-ready PDF / CSV with realized gains, dividends, and foreign withholding tax, customized per country. AI Tax Assistant offers optimization suggestions.

## 2. Status
- **Tier:** Trefolio
- **Feature flag:** _none_
- **Health:** B
- **Owning skill:** [`engineer-tools`](../../.cursor/skills/engineer-tools/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| Page | [`src/app/(app)/tools/tax/`](../../src/app/(app)/tools/tax) | Page. |
| API | [`src/app/api/tax/`](../../src/app/api/tax) | Report + AI assist. |

## 4. Data model
- Reads `transactions`, writes transient reports (or cached summaries).

## 5. API surface
| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| POST | `/api/tax/report` | user | Pro | Generate for year + country. |
| POST | `/api/tax/ai-assistant` | user | Pro | Suggest optimization. |

## 6. UI surface
- Country selector, year selector, preview + export buttons.

## 7. Business logic
- Realized vs unrealized; FIFO cost basis.
- Country-specific rules: DE Abgeltungsteuer, FR PFU, ES IRPF, NL box 3, IT capital gains.
- Withholding tax credit capture per ISO-3166 of issuer.

## 8. External dependencies
- OpenAI for AI assistant.
- PDF generation library.

## 9. Currency / FX / tax implications
- FX conversion at transaction date; stored per transaction.
- GBX handling documented in notes.

## 10. i18n
- Per-country translations; EU-standard terms.

## 11. Permissions / tier gating / rate limits
- `requireSubscriptionFeature('tax-reports')`.

## 12. Telemetry
- `tax_report_generated_total{country}`.

## 13. Edge cases & gotchas
- Pre-import users with no historical FX rates: backfill required.
- Annual rule changes — see `tax-rules-review` cron.

## 14. Tests
- Unit per-country rule sets.

## 15. Related skills and rules
- [`engineer-tools`](../../.cursor/skills/engineer-tools/SKILL.md)
- [`financial-calculations`](../../.cursor/skills/financial-calculations/SKILL.md)
- Related specs: [portfolio-summary-math](portfolio-summary-math.md).

## 16. Open questions / planned work
- Direct e-file integrations (DE Elster).
