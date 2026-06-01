# feature-flags

> Per-user and global feature flag system.

## 1. Summary
Feature flags registered in code, with per-user overrides stored in DB. Both client (`useFeatureFlag`) and server (`getFeatureFlag`) consumers exist.

## 2. Status
- **Tier:** system
- **Feature flag:** meta
- **Health:** green
- **Owning skill:** [`engineer-feature-flags`](../../.cursor/skills/engineer-feature-flags/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| Library | [`src/lib/feature-flags.ts`](../../src/lib/feature-flags.ts) | Registry. |
| Context | [`src/lib/feature-flag-context.tsx`](../../src/lib/feature-flag-context.tsx) | Client hook. |
| API | [`src/app/api/feature-flags/`](../../src/app/api/feature-flags) | Read. |
| Admin | [`src/app/api/admin/feature-flags/`](../../src/app/api/admin/feature-flags) | Admin mutate. |

## 4. Data model
- `feature_flags`: per-user overrides.
- Global defaults live in code.

## 5. API surface
| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| GET | `/api/feature-flags` | user | Free | Current user's flags. |
| GET/PUT | `/api/admin/feature-flags` | admin | Admin | Manage. |

## 6. UI surface
- Admin table per user; `/account` "Labs" panel for opt-in flags.
- **`commerce_enabled`** (default off): hides subscription pricing, upsell/compare cards, checkout CTAs, and new purchase API paths on trefolio. Existing Pro users keep billing portal access. See payments spec.

## 7. Business logic
- Resolution: user override → global default.
- Kill-switch: admin can disable a flag globally.

## 8. External dependencies
- None.

## 9. Currency / FX / tax implications
- N/A.

## 10. i18n
- Admin English.

## 11. Permissions / tier gating / rate limits
- Admin required for mutation.

## 12. Telemetry
- `feature_flag_exposures_total{flag,state}`.

## 13. Edge cases & gotchas
- Never log PII in flag evaluation traces.

## 14. Tests
- Unit on resolution.

## 15. Related skills and rules
- [`engineer-feature-flags`](../../.cursor/skills/engineer-feature-flags/SKILL.md)
- Related specs: [admin-feature-flags](admin-feature-flags.md).

## 16. Open questions / planned work
- Rollout percentages & bucketing.
