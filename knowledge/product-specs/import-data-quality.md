# Import Data Quality Auditor

> Cross-check imported and existing holdings against live market data; auto-fix safe errors; summarize with AI.

## 1. Summary

When users import broker CSVs (or tap **Audit & repair portfolio** on `/import`), trefolio runs deterministic checks against Yahoo quotes and EUR-anchored FX. Safe issues (missing FX fetch, GBX/GBP units, HK ticker exchange, clear currency mislabels, stale `value_in_eur`) are auto-fixed. Ambiguous issues (recent-trade price drift, unmapped ISIN) need user confirmation. An optional AI paragraph explains findings; UI always shows the rule list.

## 2. Status

- **Tier:** Free (auditor + repair); AI summary uses existing AI Gateway quotas
- **Feature flag:** _none_
- **Health:** green
- **Owning skill:** [`.cursor/skills/pm-import/SKILL.md`](../../.cursor/skills/pm-import/SKILL.md), [`.cursor/skills/financial-calculations/SKILL.md`](../../.cursor/skills/financial-calculations/SKILL.md)

## 3. Entry points

| Type | Path | Notes |
|------|------|-------|
| Page | `src/app/(app)/import/import-page-content.tsx` | Preview quality panel + repair button |
| API | `src/app/api/transactions/import-broker/route.ts` | `action=parse` quality pass; post-import holding repair |
| API | `src/app/api/import/quality-repair/route.ts` | Audit/repair existing holdings |
| Component | `src/components/ImportDataQualityPanel.tsx` | Findings + AI summary |
| Lib | `src/lib/import-quality/*` | Auditor, repairs, summarize |

## 4. Data model

No new tables. Mutates `holdings` (`display_currency`, `purchase_price`, `exchange`, `value_in_eur`) and preview `ParsedTransaction` rows before persist.

Types: `ImportQualityFinding`, `ImportQualityReport` in `src/lib/import-quality/types.ts`.

## 5. API surface

| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| POST | `/api/transactions/import-broker` (`parse`) | session | Free | Returns `summary.quality` report; may rewrite preview txs |
| POST | `/api/transactions/import-broker` (`import`) | session | Free | After rebuild, auto-repairs holdings |
| POST | `/api/import/quality-repair` | session | Free | Body `{ portfolioId?, locale?, confirmFindingIds? }` |

## 6. UI surface

- `/import` method step: Audit & repair
- `/import` broker CSV preview: data quality panel
- i18n keys: `importQuality*` in `src/locales/en.ts` / `es.ts`

## 7. Business logic

- `auditImportBatch` — rules: missing_fx, currency_mismatch, unit_magnitude, unresolved_ticker, recent_trade_price, missing_quote, stale_value_in_eur, hk_ticker_padding
- `applyTransactionAutoFixes` / `planHoldingAutoFixes` — safe repairs only
- `summarizeImportQuality` — AI Gateway gpt-4o-mini; deterministic fallback
- FX hardening: `convertToEUR` / `convertCurrency` return `NaN` when rate missing; portfolio totals fall back to stored `valueInEUR`

## 8. External dependencies

- Yahoo quotes + FX
- Vercel AI Gateway / OpenAI for summary (findings JSON only — not full portfolio)

## 9. Currency / FX / tax implications

- EUR-anchored rates via `buildNeededFxPairs`
- GBX handled as pence (`/100` + `EURGBP`)
- Does not rewrite historical tax lots without confirmation

## 10. i18n

- EN + ES for UI labels; AI summary follows `locale`

## 11. Permissions / tier gating / rate limits

- No extra tier gate; AI calls use existing gateway + rate limits

## 12. Telemetry

- Relies on existing `portfolio_import` events; quality failures logged to console

## 13. Tests

- `src/lib/import-quality/auditor.test.ts`
- `src/lib/utils.test.ts` (missing FX → NaN)
- `src/lib/portfolio-summary.test.ts` (missing HKD uses stored value)

## 14. Related

- [import-hub](import-hub.md)
- [broker-parsers](broker-parsers.md)
- [exchange-rates](exchange-rates.md)
- [eur-base-fx](../design-docs/eur-base-fx.md)
