# broker-parsers

> Broker-specific CSV/PDF parsers.

## 1. Summary
Parsers normalize exports from Interactive Brokers, DeGiro, Trading212, Revolut, eToro, Trade Republic, MyInvestor, and others into our shared transaction schema.

## 2. Status
- **Tier:** Free
- **Feature flag:** _none_
- **Health:** B (broker format drift is ongoing).
- **Owning skill:** [`engineer-integrations`](../../.cursor/skills/engineer-integrations/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| Library | [`src/lib/broker-parsers/`](../../src/lib/broker-parsers) | One file per broker. |
| API | `/api/import/parse` | Orchestration. |

## 4. Data model
- Output: list of normalized `TransactionInput` items.

## 5. API surface
- Orchestrated by `import-hub`; not directly exposed.

## 6. UI surface
- Broker picker + file-type hints in `import-hub`.

## 7. Business logic
- Normalization rules:
  - Dates → ISO.
  - Currency codes normalized to ISO-4217.
  - GBX → GBP.
  - Fees and withholding tax captured as separate fields.

## 8. External dependencies
- None.

## 9. Currency / FX / tax implications
- Records FX rate per transaction (from provider or backfilled).

## 10. i18n
- Input files may have localized headers — matcher is language-tolerant.

## 11. Permissions / tier gating / rate limits
- Tier-capped max rows per upload.

## 12. Telemetry
- `broker_parse_total{broker,ok|fail}`.

## 13. Edge cases & gotchas
- Broker changes column order → parser versioning with `fixtures/`.
- Dividend reinvestment double-counting — explicit handling.

## 14. Tests
- Each parser has golden fixtures.

## 15. Related skills and rules
- [`engineer-integrations`](../../.cursor/skills/engineer-integrations/SKILL.md)
- Related specs: [import-hub](import-hub.md).

## 16. Open questions / planned work
- Automated regression when a broker ships a new format.
