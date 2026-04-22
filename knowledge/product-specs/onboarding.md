# onboarding

> Multi-step onboarding flow after signup.

## 1. Summary
Collects name, preferred currency/locale, experience level, and primary broker. Creates first portfolio and suggests imports.

## 2. Status
- **Tier:** all users
- **Feature flag:** _none_
- **Health:** B
- **Owning skill:** [`ux-writer`](../../.cursor/skills/ux-writer/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| Page | `src/app/(app)/onboarding/` | Wizard. |
| API | `/api/onboarding/*` | Persistence. |
| DB | [`src/lib/db/onboarding-logs.ts`](../../src/lib/db/onboarding-logs.ts) | Analytics. |

## 4. Data model
- `onboarding_logs` per step.
- `user_settings` updated.

## 5. API surface
- POST each step; GET progress.

## 6. UI surface
- Stepper with progress bar.

## 7. Business logic
- Resumable; per-step analytics events.

## 8. External dependencies
- None.

## 9. Currency / FX / tax implications
- Preferred currency set here.

## 10. i18n
- All locales.

## 11. Permissions / tier gating / rate limits
- Authenticated users only.

## 12. Telemetry
- `onboarding_step_completed_total{step}`.

## 13. Edge cases & gotchas
- Users who skip can re-enter via settings.

## 14. Tests
- E2E smoke.

## 15. Related skills and rules
- [`ux-writer`](../../.cursor/skills/ux-writer/SKILL.md)
- Related specs: [import-hub](import-hub.md), [accounts-profile](accounts-profile.md).

## 16. Open questions / planned work
- Reduce step count.
