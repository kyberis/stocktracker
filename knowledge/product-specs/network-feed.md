# network-feed

> Timeline of posts from followed users.

## 1. Summary
Reverse-chronological feed of posts from people the user follows, with filter chips.

## 2. Status
- **Tier:** Bifolio+
- **Feature flag:** `SOCIAL`
- **Health:** B
- **Owning skill:** [`engineer-social`](../../.cursor/skills/engineer-social/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| Page | `src/app/(app)/network/page.tsx` | Feed page. |
| API | [`src/app/api/social/feed/`](../../src/app/api/social/feed) | Feed endpoint. |

## 4. Data model
- Reads `social_posts` joined on `social_connections`.

## 5. API surface
| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| GET | `/api/social/feed` | user | Pro | Paginated feed. |

## 6. UI surface
- Infinite scroll, filter by post kind.

## 7. Business logic
- Hide blocked users; paginate with stable cursors.

## 8. External dependencies
- None.

## 9. Currency / FX / tax implications
- N/A.

## 10. i18n
- All locales.

## 11. Permissions / tier gating / rate limits
- Pro; short-TTL cache per user.

## 12. Telemetry
- `feed_views_total`.

## 13. Edge cases & gotchas
- Cold-start feed for new users → surface recommended accounts.

## 14. Tests
- DB tests.

## 15. Related skills and rules
- [`engineer-social`](../../.cursor/skills/engineer-social/SKILL.md)
- Related specs: [social-posts](social-posts.md), [connections](connections.md).

## 16. Open questions / planned work
- Algorithmic ranking.
