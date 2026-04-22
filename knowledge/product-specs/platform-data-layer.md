# platform-data-layer

> Turso (libSQL) DB access.

## 1. Summary
All data flows through `src/lib/db/*` modules wrapping libSQL with typed accessors. Migrations live in `src/lib/db/migrations.ts` and are applied at boot.

## 2. Status
- **Tier:** system
- **Feature flag:** _none_
- **Health:** B
- **Owning skill:** [`engineer-data`](../../.cursor/skills/engineer-data/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| Library | [`src/lib/db/`](../../src/lib/db) | All DB modules. |
| Migrations | [`src/lib/db/migrations.ts`](../../src/lib/db/migrations.ts) | Versioned. |

## 4. Data model
- Entire app schema; see [`knowledge/generated/db-schema.md`](../generated/db-schema.md).

## 5. API surface
- Module-level async functions.

## 6. UI surface
- N/A.

## 7. Business logic
- Each domain has a single access module; cross-domain joins isolated to aggregators.
- Deletes soft where possible.

## 8. External dependencies
- Turso (libSQL).

## 9. Currency / FX / tax implications
- EUR-base for internal math.

## 10. i18n
- N/A.

## 11. Permissions / tier gating / rate limits
- All queries scoped by user_id.

## 12. Telemetry
- `db_query_duration_seconds`.

## 13. Edge cases & gotchas
- libSQL driver retries on network blips.

## 14. Tests
- DB tests per module.

## 15. Related skills and rules
- [`engineer-data`](../../.cursor/skills/engineer-data/SKILL.md)
- Related specs: [platform-cron-system](platform-cron-system.md).

## 16. Open questions / planned work
- Online schema migration tool.
