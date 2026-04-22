# admin-feature-flags

> Admin UI to manage feature flags.

## 1. Summary
Table of known flags + per-user overrides. Can toggle global defaults or assign per-user.

## 2. Status
- **Tier:** admin
- **Feature flag:** _none_
- **Health:** green
- **Owning skill:** [`engineer-feature-flags`](../../.cursor/skills/engineer-feature-flags/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| API | [`src/app/api/admin/feature-flags/`](../../src/app/api/admin/feature-flags) | CRUD. |

## 4. Data model
- `feature_flags`.

## 5. API surface
- GET/PUT.

## 6. UI surface
- Per-flag switch + per-user override search.

## 7. Business logic
- Audit log of changes.

## 8. External dependencies
- None.

## 9. Currency / FX / tax implications
- N/A.

## 10. i18n
- English.

## 11. Permissions / tier gating / rate limits
- Admin.

## 12. Telemetry
- `feature_flag_changes_total`.

## 13. Edge cases & gotchas
- Kill switch is immediate.

## 14. Tests
- Smoke.

## 15. Related skills and rules
- [`engineer-feature-flags`](../../.cursor/skills/engineer-feature-flags/SKILL.md)
- Related specs: [feature-flags](feature-flags.md).

## 16. Open questions / planned work
- Bucket-based rollouts.
