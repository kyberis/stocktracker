# accounts-manager

> User-facing list of brokerage/custody accounts holdings and cash belong to.

## 1. Summary

Users categorize their holdings and cash into "accounts" (e.g., "Revolut," "IBKR," "Degiro Main"). This gives per-account views and enables cleaner imports. Not the same as "portfolios"; an account belongs to a portfolio.

## 2. Status

- **Tier:** Free
- **Feature flag:** _none_
- **Health:** green
- **Owning skill:** [`engineer-data`](../../.cursor/skills/engineer-data/SKILL.md)

## 3. Entry points

| Type | Path | Notes |
|------|------|-------|
| API | [`src/app/api/accounts/route.ts`](../../src/app/api/accounts/route.ts) | CRUD. |
| Component | [`src/components/AccountsManager.tsx`](../../src/components/AccountsManager.tsx) | Account list UI. |
| DB | [`src/lib/db/accounts.ts`](../../src/lib/db/accounts.ts) | Access. |

## 4. Data model

- `accounts`: `id`, `user_id`, `portfolio_id`, `name`, `broker_slug`, `color`, `sort_order`, timestamps.

## 5. API surface

| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| GET | `/api/accounts` | user | Free | List accounts. |
| POST | `/api/accounts` | user | Free | Create. |
| PATCH | `/api/accounts` | user | Free | Rename/recolor. |
| DELETE | `/api/accounts?id=` | user | Free | Delete (reassigns entities). |

## 6. UI surface

- Accounts page in settings/dashboard with broker logo display.
- Holdings and cash show their account chip.

## 7. Business logic

- A default "Main" account exists per portfolio if none set.
- Broker slug maps to `public/broker-logos/<slug>.png` when available.

## 8. External dependencies

- Broker logo assets in `public/broker-logos/`.

## 9. Currency / FX / tax implications

- Accounts themselves are currency-agnostic; their cash/holdings carry currencies.

## 10. i18n

All locales.

## 11. Permissions / tier gating / rate limits

- 60/min/user writes.

## 12. Telemetry

- `analytics_events`: `account.created`, `account.renamed`, `account.deleted`.

## 13. Edge cases & gotchas

- SnapTrade-managed accounts carry a link to `snaptrade_connections` — don't allow rename that breaks sync.
- Delete cascades to reassign holdings/cash to the default account.

## 14. Tests

- [`src/lib/db/accounts.test.ts`](../../src/lib/db/accounts.test.ts)

## 15. Related skills and rules

- [`engineer-data`](../../.cursor/skills/engineer-data/SKILL.md)
- Related specs: [snaptrade-import](snaptrade-import.md), [broker-parsers](broker-parsers.md).

## 16. Open questions / planned work

- Sub-accounts (retirement, ISA) with tax flags.
