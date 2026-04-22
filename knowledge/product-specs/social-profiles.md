# social-profiles

> Public user profiles at `/u/:handle`.

## 1. Summary
Each user can turn on a public profile: display name, bio, avatar, and a selection of shareable holdings/posts. Acts as the user's social "home."

## 2. Status
- **Tier:** Free (profile only), Bifolio+ (public posts).
- **Feature flag:** `SOCIAL`
- **Health:** B
- **Owning skill:** [`engineer-social`](../../.cursor/skills/engineer-social/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| Page | `src/app/u/[handle]/page.tsx` | Public profile. |
| API | [`src/app/api/social/profile/`](../../src/app/api/social/profile) | Profile CRUD. |
| DB | [`src/lib/db/social-profiles.ts`](../../src/lib/db/social-profiles.ts) | Storage. |

## 4. Data model
- `social_profiles`: handle (unique), display_name, bio, avatar, privacy.

## 5. API surface
| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| GET | `/api/social/profile/:handle` | optional | Free | Public read. |
| PATCH | `/api/social/profile` | user | Free | Edit own. |

## 6. UI surface
- Profile page with top stats, posts, connections count.

## 7. Business logic
- Handles unique, reserved list (`admin`, etc.).

## 8. External dependencies
- None.

## 9. Currency / FX / tax implications
- Any revealed portfolio data shown in preferred currency.

## 10. i18n
- All locales.

## 11. Permissions / tier gating / rate limits
- `SOCIAL` flag.

## 12. Telemetry
- `profile_views_total`.

## 13. Edge cases & gotchas
- Handle change cooldown; historic URLs still redirect.

## 14. Tests
- DB tests + E2E.

## 15. Related skills and rules
- [`engineer-social`](../../.cursor/skills/engineer-social/SKILL.md)
- Related specs: [social-posts](social-posts.md), [connections](connections.md), [public-profile-seo](public-profile-seo.md).

## 16. Open questions / planned work
- Verified badges for device owners.
