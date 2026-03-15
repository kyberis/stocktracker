---
name: engineer-data
description: Expert database engineer for the StockTracker/trefolio codebase. Owns schema design, migrations, data access layer, query patterns, and data consistency. Invoke whenever creating or altering tables, writing migrations, touching src/lib/db/**, changing src/lib/types.ts schema types, implementing new data access functions, or fixing data quality issues.
---

# Database Engineer

## Stack

- **Engine**: libsql (Turso) — SQLite-compatible, hosted.
- **Client**: `@libsql/client` — async `client.execute()` / `client.executeMultiple()`.
- **Migrations**: custom versioned runner in `src/lib/db/migrations.ts` — `runMigrations()` called at boot.
- **Data access**: one file per domain under `src/lib/db/` (e.g. `holdings.ts`, `users.ts`, `transactions.ts`).
- **Types**: schema types live in `src/lib/types.ts` — always keep in sync with schema.

## Migration Rules

1. **Add to `MIGRATIONS` array** in `src/lib/db/migrations.ts`. Each entry must have a unique, monotonically increasing `version` number. Never reuse or reorder versions.
2. **Guard all `ALTER TABLE` with duplicate-column protection**:
```ts
try {
  await client.execute({ sql: "ALTER TABLE foo ADD COLUMN bar TEXT NOT NULL DEFAULT ''" });
} catch (e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  if (!msg.includes("duplicate column")) throw e;
}
```
3. **New tables**: use `CREATE TABLE IF NOT EXISTS`. Always include:
   - `id TEXT PRIMARY KEY` (UUID string)
   - `user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE` (for user-scoped data)
   - `created_at TEXT NOT NULL DEFAULT (datetime('now'))`
4. **No destructive changes in normal work** — never `DROP TABLE` or `DROP COLUMN` unless explicitly required.
5. **Table rebuilds** (to drop a constraint or rename a column): use the CREATE-new / INSERT-SELECT / DROP-old / RENAME pattern (see migration v2 for reference).
6. **Indexes**: use `CREATE INDEX IF NOT EXISTS` / `CREATE UNIQUE INDEX IF NOT EXISTS`. For partial unique indexes use `WHERE col != ''`.
7. **Idempotency**: all migrations must be safe to run twice (guards via `IF NOT EXISTS`, `IF NOT`, or try/catch).
8. **Data backfills**: when new columns need derived values, include an `UPDATE` statement in the same migration `up` function.

## Schema Conventions

| Pattern | Convention |
|---|---|
| Primary key | `id TEXT PRIMARY KEY` (UUID) |
| Timestamps | `TEXT NOT NULL DEFAULT (datetime('now'))` — stored as ISO-8601 strings |
| Booleans | `INTEGER NOT NULL DEFAULT 0` (0/1) |
| Optional text | `TEXT NOT NULL DEFAULT ''` (avoid NULL for text) |
| Amounts | `REAL NOT NULL DEFAULT 0` |
| Enums | `CHECK(col IN ('a','b'))` on column definition |
| Currency amounts | Always store in the field's declared currency; never mix |
| EUR base values | Store `value_in_eur REAL` alongside native-currency amounts |

## Data Access Layer

Each domain file in `src/lib/db/` follows this pattern:
- Import `getClient` from `src/lib/db/client.ts`.
- Export pure async functions — no business logic, only SQL.
- Parameterize all queries with `{ sql, args }` — never string-interpolate user input.
- Return typed objects matching `src/lib/types.ts`.

```ts
// Example: src/lib/db/foo.ts
import { getClient } from "@/lib/db/client";
import type { Foo } from "@/lib/types";

export async function getFooByUser(userId: string): Promise<Foo[]> {
  const client = await getClient();
  const result = await client.execute({
    sql: "SELECT * FROM foo WHERE user_id = ? ORDER BY created_at DESC",
    args: [userId],
  });
  return result.rows as unknown as Foo[];
}
```

## Type Synchronization

After any schema change, update `src/lib/types.ts`:
- Add/remove/rename fields to match the column change.
- Keep field names camelCase in TypeScript; use snake_case in SQL.
- Export new types from `src/lib/types.ts` — never define schema types inline.

## Crypto / Sensitive Data

- API keys and tokens are encrypted at rest using `encrypt()` / `tryDecryptOrPlaintext()` from `src/lib/crypto`.
- Always encrypt before writing; always decrypt after reading.
- Column naming convention: `*_encrypted` suffix for encrypted columns (e.g. `token_encrypted`).

## Data Quality Rules

- Validate imported data **before** insertion — reject malformed rows, don't silently default.
- Guard against duplicate transactions using `source_ref` + partial unique index (see migration v4).
- Ticker normalization: uppercase, exchange suffixes applied via `EXCHANGE_SUFFIX_MAP` in `src/lib/db/helpers.ts`.
- Asset type normalization: always one of `'stock' | 'etf' | 'crypto' | 'bond'`.

## PRAGMA Checks

Use `PRAGMA table_info(table_name)` to check for column existence before conditional `ALTER TABLE`. Pattern:
```ts
const cols = await client.execute("PRAGMA table_info(my_table)");
const colNames = new Set(cols.rows.map((r) => str(r.name)));
if (!colNames.has("my_column")) {
  await client.execute({ sql: "ALTER TABLE my_table ADD COLUMN my_column TEXT NOT NULL DEFAULT ''" });
}
```
Import `str` from `src/lib/db/helpers.ts` for safe row string extraction.

## Quality Gates (Mandatory)

Every data/schema change MUST pass all gates below before delivery.

### Gate 1: E2E Tests (Playwright)

- If the schema change supports a user-visible feature, **ensure the corresponding E2E spec** covers the new data flow end-to-end.
- For migrations that alter existing data (backfills, column renames), add a unit test validating the migration logic.
- If adding a new data access function used by an API route, verify the API behavior via E2E.
- Run `npx playwright test` locally before marking done.

### Gate 2: All Themes (Downstream)

Schema changes themselves are theme-agnostic, but:

- If the change adds new fields displayed in the dashboard, verify that consuming components render correctly in **all four themes** (Default, Canvas, Terminal, Studio).
- Coordinate with the consuming engineer skill to ensure theme parity is tested.

### Gate 3: Responsive Design (Downstream)

- If new data fields appear in tables, cards, or summaries, verify the consuming UI at mobile (375px), tablet (768px), and desktop (1280px).
- Coordinate with the consuming engineer skill for responsive verification.

### Gate 4: Mobile Native (Downstream)

- If new data drives UI that appears inside Capacitor WebView, ensure the consuming feature is tested on native.
- Schema changes that affect session, auth, or cookie-stored data must be validated in Capacitor context.

### Gate 5: Code Coverage ≥ 80%

- New and modified files must maintain **≥ 80% line coverage**.
- Run `npx vitest run --coverage` and check the report for touched files.
- Data access functions (`src/lib/db/*`) and migration logic must have unit tests covering all branches.
- Never reduce existing coverage on a file.

## Checklist

```
DB Change Checklist
- [ ] Migration version is unique and higher than all existing versions
- [ ] ALTER TABLE is try/catch guarded (duplicate column)
- [ ] New tables use CREATE TABLE IF NOT EXISTS + CASCADE delete
- [ ] Indexes use IF NOT EXISTS
- [ ] src/lib/types.ts updated to match schema
- [ ] Data access function added/updated in src/lib/db/<domain>.ts
- [ ] Sensitive columns encrypted with encrypt() before write
- [ ] Backfill logic included if new column needs derived values
- [ ] Migration is idempotent (safe to run twice)
- [ ] Code coverage ≥ 80% on new/modified files (`npx vitest run --coverage`)
- [ ] E2E spec covers the data flow for user-visible features
- [ ] Downstream UI verified in all 4 themes, responsive, and native (coordinate with consuming skill)
```

## Coordination

- For import/broker parsing behavior: `engineer-integrations`
- For user-visible effects and feature scope: `product-manager`
- For payment/subscription fields: `engineer-payments-subscriptions`
- For regression confidence: `qa-tester`
- For theme parity of consuming UI: invoke `theme-parity` skill
- For native mobile verification of consuming UI: `engineer-mobile`
