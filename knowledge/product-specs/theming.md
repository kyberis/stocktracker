# theming

> Four layout themes sharing one component tree, with the default theme now using the glass visual system.

## 1. Summary

trefolio exposes four layout themes through `LayoutTheme`:

- `default`
- `canvas`
- `terminal`
- `studio`

The default theme is the primary product direction and uses the glass surface language defined in [`knowledge/design-docs/glass-visual-system.md`](../design-docs/glass-visual-system.md). The other themes remain supported as compatibility layers with their own token overrides.

Theme choice is persisted per user, reflected in a cookie for SSR/first paint, and synchronized onto `<html>` classes so the app can avoid flash and apply forced light/dark behavior where required.

## 2. Status

- **Tier:** system
- **Feature flag:** _none_
- **Health:** active
- **Owning skills:** [`engineer-dashboard`](../../.cursor/skills/engineer-dashboard/SKILL.md), [`theme-parity`](../../.cursor/skills/theme-parity/SKILL.md)

## 3. Entry points

| Type | Path | Notes |
|------|------|-------|
| Context | `src/lib/theme-context.tsx` | Applies layout theme, dark/light mode, and forced mode rules. |
| Settings | `src/lib/settings-context.tsx` | Persists selected theme and writes the SSR cookie. |
| Shell | `src/app/layout.tsx` | Reads cookie and preloads the right `<html>` classes before hydration. |
| Styles | `src/app/globals.css` | Semantic tokens, shared primitives, theme-specific overrides. |
| UI | `src/components/ThemeSelector.tsx` | Theme picker with subscription gating. |

## 4. Data model

- `user_settings.dashboard_theme`
- cookie: `trefolio_layout_theme`
- local storage: theme mode preference for `default` only

## 5. UI surface

- Theme picker in settings
- Mode toggle in the app header for `default`
- Studio shell uses sidebar navigation
- Default / Canvas / Terminal use top-nav plus mobile tab bar

## 6. Theme behavior

### Default

- Primary visual system
- Glass-based shells and cards
- Supports light/dark mode toggle

### Canvas

- Forced light
- Softer, airier version of the same semantic token system

### Terminal

- Forced dark
- Dense, low-radius, near-flat styling
- Explicitly disables heavy glass behavior through token overrides

### Studio

- Forced dark
- Sidebar-first premium shell
- Uses the same semantic glass tokens but with a more cinematic dark presentation

## 7. Business logic

- Only `default` can toggle between light/dark based on user preference or system preference.
- `canvas` forces light.
- `terminal` and `studio` force dark.
- HTML classes must stay in sync with both cookie state and client state.
- Theme changes must preserve structure parity. Themes may restyle layout and tokens; they must not remove product features.

## 8. Permissions / tier gating

- `default`: all users
- `canvas`: Starter+
- `terminal`: Pro
- `studio`: Pro

Gating rules live in subscription helpers and are surfaced in `ThemeSelector`.

## 9. i18n

- Theme names and descriptions are localized in the normal locale files.

## 10. Telemetry

- If theme-selection tracking exists, keep it aligned with the active theme registry.

## 11. Edge cases & gotchas

- Any dashboard change must render correctly in all four themes.
- Charts must remain readable even when shells/cards become more translucent.
- Mobile should use calmer surfaces than desktop hero cards.
- Overlays and sheets must be more opaque than decorative cards.
- `/demo` must stay in sync when dashboard dependencies or providers change.

## 12. Tests

- Theme parity checks
- Dashboard E2E checks across themes
- Focused manual verification at 375px, 768px, and desktop widths

## 13. Related docs, rules, and skills

- [`knowledge/design-docs/glass-visual-system.md`](../design-docs/glass-visual-system.md)
- [`theme-parity`](../../.cursor/skills/theme-parity/SKILL.md)
- [`ui-design-system.mdc`](../../.cursor/rules/ui-design-system.mdc)
- [`knowledge/FRONTEND.md`](../FRONTEND.md)

## 14. Planned work

- High-contrast accessibility variant if current token system proves insufficient
- Theme previews that better reflect the live shell and hero card states

## 15. Open questions / follow-ups

- Whether the default theme should eventually expose a user-facing "reduced glass" accessibility toggle
- Whether landing screenshots should be refreshed once more major product areas adopt the same visual system
