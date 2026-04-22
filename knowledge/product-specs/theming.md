# theming

> Light/dark theme with CSS variables.

## 1. Summary
Tailwind + CSS variables drive light/dark themes. Theme is persisted per user + respects system preference.

## 2. Status
- **Tier:** system
- **Feature flag:** _none_
- **Health:** green
- **Owning skill:** [`engineer-dashboard`](../../.cursor/skills/engineer-dashboard/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| Library | `src/lib/theme.ts` (if present) | Helpers. |
| Styles | `src/app/globals.css` | Vars. |

## 4. Data model
- `user_settings.theme`.

## 5. API surface
- N/A.

## 6. UI surface
- Theme toggle in header / settings.

## 7. Business logic
- SSR-safe theme selection (avoid flash).

## 8. External dependencies
- None.

## 9. Currency / FX / tax implications
- N/A.

## 10. i18n
- All locales.

## 11. Permissions / tier gating / rate limits
- N/A.

## 12. Telemetry
- `theme_changed_total`.

## 13. Edge cases & gotchas
- Charts colors must stay legible on both themes (see [`theme-parity`](../../.cursor/skills/theme-parity/SKILL.md)).

## 14. Tests
- Visual snapshots.

## 15. Related skills and rules
- [`theme-parity`](../../.cursor/skills/theme-parity/SKILL.md)
- Related specs: [i18n](i18n.md).

## 16. Open questions / planned work
- High-contrast theme.
