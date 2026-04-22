# people-search

> Search for other users by handle or name.

## 1. Summary
Discover users to follow. Respects privacy settings and blocked users.

## 2. Status
- **Tier:** Bifolio+
- **Feature flag:** `SOCIAL`
- **Health:** green
- **Owning skill:** [`engineer-social`](../../.cursor/skills/engineer-social/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| API | [`src/app/api/social/search/`](../../src/app/api/social/search) | Search endpoint. |

## 4. Data model
- Indexed subset of `social_profiles`.

## 5. API surface
| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| GET | `/api/social/search?q=` | user | Pro | Candidate list. |

## 6. UI surface
- In-app page + command palette hooks.

## 7. Business logic
- Results exclude blocked + private (unless already connected).

## 8. External dependencies
- None.

## 9. Currency / FX / tax implications
- N/A.

## 10. i18n
- All locales.

## 11. Permissions / tier gating / rate limits
- Pro; rate-limited.

## 12. Telemetry
- `people_search_total`.

## 13. Edge cases & gotchas
- Empty query → return recent connections.

## 14. Tests
- DB tests.

## 15. Related skills and rules
- [`engineer-social`](../../.cursor/skills/engineer-social/SKILL.md)
- Related specs: [connections](connections.md).

## 16. Open questions / planned work
- Fuzzy + typo-tolerant search.
