# social-posts

> Rich-content posts with holding attachments.

## 1. Summary
Authenticated users can post text, images, and attached holdings/charts to their profile or the network feed.

## 2. Status
- **Tier:** Bifolio+
- **Feature flag:** `SOCIAL`
- **Health:** B
- **Owning skill:** [`engineer-social`](../../.cursor/skills/engineer-social/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| API | [`src/app/api/social/posts/`](../../src/app/api/social/posts) | CRUD. |
| DB | [`src/lib/db/social-posts.ts`](../../src/lib/db/social-posts.ts) | Storage. |

## 4. Data model
- `social_posts`: author, content (markdown), media, attachments, visibility.

## 5. API surface
| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| GET/POST/PATCH/DELETE | `/api/social/posts` | user | Pro | CRUD. |

## 6. UI surface
- Compose modal with attach-holding picker; feed cards.

## 7. Business logic
- Markdown sanitized; only allowlisted embeds.
- Media stored via Blob/CDN.

## 8. External dependencies
- Blob storage.

## 9. Currency / FX / tax implications
- Holding cards respect viewer's preferred currency.

## 10. i18n
- All locales.

## 11. Permissions / tier gating / rate limits
- `SOCIAL` + rate-limit new-post creation.

## 12. Telemetry
- `social_posts_created_total`, `social_posts_views_total`.

## 13. Edge cases & gotchas
- Deleted posts keep dangling references? Cascade-clean linked chat shares.

## 14. Tests
- DB + E2E.

## 15. Related skills and rules
- [`engineer-social`](../../.cursor/skills/engineer-social/SKILL.md)
- Related specs: [social-profiles](social-profiles.md), [network-feed](network-feed.md).

## 16. Open questions / planned work
- Comments and reactions at scale.
