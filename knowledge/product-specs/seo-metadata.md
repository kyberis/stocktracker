# seo-metadata

> Sitemap, robots.txt, llms.txt, and metadata.

## 1. Summary
Centralized SEO primitives: `sitemap.ts`, `robots.ts`, `llms.txt`, and default metadata in root layout. JSON-LD injected per page type. Public company analysis (`/analisis`, `/analisis/[ticker]`) is indexable for search engines and LLMs.

## 2. Status
- **Tier:** public
- **Feature flag:** _none_
- **Health:** B
- **Owning skill:** [`seo-specialist`](../../.cursor/skills/seo-specialist/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| Route | [`src/app/sitemap.ts`](../../src/app/sitemap.ts), [`src/app/robots.ts`](../../src/app/robots.ts), [`public/llms.txt`](../../public/llms.txt) | Primitives. |
| Layout | [`src/app/layout.tsx`](../../src/app/layout.tsx) | Default metadata. |
| Pages | [`src/app/(app)/analisis/`](../../src/app/(app)/analisis/) | Hub + ticker metadata, SSR article, JSON-LD. |

## 4. Data model
- Sitemap ticker URLs come from non-expired `company_analysis_cache` report rows (`listCachedCompanyAnalysisTickers`).

## 5. API surface
- SEO URLs.

## 6. UI surface
- Metadata consumed by crawlers; `/analisis/[ticker]` SSR summary + disclaimer for non-JS agents.

## 7. Business logic
- Include public profile pages and cached `/analisis/{TICKER}` pages; exclude private/admin.
- Do not sitemap the full screener universe (avoids crawl-driven first-builds against the public daily budget).

## 8. External dependencies
- None.

## 9. Currency / FX / tax implications
- N/A.

## 10. i18n
- Locale-alternates for blog; `/analisis` canonicals in English for v1.

## 11. Permissions / tier gating / rate limits
- Public.

## 12. Telemetry
- `seo_sitemap_regenerated_total`.

## 13. Edge cases & gotchas
- Keep `llms.txt` current with features.
- SSR stock summaries omit live price; quotes refresh via `/api/company-analysis` overlay.
- Live price / market cap UI uses `data-nosnippet` so volatile figures are not used in search snippets.

## 14. Tests
- Snapshot on sitemap; unit tests for analisis SEO title/description/JSON-LD builders.

## 15. Related skills and rules
- [`seo-specialist`](../../.cursor/skills/seo-specialist/SKILL.md)
- Related: [company-analysis](company-analysis.md)

## 16. Open questions / planned work
- Structured data for pricing.
- Optional OG image per ticker.
