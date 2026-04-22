# release-process

> Versioning, release notes, and deploy.

## 1. Summary
`CURRENT_VERSION` in `release-version.ts` + entries in `release-notes.ts` feed a visible "What's new" modal and email. CI deploys on green main.

## 2. Status
- **Tier:** system
- **Feature flag:** _none_
- **Health:** green
- **Owning skill:** [`release-manager`](../../.cursor/skills/release-manager/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| Library | [`src/lib/release-notes.ts`](../../src/lib/release-notes.ts), [`src/lib/release-version.ts`](../../src/lib/release-version.ts) | Source of truth. |
| Rule | [`.cursor/rules/release-notes.mdc`](../../.cursor/rules/release-notes.mdc) | Enforcement. |

## 4. Data model
- Versions in code; shown-version tracked per user.

## 5. API surface
- N/A.

## 6. UI surface
- "What's new" modal.

## 7. Business logic
- Changes tagged `feature | improvement | fix` with EN + ES strings.

## 8. External dependencies
- Vercel deploy.

## 9. Currency / FX / tax implications
- N/A.

## 10. i18n
- EN + ES minimum.

## 11. Permissions / tier gating / rate limits
- N/A.

## 12. Telemetry
- `release_notes_viewed_total{version}`.

## 13. Edge cases & gotchas
- Bump `CURRENT_VERSION` when starting a new entry.

## 14. Tests
- Lint that each new change has both languages.

## 15. Related skills and rules
- [`release-manager`](../../.cursor/skills/release-manager/SKILL.md)
- Related specs: [landing](landing.md).

## 16. Open questions / planned work
- Auto-tweet/Blog post from release notes.
