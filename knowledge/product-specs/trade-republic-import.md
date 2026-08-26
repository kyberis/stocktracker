# trade-republic-import

> Guided CSV import of Trade Republic Transaction Reports, plus the flag-gated broker picker that lists TR next to SnapTrade brokers.

## 1. Summary

Trade Republic is not on SnapTrade. Users export a Transaction Report CSV from the TR app; trefolio detects and parses buys, sells, dividends, and savings-plan executions. When `import_broker_picker_enabled` is on, Broker Sync shows TR in the broker grid (CSV badge) with a how-to before upload.

## 2. Status

- **Tier:** Free (CSV). SnapTrade tiles remain Pro via existing broker-sync gate.
- **Feature flag:** `import_broker_picker_enabled` (picker UI + TR guided path; parser always registered).
- **Health:** yellow — official CSV layout may still drift; parser uses documented EN/DE headers.
- **Owning skill:** [`engineer-integrations`](../../.cursor/skills/engineer-integrations/SKILL.md), [`pm-import`](../../.cursor/skills/pm-import/SKILL.md)

## 3. Entry points

| Type | Path | Notes |
|------|------|-------|
| Parser | [`src/lib/broker-parsers/trade-republic.ts`](../../src/lib/broker-parsers/trade-republic.ts) | Auto-detect + forced `broker=trade_republic` |
| API | [`src/app/api/transactions/import-broker/route.ts`](../../src/app/api/transactions/import-broker/route.ts) | Same registry path as other CSVs |
| UI | [`src/app/(app)/import/import-page-content.tsx`](../../src/app/(app)/import/import-page-content.tsx) | Picker → TR guide + dropzone |
| Picker | [`src/components/import/BrokerPickerGrid.tsx`](../../src/components/import/BrokerPickerGrid.tsx) | Logos + search |

## 4. Data model

No new tables. Transactions use `sourceRef` prefix `traderepublic|…` and the shared ledger.

## 5. API surface

| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| POST | `/api/transactions/import-broker` | session | Free | `broker=trade_republic` or auto-detect |
| POST | `/api/snaptrade` `list-brokerages` | session | Pro for connect | Feeds picker logos/slugs |

## 6. UI surface

- Flag on: Broker Sync grid includes Trade Republic (CSV) and SnapTrade logos.
- Empty search: Import with CSV + request-broker form (pre-filled).
- Guide: [`IMPORT_GUIDES`](../../src/lib/import-guides.ts) id `trade_republic`.

## 7. Business logic

- [`mergePickerBrokers`](../../src/lib/import-broker-picker.ts) pins TR, sorts SnapTrade names.
- [`filterPickerBrokers`](../../src/lib/import-broker-picker.ts) filters by displayName/name/slug.
- Parser maps Buy / Savings Plan / Sparplan → buy; Sell → sell; Dividend → dividend. Interest skipped.
- SnapTrade tiles call `connect(slug)` → `loginSnapTradeUser({ broker, immediateRedirect: true })`.

## 8. External dependencies

- SnapTrade `listAllBrokerages` logos (`aws_s3_square_logo_url`). TR logo is first-party [`public/brokers/trade-republic.svg`](../../public/brokers/trade-republic.svg).
- No Trade Republic API.

## 9. Currency / FX / tax implications

- Same as other broker CSVs: native currency on the row; EUR display via existing FX. Fee and Tax columns mapped to `fees` / `taxes`.

## 10. i18n

- Guide EN/ES in `import-guides.ts`.
- Picker strings: `brokerPicker*` in [`src/locales/en.ts`](../../src/locales/en.ts) / [`src/locales/es.ts`](../../src/locales/es.ts).

## 11. Permissions / tier gating / rate limits

- Picker lives on Broker Sync (Pro `canUseBrokerSync`). TR CSV itself is Free once the user is on the CSV wizard.
- Flag default off; per-user overrides in `/admin/feature-flags`.

## 12. Telemetry

- Existing `import_file_uploaded` / `import_completed` with `broker=trade_republic` when detected.
- SnapTrade connect errors unchanged.

## 13. Edge cases & gotchas

- SnapTrade does not list Trade Republic — do not deep-link TR.
- German `;` CSVs use European decimals and `DD.MM.YYYY` dates.
- Fractional savings-plan shares are valid.
- Logo `onError` falls back to initials.

## 14. Tests

- [`src/lib/broker-parsers/__tests__/trade-republic.test.ts`](../../src/lib/broker-parsers/__tests__/trade-republic.test.ts)
- [`src/lib/import-broker-picker.test.ts`](../../src/lib/import-broker-picker.test.ts)
- `useSnapTradeApi` connect sends `broker` FormData field.

## 15. Related skills and rules

- [`engineer-integrations`](../../.cursor/skills/engineer-integrations/SKILL.md)
- [`engineer-feature-flags`](../../.cursor/skills/engineer-feature-flags/SKILL.md)
- [`pm-import`](../../.cursor/skills/pm-import/SKILL.md)
- Related specs: [snaptrade-import](snaptrade-import.md), [import-hub](import-hub.md), [broker-parsers](broker-parsers.md)

## 16. Open questions / planned work

- Official partnership / autosync (Parqet-style) if Trade Republic offers it.
- Confirm live CSV headers against a redacted production export.
