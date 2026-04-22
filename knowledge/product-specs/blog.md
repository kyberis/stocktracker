# blog

> `/blog` content pages.

## 1. Summary
MDX-based blog for SEO and education. Indexed list + per-post pages; social cards generated at build.

## 2. Status
- **Tier:** public
- **Feature flag:** _none_
- **Health:** green
- **Owning skill:** [`seo-specialist`](../../.cursor/skills/seo-specialist/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| Page | `src/app/blog/` | Index + post pages. |
| Content | `content/blog/*.mdx` (if present) | Source. |

## 4. Data model
- Files on disk, not DB.

## 5. API surface
- N/A.

## 6. UI surface
- Post page with TOC + share buttons.

## 7. Business logic
- Canonical URLs, JSON-LD Article.

## 8. External dependencies
- None.

## 9. Currency / FX / tax implications
- N/A.

## 10. i18n
- Locale-per-post directory.

## 11. Permissions / tier gating / rate limits
- Public.

## 12. Telemetry
- `blog_view_total`.

## 13. Edge cases & gotchas
- Keep disclaimers on investment-topic posts.

## 14. Tests
- Content lints.

## 15. Related skills and rules
- [`seo-specialist`](../../.cursor/skills/seo-specialist/SKILL.md)
- Related specs: [seo-metadata](seo-metadata.md).

## 16. Open questions / planned work
- Author pages and related-posts rail.
