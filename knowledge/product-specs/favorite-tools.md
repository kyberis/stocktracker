# favorite-tools

> Pin commonly used tools to a quick-access bar.

## 1. Summary
User can pin up to N tools to the dashboard toolbar. Persisted in `user_settings`.

## 2. Status
- **Tier:** Free
- **Feature flag:** _none_
- **Health:** green
- **Owning skill:** [`engineer-tools`](../../.cursor/skills/engineer-tools/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| Component | `FavoriteToolsBar.tsx` (if present) | UI. |

## 4. Data model
- `user_settings.favorite_tools` JSON array.

## 5. API surface
- Via `/api/user-settings`.

## 6. UI surface
- Pin/unpin button on tool cards.

## 7. Business logic
- Max N items; reorder via drag.

## 8. External dependencies
- None.

## 9. Currency / FX / tax implications
- N/A.

## 10. i18n
- All locales.

## 11. Permissions / tier gating / rate limits
- N/A.

## 12. Telemetry
- `favorite_tools.changed`.

## 13. Edge cases & gotchas
- Tool that becomes Pro-only stays pinned but shows upgrade nudge.

## 14. Tests
- E2E pin/unpin.

## 15. Related skills and rules
- [`engineer-tools`](../../.cursor/skills/engineer-tools/SKILL.md)
- Related specs: [tools-index](tools-index.md).

## 16. Open questions / planned work
- Sync favorites across devices (already via settings).
