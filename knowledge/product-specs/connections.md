# connections

> Directed or mutual user connections ("followers").

## 1. Summary
Users can follow each other (or mutually connect) to curate their network feed and enable private chat.

## 2. Status
- **Tier:** Bifolio+
- **Feature flag:** `SOCIAL`
- **Health:** B
- **Owning skill:** [`engineer-social`](../../.cursor/skills/engineer-social/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| API | [`src/app/api/social/connections/`](../../src/app/api/social/connections) | Follow/accept/remove. |
| DB | [`src/lib/db/social-connections.ts`](../../src/lib/db/social-connections.ts) | Storage. |

## 4. Data model
- `social_connections`: follower, followee, state.

## 5. API surface
| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| POST | `/api/social/connections/:handle` | user | Pro | Follow/request. |
| DELETE | `/api/social/connections/:handle` | user | Pro | Unfollow. |

## 6. UI surface
- Follow button on profile; connections list page.

## 7. Business logic
- Private profiles require request/accept.

## 8. External dependencies
- None.

## 9. Currency / FX / tax implications
- N/A.

## 10. i18n
- All locales.

## 11. Permissions / tier gating / rate limits
- Rate-limit follow actions.

## 12. Telemetry
- `social_connections_created_total`.

## 13. Edge cases & gotchas
- Blocked users must remain blocked across re-connects.

## 14. Tests
- DB tests.

## 15. Related skills and rules
- [`engineer-social`](../../.cursor/skills/engineer-social/SKILL.md)
- Related specs: [social-profiles](social-profiles.md), [private-chat](private-chat.md).

## 16. Open questions / planned work
- Suggested connections.
