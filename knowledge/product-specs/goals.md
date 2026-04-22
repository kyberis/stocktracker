# goals

> User goals (target value, target date) with progress tracking and notifications.

## 1. Summary
Goal = target net worth by date. Progress computed nightly; celebrated at 100%.

## 2. Status
- **Tier:** Free (1 goal), Pro (unlimited).
- **Feature flag:** _none_
- **Health:** green
- **Owning skill:** [`engineer-data`](../../.cursor/skills/engineer-data/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| API | [`src/app/api/goals/`](../../src/app/api/goals) | CRUD. |
| DB | [`src/lib/db/goals.ts`](../../src/lib/db/goals.ts) | Storage. |

## 4. Data model
- `goals`: target_amount, target_date, currency, created_at.

## 5. API surface
| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| GET/POST/PATCH/DELETE | `/api/goals` | user | Free+ | CRUD. |

## 6. UI surface
- Progress ring + eta, part of dashboard summaries.

## 7. Business logic
- Progress = current net worth / target amount (both in same currency).

## 8. External dependencies
- None.

## 9. Currency / FX / tax implications
- Currency-aware; displayed in preferred currency.

## 10. i18n
- All locales.

## 11. Permissions / tier gating / rate limits
- Tier cap on goal count.

## 12. Telemetry
- `goals_created_total`, `goals_reached_total`.

## 13. Edge cases & gotchas
- Target date in past → show "past due" state.

## 14. Tests
- DB tests.

## 15. Related skills and rules
- [`engineer-data`](../../.cursor/skills/engineer-data/SKILL.md)
- Related specs: [financial-planning](financial-planning.md).

## 16. Open questions / planned work
- Multi-step goals (emergency fund → investing).
