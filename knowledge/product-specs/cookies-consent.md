# cookies-consent

> GDPR/EU cookie banner and consent storage.

## 1. Summary
First-visit banner captures granular consent (necessary/analytics/marketing); subsequent pages respect consent before loading 3rd-party scripts.

## 2. Status
- **Tier:** public
- **Feature flag:** _none_
- **Health:** B
- **Owning skill:** [`legal-advisor`](../../.cursor/skills/legal-advisor/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| Component | Banner in root layout. |
| Library | `src/lib/consent.ts` (if present). |

## 4. Data model
- Cookie `cc_consent` (JSON) + localStorage mirror.

## 5. API surface
- N/A.

## 6. UI surface
- Banner + preferences modal.

## 7. Business logic
- "Necessary" always on; other categories opt-in.
- Changes re-gate analytics/ad scripts.

## 8. External dependencies
- None.

## 9. Currency / FX / tax implications
- N/A.

## 10. i18n
- All locales.

## 11. Permissions / tier gating / rate limits
- Public.

## 12. Telemetry
- Only sent after analytics consent.

## 13. Edge cases & gotchas
- SSR must render neutral until client decides.

## 14. Tests
- Snapshot + E2E flows.

## 15. Related skills and rules
- [`legal-advisor`](../../.cursor/skills/legal-advisor/SKILL.md)
- Related specs: [analytics-events](analytics-events.md), [ads](ads.md).

## 16. Open questions / planned work
- Central consent vault.
