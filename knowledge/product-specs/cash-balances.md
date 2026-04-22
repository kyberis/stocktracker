# cash-balances

> Multi-currency cash entries per portfolio and account.

## 1. Summary

Track uninvested cash across 21 currencies. Used to compute total net worth, cash drag, and allocation drift. Data stored in `cash_entries` (v2 after a migration) with FX conversion done at read time against the current exchange-rates cache.

## 2. Status

- **Tier:** Free
- **Feature flag:** _none_
- **Health:** green
- **Owning skill:** [`engineer-data`](../../.cursor/skills/engineer-data/SKILL.md)

## 3. Entry points

| Type | Path | Notes |
|------|------|-------|
| API | [`src/app/api/cash/route.ts`](../../src/app/api/cash/route.ts) | CRUD. |
| Component | [`src/components/CashBalances.tsx`](../../src/components/CashBalances.tsx) | Cash tab widget. |
| DB | [`src/lib/db/cash.ts`](../../src/lib/db/cash.ts) | Access. |

## 4. Data model

- `cash_entries_v2`: `id`, `user_id`, `portfolio_id`, `account_id`, `currency`, `amount`, `label`, `updated_at`.

## 5. API surface

| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| GET | `/api/cash` | user | Free | List for portfolio. |
| POST | `/api/cash` | user | Free | Create. |
| PATCH | `/api/cash` | user | Free | Update amount/label. |
| DELETE | `/api/cash?id=` | user | Free | Remove. |

## 6. UI surface

- `CashBalances` on dashboard + `market-and-cash` tab.
- Inline edit with currency dropdown.

## 7. Business logic

- EUR-equivalent computed on render using [`exchange-rates`](exchange-rates.md).
- Negative amounts (margin) permitted with a UI warning.

## 8. External dependencies

- Exchange-rates cache for display conversion.

## 9. Currency / FX / tax implications

- 21 currencies supported; list in [`src/lib/countries.ts`](../../src/lib/countries.ts) or equivalent.
- Conversion consistent with holdings math.

## 10. i18n

All locales.

## 11. Permissions / tier gating / rate limits

- 60/min/user writes.

## 12. Telemetry

- `analytics_events`: `cash.entry.created`, `cash.entry.updated`.

## 13. Edge cases & gotchas

- Removing all cash entries should not crash the dashboard totals.
- Currency codes normalized to ISO 4217 upper-case.

## 14. Tests

- [`src/lib/db/cash.test.ts`](../../src/lib/db/cash.test.ts)

## 15. Related skills and rules

- [`engineer-data`](../../.cursor/skills/engineer-data/SKILL.md)
- [`financial-calculations`](../../.cursor/skills/financial-calculations/SKILL.md)
- Related specs: [exchange-rates](exchange-rates.md), [accounts-manager](accounts-manager.md).

## 16. Open questions / planned work

- Automatic cash reconciliation from SnapTrade.
- Interest rate tracking on labeled savings accounts.
