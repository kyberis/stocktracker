# global-search

> Cmd-K style global search across assets, tools, pages, and settings.

## 1. Summary
Unified search UI launched with cmd-K. Returns assets, tools, docs, and admin links (if applicable).

## 2. Status
- **Tier:** Free
- **Feature flag:** _none_
- **Health:** green
- **Owning skill:** [`engineer-dashboard`](../../.cursor/skills/engineer-dashboard/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| API | [`src/app/api/search/`](../../src/app/api/search) | Backend. |
| Component | `GlobalSearchModal.tsx` (if present). |

## 4. Data model
- Indexed list of pages/tools in code; asset search routes through providers.

## 5. API surface
- Reuses `/api/search` + client-side index of pages.

## 6. UI surface
- Modal palette with recent results.

## 7. Business logic
- Keyboard-first; focus traps; screen-reader friendly.

## 8. External dependencies
- None.

## 9. Currency / FX / tax implications
- N/A.

## 10. i18n
- All locales.

## 11. Permissions / tier gating / rate limits
- Inherits rate limits of underlying `/api/search`.

## 12. Telemetry
- `analytics_events`: `global_search.opened`, `global_search.selected`.

## 13. Edge cases & gotchas
- Admin-only entries hidden from non-admin users.

## 14. Tests
- E2E cmd-K.

## 15. Related skills and rules
- [`engineer-dashboard`](../../.cursor/skills/engineer-dashboard/SKILL.md)
- Related specs: [explore-asset-search](explore-asset-search.md).

## 16. Open questions / planned work
- Fuzzy match on natural-language queries.
