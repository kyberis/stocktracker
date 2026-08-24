# Warren portfolio import

> Import a portfolio through Warren using the same CSV, SnapTrade, and AI paths as `/import`.

## 1. Summary

Users can ask Warren to import their portfolio. Warren presents the three `/import` methods, runs the existing parsers / SnapTrade fetch / AI extract, shows a preview card, and only writes after Confirm. Telegram cannot open SnapTrade; it sends a deep-link to `/import`.

## 2. Status

- **Tier:** Free (CSV); SnapTrade follows `canUseBrokerSync`; AI import uses existing daily `openai_import` quota
- **Feature flag:** _none_
- **Health:** green
- **Owning skill:** [`.cursor/skills/engineer-integrations/SKILL.md`](../../.cursor/skills/engineer-integrations/SKILL.md)

## 3. Entry points

| Type | Path | Notes |
|------|------|-------|
| Component | `src/components/warren/WarrenDrawer.tsx` | Options card, preview card, SnapTrade popup |
| Component | `src/components/warren/ImportOptionsCard.tsx` | CSV / broker / AI choices |
| Component | `src/components/warren/ImportPreviewCard.tsx` | Review + confirm |
| API | `src/app/api/warren/chat/route.ts` | Tools + attachment buffers |
| API | `src/app/api/warren/confirm/route.ts` | `kind: importTransactions` |
| API | `src/app/api/snaptrade/route.ts` | Connect URL + fetch (shared `runSnapTradeFetch`) |
| API | `src/app/api/transactions/bulk/route.ts` | Confirm path via `addTransactionsBulk` |
| Lib | `src/lib/ai/warren/import-tools.ts` | Tool registry |
| Lib | `src/lib/ai/warren/import-parse.ts` | Broker CSV preview |
| Lib | `src/lib/ai/warren/import-ai.ts` | AI extract |
| Lib | `src/lib/snaptrade-fetch.ts` | Shared SnapTrade fetch |

## 4. Data model

No new tables. Reuses transactions, cash entries, SnapTrade connections. Preview lives in the Warren proposal payload until confirm.

## 5. API surface

| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| POST | `/api/warren/chat` | session + `ai_consult` | Free+ | Import tools; multipart attachments passed to tools |
| POST | `/api/warren/confirm` | session | Free+ | `importTransactions` → bulk insert + cash + backfill |
| POST | `/api/snaptrade` | session | gated | Connect + fetch (unchanged contract) |

No new HTTP routes.

## 6. UI surface

- `ImportOptionsCard` in the Warren drawer, Agent Office, and Telegram as text (+ `/import` link for SnapTrade).
- `ImportPreviewCard` extends the proposal/confirm pattern (`ActionCard`).
- File input accepts CSV/Excel/images.
- Persistent Warren disclaimer footer unchanged.

## 7. Business logic

1. Intent “import my portfolio” → `presentImportOptions`.
2. CSV/Excel → `parseBrokerCsvImport` (same parsers as `/import`). Unknown format → `extractAiPortfolioImport`.
3. Broker sync → `startSnapTradeConnect` emits `client_action: open_snaptrade`; after connect, `fetchSnapTradeImport` (holdings/cash upsert on fetch, txs previewed).
4. AI screenshot/CSV → `extractAiPortfolioImport` (same extraction prompt/limits as `/api/import-portfolio`).
5. User confirms → `dispatchProposal` chunks `addTransactionsBulk`, optional cash, snapshot backfill.
6. Writes never auto-apply.

## 8. External dependencies

- SnapTrade (existing)
- AI Gateway / OpenAI for AI import (existing)
- Yahoo for ISIN lookup / FX on cash (existing)
- Env: `APP_BASE_URL` for Telegram `/import` links

## 9. Currency / FX / tax implications

- Ledger stays EUR-base via existing bulk + FX helpers.
- Cash from CSV converted to EUR when possible.

## 10. i18n

- EN + ES: `warrenImport*` keys, `warrenChipImportPortfolio`, empty-state import hint.

## 11. Permissions / tier gating / rate limits

- SnapTrade: `canUseBrokerSync` / connection limit (same as `/import`).
- AI import: `checkAiImportRateLimit` (`openai_import`) + global AI cap.
- Confirm still consumes no extra `ai_consult`.

## 12. Telemetry

- `warren_action` with `action: importTransactions` and `source`.
- Existing `portfolio_import` / `snaptrade_fetch` / `import_error` events from shared services.

## 13. Edge cases & gotchas

- Empty-add mode includes import tools (see [warren-empty-add-stock](warren-empty-add-stock.md)).
- Telegram: no SnapTrade popup; link to `/import?method=snaptrade_api`.
- Demo mode: import tools refuse writes.
- Large CSVs: confirm payload capped at 2000 rows; preview lists first 40.
- SnapTrade holdings/cash still apply on fetch (same as `/import`); only txs wait for confirm.

## 14. Tests

- Unit: `src/lib/ai/warren/import-parse.test.ts`, `src/lib/ai/warren/dispatch.import.test.ts`, `src/lib/ai/warren/empty-add-stock.test.ts`
- E2E: `e2e/home-v2-empty-warren.spec.ts` (empty-state copy mentions import)

## 15. Related skills and rules

- Skills: engineer-integrations, pm-import, legal-advisor (no new processor; existing SnapTrade/CSV/AI), accessibility-reviewer
- Specs: [import-hub](import-hub.md), [snaptrade-import](snaptrade-import.md), [ai-import-assist](ai-import-assist.md), [warren-empty-add-stock](warren-empty-add-stock.md)

## 16. Open questions / planned work

- Rich per-row asset-type editing in the drawer (v1 is remove + confirm).
- Long per-broker how-to guides stay on `/import`.
