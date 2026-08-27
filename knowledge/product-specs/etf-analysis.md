# ETF analysis landings

> Same `/analisis/[ticker]` URL; ETFs and ETPs get a fund profile instead of a company report.

## 1. Summary

Public and logged-in analysis pages stay on `/analisis/[ticker]`. When Yahoo `quoteType` is ETF/MUTUALFUND/ETP (or the name looks like a UCITS/ETP fund), the page shows JustETF-style facts, composition, chart, news, and an ETF narrative — not EPS, Form 4, Congress, or valuation/moat. Stocks keep the existing company report.

## 2. Status

- **Tier:** Free (public cached reads + low `company_analysis` quota) / Pro (generous quota)
- **Feature flag:** _none_
- **Health:** green
- **Owning skill:** [`engineer-integrations`](../../.cursor/skills/engineer-integrations/SKILL.md)

## 3. Entry points

| Type | Path | Notes |
|------|------|-------|
| Page | `src/app/(app)/analisis/[ticker]/page.tsx` | Same route as company analysis |
| API | `GET /api/company-analysis` | Sets `instrumentKind` + `etf` slice |
| API | `POST /api/company-analysis/narrative` | ETF prompt when `instrumentKind=etf` |
| Components | `src/components/company-analysis/panels/EtfFactsPanel.tsx` | Facts grid |
| Components | `src/components/company-analysis/panels/EtfCompositionPanel.tsx` | Holdings / sector / asset-class weights |

## 4. Data model

- `CompanyAnalysisReport.instrumentKind`: `"equity" | "etf"`
- `CompanyAnalysisReport.etf`: ISIN, provider, category, legal type, optional TER/inception/AUM, holdings + weights
- Durable cache keys: `report:etf:TICKER` / `narrative:etf:TICKER:lang` so stale equity-shaped BITC caches are not reused
- Yahoo extras on `ETFHoldingsData`: optional `expenseRatio`, `inceptionDate`, `totalAssets`

## 5. API surface

Same routes as [company-analysis](company-analysis.md). ETF builds skip income/earnings/insiders/congress/peers and call `YahooProvider.getETFHoldings` under the `company_analysis` quota — they do **not** charge `etf_holdings`.

## 6. UI surface

- Summary: chart/technicals + fund facts + composition + ETF narrative + news
- Hidden for ETFs: fundamentals table, insiders/Congress, Valuation & Moat, Intelligence tab
- Details tab: `StockDetail` with `forceAssetType="etf"` even without a portfolio holding; holdings seeded from the report so Details does not hit `/api/etf-holdings`

## 7. Business logic

- Detection: `isEtfInstrument` in `src/lib/company-analysis/instrument.ts` (quoteType + name heuristics including CoinShares/ETP)
- Legacy untagged fund caches (`instrumentKind` missing) are skipped via `isLegacyEquityCacheForEtf`
- TER and inception only when Yahoo `fundProfile` / `defaultKeyStatistics` actually return them
- ISIN from `disambiguateListing` or `?isin=`

## 8. External dependencies

- Yahoo Finance `quoteSummary` modules `topHoldings`, `fundProfile`, `defaultKeyStatistics`
- No JustETF (or any third-party profile) scraping

## 9. Currency / FX / tax implications

- Display uses quote currency; AUM labelled as fund size, not market cap

## 10. i18n

- Keys `etfAnalysis*` in `en.ts` / `es.ts` (EN fallback on other locales that spread `en`; de/fr/pt/nl copied)

## 11. Permissions / tier gating / rate limits

- Same as company analysis (`company_analysis` on full build; public IP/global budget for first anonymous build)
- Details ETF holdings from the analysis report do not consume `etf_holdings` quota

## 12. Telemetry

- Existing `withMetrics` on company-analysis routes; Yahoo provider timer still records the `etf_holdings` operation name on the quoteSummary call (not the user feature quota)

## 13. Edge cases & gotchas

- Do not invent replication method, Acc vs Dist, domicile, index name, or tracking error
- MUTUALFUND uses the same layout
- Financial disclaimer and AI-generated label stay on the page (legal trigger 9 — same page type)
- Demo mode: analysis is a public ticker page, not the `/demo` dashboard

## 14. Tests

- Unit: `src/lib/company-analysis/instrument.test.ts`, assemble ETF skip, SEO InvestmentFund, gaps ETF skip, `etf-profile-map.test.ts`
- E2E: `e2e/etf-analisis.spec.ts` (mocked `/api/company-analysis`)

## 15. Related skills and rules

- [company-analysis](company-analysis.md)
- [`.cursor/rules/legal-compliance.mdc`](../../.cursor/rules/legal-compliance.mdc)
- [`.cursor/skills/legal-advisor/SKILL.md`](../../.cursor/skills/legal-advisor/SKILL.md)
