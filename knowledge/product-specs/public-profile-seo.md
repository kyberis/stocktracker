# public-profile-seo

> SEO metadata and sitemap entries for `/u/:handle` pages.

## 1. Summary
Public profiles include canonical URL, OpenGraph, Twitter card, JSON-LD `Person` and `InvestmentOrAccount` (limited fields), and are listed in the sitemap.

## 2. Status
- **Tier:** Free (profile visibility).
- **Feature flag:** `SOCIAL`
- **Health:** B
- **Owning skill:** [`seo-specialist`](../../.cursor/skills/seo-specialist/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| Route | `src/app/u/[handle]/page.tsx` | Sets metadata. |
| Sitemap | [`src/app/sitemap.ts`](../../src/app/sitemap.ts) | Adds profiles. |

## 4. Data model
- Reads `social_profiles`.

## 5. API surface
- N/A.

## 6. UI surface
- Standard profile with SEO-friendly markup.

## 7. Business logic
- Private profiles excluded from sitemap + set `noindex`.

## 8. External dependencies
- None.

## 9. Currency / FX / tax implications
- N/A.

## 10. i18n
- Localized descriptions.

## 11. Permissions / tier gating / rate limits
- Public cache.

## 12. Telemetry
- N/A.

## 13. Edge cases & gotchas
- Abuse: rate-limit sitemap generation; redirect on handle change.

## 14. Tests
- Snapshot on metadata.

## 15. Related skills and rules
- [`seo-specialist`](../../.cursor/skills/seo-specialist/SKILL.md)
- Related specs: [social-profiles](social-profiles.md).

## 16. Open questions / planned work
- Structured "best posts" in OpenGraph image.
