# Portfolio Import — Reference

Detailed patterns, guide templates, friction benchmarks, and file-pairs mapping for the `pm-import` skill.

## Guide-Code File Pairs

When any file in the **Code** column changes, the corresponding **Guide** location must be updated in the same PR.

| Code file | Guide location | What to sync |
|-----------|---------------|--------------|
| `src/components/ImportPortfolioModal.tsx` | Import page — broker-specific how-to block | Steps, format names, UI labels |
| `src/components/BrokerImport.tsx` | Import page — broker-specific how-to block | Steps, broker list, summary cards |
| `src/components/AddStockModal.tsx` | Import page — manual-add section | Fields, validation rules |
| `src/components/TransactionHistory.tsx` | Import page — manual-transaction section | Transaction types, fields |
| `src/lib/broker-parsers/degiro.ts` | Import page — DEGIRO how-to | Supported columns, date range note |
| `src/lib/broker-parsers/interactive-brokers.ts` | Import page — IBKR CSV how-to | Supported statement types |
| `src/lib/broker-parsers/trading-212.ts` | Import page — Trading 212 how-to | Export menu path |
| `src/lib/broker-parsers/revolut.ts` | Import page — Revolut how-to | Export menu path, file format |
| `src/lib/broker-parsers/myinvestor.ts` | Import page — MyInvestor how-to | Inversis portal path, Excel format |
| `src/lib/broker-parsers/index.ts` | Import page — broker selector options | Broker list, labels |
| `src/app/api/transactions/import-broker/route.ts` | Import page — all broker guides | Parse/import behavior, error messages |
| `src/app/api/import-portfolio/route.ts` | Import page — AI import guide | Supported formats, rate limits |
| `src/app/api/ibkr-flex/route.ts` | Import page — IBKR API guide | Setup steps, connection flow |
| `src/lib/download-import-template.ts` | Import page — Simple CSV guide | Column names, template link |

## Friction Benchmarks

Target metrics for the import experience:

| Metric | Target | How to measure |
|--------|--------|----------------|
| Clicks to complete (broker CSV) | <= 4 | Open page -> select broker -> upload file -> confirm import |
| Clicks to complete (IBKR API, returning user) | <= 3 | Open page -> click re-sync -> confirm import |
| Clicks to complete (IBKR API, first-time) | <= 6 | Open page -> enter credentials -> fetch -> confirm import |
| Clicks to complete (AI import) | <= 4 | Open page -> drop file -> review -> confirm |
| Clicks to complete (manual holding) | <= 4 | Open page -> search ticker -> fill fields -> submit |
| Pages/modals navigated | 1 | All methods reachable from the import page |
| Guide visibility | 100% | No collapsed or tooltip-only guides |
| Time to understand (new user) | < 30s | User can identify the right method and start without external help |

## Per-Broker Guide Templates

Each broker guide on the import page should follow this template structure. All guides require both English and Spanish text.

### DEGIRO

```
Title: DEGIRO — Account.csv
Steps:
1. Log in to DEGIRO web platform.
2. Go to Activity → Account.
3. Set the date range from your account opening date until today.
4. Click "Export" (CSV format).
5. Upload the downloaded Account.csv file here.
Note: Only Account.csv is supported. The Transactions export uses a different format.
```

### Interactive Brokers — CSV

```
Title: Interactive Brokers — Activity Statement CSV
Steps:
1. Log in to IBKR Client Portal.
2. Go to Performance & Reports → Statements.
3. Select "Activity" statement type.
4. Choose CSV format and your desired date range.
5. Download and upload the file here.
Note: Both Activity Statement and Flex Query CSV exports are supported.
```

### Interactive Brokers — API (Pro)

```
Title: Interactive Brokers — API Sync (Pro)
Steps:
1. In IBKR Client Portal, go to Settings → Reporting → Flex Queries.
2. Create a new Flex Query that includes Trades, Dividends, and Fees.
3. Go to Settings → API → Enable API access. Copy your API token.
4. Paste your token and Flex Query ID below, then click "Fetch Portfolio."
Note: Save your connection to re-sync with one click in the future.
```

### Trading 212

```
Title: Trading 212 — History CSV
Steps:
1. Open Trading 212 (web or app).
2. Go to Menu → History.
3. Click "Export" to download as CSV.
4. Upload the downloaded file here.
```

### Revolut

```
Title: Revolut — Account Statement
Steps:
1. Open Revolut app or web.
2. Go to Invest → More (three dots).
3. Select Statements → Account statement.
4. Choose Excel or CSV format and download.
5. Upload the downloaded file here.
```

### Simple CSV

```
Title: Simple CSV — Custom Format
Columns: ticker, type (buy/sell/dividend/fee), price, amount, currency
Optional columns: date (YYYY-MM-DD), name
Steps:
1. Create a spreadsheet with the columns above (or download our template).
2. Fill in your transactions — one row per transaction.
3. Save as CSV and upload here.
Template: One-click download link available on the import page.
```

### AI Import (Screenshot / Generic CSV)

```
Title: AI-Powered Import
Supports: Screenshots (PNG, JPG) and unrecognized CSV files
Steps:
1. Take a screenshot of your portfolio in any broker platform.
   Or: export a CSV file that doesn't match the formats above.
2. Drop the file here.
3. AI will extract holdings and transactions automatically.
4. Review the extracted data and confirm.
Note: AI extraction has daily usage limits. Results should always be reviewed before importing.
```

## New Broker Checklist

When adding support for a new broker, complete every item:

```md
New Broker Checklist
- [ ] Parser created in `src/lib/broker-parsers/<broker>.ts`
- [ ] Parser registered in `src/lib/broker-parsers/index.ts`
- [ ] Broker added to `import-broker` API route's format map
- [ ] Broker selector option added to import page with label + description
- [ ] How-to guide written (English and Spanish) following template above
- [ ] File-pairs table in this file updated with new entries
- [ ] Friction benchmarks validated (clicks <= 4 for CSV flow)
- [ ] Preview step tested with sample file
- [ ] Error states tested (wrong file format, empty file, malformed data)
- [ ] Release note added via `release-notes` rule
```

## Landing Page & FAQ Sync

When import methods change, check whether these external-facing locations need updates:

| Location | File | What to check |
|----------|------|---------------|
| Landing page — Import feature card | `src/app/landing/page.tsx` (`HERO_FEATURES`, `FEATURE_CARDS`) | Broker list, description accuracy |
| Landing page — FAQ | `src/app/landing/page.tsx` (`FAQ_ITEMS`) | "How do I import" and "What CSV formats" answers |
| Landing page — SEO FAQ schema | `src/app/landing/layout.tsx` (`FAQ_SCHEMA`) | Must match the visible FAQ answers |
| Pricing tier feature lists | `src/app/landing/page.tsx` (`PRICING`) | Pro-only features (IBKR API) listed correctly |
