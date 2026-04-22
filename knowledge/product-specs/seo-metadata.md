# seo-metadata

> Sitemap, robots.txt, llms.txt, and metadata.

## 1. Summary
Centralized SEO primitives: `sitemap.ts`, `robots.ts`, `llms.ts`, and default metadata in root layout. JSON-LD injected per page type.

## 2. Status
- **Tier:** public
- **Feature flag:** _none_
- **Health:** B
- **Owning skill:** [`seo-specialist`](../../.cursor/skills/seo-specialist/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| Route | [`src/app/sitemap.ts`](../../src/app/sitemap.ts), [`src/app/robots.ts`](../../src/app/robots.ts), [`src/app/llms.txt/route.ts`](../../src/app/llms.txt/route.ts) (if present) | Primitives. |
| Layout | [`src/app/layout.tsx`](../../src/app/layout.tsx) | Default metadata. |

## 4. Data model
- None.

## 5. API surface
- SEO URLs.

## 6. UI surface
- Metadata consumed by crawlers.

## 7. Business logic
- Include public profile pages; exclude private/admin.

## 8. External dependencies
- None.

## 9. Currency / FX / tax implications
- N/A.

## 10. i18n
- Locale-alternates.

## 11. Permissions / tier gating / rate limits
- Public.

## 12. Telemetry
- `seo_sitemap_regenerated_total`.

## 13. Edge cases & gotchas
- Keep `llms.txt` current with features.

## 14. Tests
- Snapshot on sitemap.

## 15. Related skills and rules
- [`seo-specialist`](../../.cursor/skills/seo-specialist/SKILL.md)

## 16. Open questions / planned work
- Structured data for pricing.
