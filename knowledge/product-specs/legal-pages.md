# legal-pages

> Privacy, Terms, Disclaimers, and Impressum.

## 1. Summary
Versioned legal pages with locale variants, reachable from the footer and referenced by the consent banner and account pages.

## 2. Status
- **Tier:** public
- **Feature flag:** _none_
- **Health:** B
- **Owning skill:** [`legal-advisor`](../../.cursor/skills/legal-advisor/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| Pages | [`src/app/privacy/page.tsx`](../../src/app/privacy/page.tsx), [`src/app/terms/page.tsx`](../../src/app/terms/page.tsx), `src/app/disclaimer/`, `src/app/impressum/` | Static pages. |

## 4. Data model
- Version field in page content.

## 5. API surface
- None.

## 6. UI surface
- Standard prose.

## 7. Business logic
- Major changes prompt users to re-accept on next login.

## 8. External dependencies
- None.

## 9. Currency / FX / tax implications
- N/A.

## 10. i18n
- All locales.

## 11. Permissions / tier gating / rate limits
- Public.

## 12. Telemetry
- `legal_page_views_total`.

## 13. Edge cases & gotchas
- Keep investment disclaimers on any page showing market data.

## 14. Tests
- Snapshot.

## 15. Related skills and rules
- [`legal-advisor`](../../.cursor/skills/legal-advisor/SKILL.md)
- Related specs: [cookies-consent](cookies-consent.md).

## 16. Open questions / planned work
- Clickwrap journal per user.
