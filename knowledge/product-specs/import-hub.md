# import-hub

> Unified import page with broker file upload, SnapTrade OAuth, IBKR Flex, and AI-assisted import.

## 1. Summary
All import methods live on one page under `/import` — CSV/PDF from brokers, SnapTrade connections, IBKR Flex tokens, and "describe your holdings" AI-assisted import. Each method has a visible how-to guide.

## 2. Status
- **Tier:** Free
- **Feature flag:** `BROKER_INTEGRATIONS` (admin)
- **Health:** B
- **Owning skill:** [`pm-import`](../../.cursor/skills/pm-import/SKILL.md), [`engineer-integrations`](../../.cursor/skills/engineer-integrations/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| Page | [`src/app/(app)/import/`](../../src/app/(app)/import) | Unified import hub. |
| API | [`src/app/api/import/`](../../src/app/api/import) | Upload + parse endpoints. |

## 4. Data model
- Parsing is ephemeral; final output writes to `holdings`, `transactions`, `cash_balances`.
- Upload logs in `import_logs` (if exists).

## 5. API surface
| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| POST | `/api/import/parse` | user | Free | Parse CSV/PDF. |
| POST | `/api/import/apply` | user | Free | Commit parsed rows. |

## 6. UI surface
- Tabbed interface with inline how-to guides (guide-code coupling — see skill).
- Preview table before commit with edit-in-place.

## 7. Business logic
- Parsers in `src/lib/broker-parsers/`.
- AI-assist fallback uses OpenAI with the user-provided text as input.

## 8. External dependencies
- OpenAI (AI assist), SnapTrade, IBKR Flex, PDF.js.

## 9. Currency / FX / tax implications
- Transactions stored in native currency + FX rate at the transaction date (backfilled if missing).

## 10. i18n
- All locales.

## 11. Permissions / tier gating / rate limits
- Uploads rate-limited; per-tier holding caps enforced at apply.

## 12. Telemetry
- `import.started_total{method}`, `import.applied_total{method}`, `import.failed_total{method,reason}`.

## 13. Edge cases & gotchas
- GBX conversion (×0.01 to GBP).
- Ticker resolution via ISIN when present.

## 14. Tests
- Fixtures per broker in `src/lib/broker-parsers/__tests__`.

## 15. Related skills and rules
- [`pm-import`](../../.cursor/skills/pm-import/SKILL.md)
- [`engineer-integrations`](../../.cursor/skills/engineer-integrations/SKILL.md)
- Related specs: [broker-parsers](broker-parsers.md), [snaptrade-import](snaptrade-import.md), [ibkr-flex](ibkr-flex.md), [ai-import-assist](ai-import-assist.md).

## 16. Open questions / planned work
- Persist raw upload for re-parsing after bug fixes.
