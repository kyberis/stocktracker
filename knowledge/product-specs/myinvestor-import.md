# myinvestor-import

> Import Spanish brokerage transactions from MyInvestor/Inversis Excel exports into the ledger via `/api/transactions/import-broker`.

## 1. Summary

Users export operations from the Inversis web portal (`inversis.com/cbmyinvestor`) as `.xls` / `.xlsx`. The API decodes the workbook server-side (first sheet only), parses Spanish-oriented columns into `ParsedTransaction`, resolves tickers from ISINs when possible, and inserts transactions like other broker parsers.

## 2. Status

- **Tier:** Free
- **Feature flag:** _none_
- **Health:** yellow — headers inferred without a frozen vendor fixture yet.
- **Owning skill:** [`engineer-integrations`](../../.cursor/skills/engineer-integrations/SKILL.md)

## 3. Entry points

| Type | Path | Notes |
|------|------|-------|
| API | [`src/app/api/transactions/import-broker/route.ts`](../../src/app/api/transactions/import-broker/route.ts) | Spreadsheet decoding + registry parsers |
| Parser | [`src/lib/broker-parsers/myinvestor.ts`](../../src/lib/broker-parsers/myinvestor.ts) | CSV-after-excel normalization |
| Decode helper | [`src/lib/spreadsheet-to-csv.ts`](../../src/lib/spreadsheet-to-csv.ts) | Shared `.xls`/`.xlsx` → CSV text |
| UI | [`src/app/(app)/import/import-page-content.tsx`](../../src/app/(app)/import/import-page-content.tsx) | Broker option + guide |

## 4. Data model

Uses shared transactions ledger (`addTransaction`, `sourceRef`, holdings derivation). No new tables.

## 5. API surface

| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| POST | `/api/transactions/import-broker` | session | Free | `broker=myinvestor`, multipart `file` or `csv` body |

## 6. UI surface

- `/import` broker CSV wizard: MyInvestor option and bilingual [`IMPORT_GUIDES`](../../src/lib/import-guides.ts) entry `myinvestor`.
- [`BrokerImport`](../../src/components/BrokerImport.tsx) and dashboard modal share broker IDs.

## 7. Business logic

- Flexible Spanish header aliases (fecha, ISIN, valor, tipo operación, nominal, precio, importe, divisa).
- Operation phrases mapped to `buy` / `sell` / `dividend` / `fee`; unknown rows skipped.
- `extractIsins` feeds existing Yahoo ISIN→symbol enrichment path.

## 8. External dependencies

- **SheetJS** (`xlsx` npm package) for workbook decoding on the server only.

## 9. Currency / FX / tax implications

- Same as general imports: amounts stored per transaction currency; EUR normalization flows via existing FX logic downstream.

## 10. i18n

- Guide copy in [`src/lib/import-guides.ts`](../../src/lib/import-guides.ts) (`titleEn` / `titleEs`, steps, notes).

## 11. Permissions / tier gating / rate limits

- Same as other broker CSV imports (holdings limits on lower tiers).

## 12. Telemetry

- `portfolio_import` events via [`trackEvent`](../../src/lib/db) with broker key.

## 13. Edge cases & gotchas

- Multi-sheet files: only first worksheet is converted—guide warns users.
- Real Inversis layouts may differ; parser errors surface detected headers to simplify fixes.

## 14. Tests

- [`src/lib/broker-parsers/__tests__/myinvestor.test.ts`](../../src/lib/broker-parsers/__tests__/myinvestor.test.ts) synthetic CSV fixtures.

## 15. Related skills and rules

- [`pm-import`](../../.cursor/skills/pm-import/SKILL.md)
- [`engineer-integrations`](../../.cursor/skills/engineer-integrations/SKILL.md)

## 16. Open questions / planned work

- Capture a redacted production `.xls` fixture and lock column mappings.
