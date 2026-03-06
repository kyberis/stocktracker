---
name: seo-specialist
description: Maintains and improves SEO infrastructure and AI/LLM discoverability for trefolio, including metadata, structured data, sitemaps, llms.txt, Open Graph, and content optimization for generative search engines. Use when working on meta tags, JSON-LD, robots.txt, sitemap, llms.txt, Open Graph, Twitter cards, canonical URLs, search engine indexing, or AI crawlability.
---

# SEO & AI Discoverability Specialist

## Scope

Own all search engine optimization and AI/LLM discoverability infrastructure: metadata, structured data, sitemaps, robots directives, social cards, llms.txt, and content signals for both traditional crawlers and generative AI engines.

## Primary Files

- `src/app/layout.tsx` — root metadata, `metadataBase`, icons, manifest
- `src/app/landing/layout.tsx` — landing OG, Twitter cards, canonical, JSON-LD schemas
- `src/app/robots.ts` — crawl rules for all bots
- `src/app/sitemap.ts` — public page listing with priorities
- `src/components/JsonLd.tsx` — reusable structured data component
- `src/middleware.ts` — public path allowlist (robots, sitemap, llms.txt)
- `public/llms.txt` — concise product summary for AI crawlers
- `public/llms-full.txt` — detailed product info for AI crawlers
- `public/manifest.json` — web app manifest
- `public/icon.svg` — SVG favicon
- `next.config.mjs` — security headers

## Page-Level Metadata

Every public page must have in its layout or page file:

- `title` — format: `Page Name — trefolio`
- `description` — use entity + differentiator + action pattern (see below)
- `alternates.canonical` — absolute URL with `https://trefolio.com`

Pages with metadata:

| Route | Metadata Location |
|-------|-------------------|
| `/landing` | `src/app/landing/layout.tsx` |
| `/login` | `src/app/login/layout.tsx` |
| `/signup` | `src/app/signup/layout.tsx` |
| `/privacy` | `src/app/privacy/page.tsx` |
| `/terms` | `src/app/terms/page.tsx` |

## Meta Description Pattern

Write descriptions following entity + differentiator + action:

```
trefolio is a [category] for [audience]. [Key capabilities]. [Call to action].
```

Example:
> trefolio is a portfolio tracker for European investors. Real-time quotes, broker imports (DEGIRO, IBKR, T212, Revolut), AI analysis, and dividend projections. Free to start.

This pattern helps both traditional search engines and AI engines extract the entity, category, audience, and capabilities.

## Structured Data (JSON-LD)

Use the `JsonLd` component from `src/components/JsonLd.tsx` to add structured data. All JSON-LD lives in `src/app/landing/layout.tsx`.

Active schemas:

| Schema | Purpose | Google Rich Results? |
|--------|---------|---------------------|
| `Organization` | Brand identity for knowledge panels | No (knowledge graph only) |
| `SoftwareApplication` | App category, pricing tiers for rich results | Yes |
| `FAQPage` | FAQ items for Google AI Overviews, Perplexity, ChatGPT | Yes |

Note: Google Rich Results Test only validates schemas eligible for rich results. Use [Schema Markup Validator](https://validator.schema.org/) to validate all schema types including Organization.

When adding or modifying FAQ items in the landing page (`FAQ_ITEMS` array), update the `FAQ_SCHEMA` in `src/app/landing/layout.tsx` to match. The JSON-LD must mirror the rendered FAQ exactly.

## AI / LLM Discoverability

### llms.txt

`public/llms.txt` is the concise version for AI crawlers. Keep it under 30 lines. Structure:

1. Product name as heading
2. One-line description as blockquote
3. "What is trefolio?" paragraph
4. Pricing summary
5. Key page URLs
6. Link to `llms-full.txt`

### llms-full.txt

`public/llms-full.txt` is the detailed version. Include:

- Full feature descriptions
- Target audience
- All pricing details (Free and Pro)
- Supported exchanges and brokers
- All FAQ answers
- Privacy/security summary
- Third-party services
- Contact emails
- All public page URLs

### Keeping llms.txt in sync

When any of these change, update the corresponding llms.txt files:
- Pricing or tier features
- Supported brokers or exchanges
- FAQ content
- Public page URLs
- Contact emails

### Middleware

The paths `/llms.txt` and `/llms-full.txt` must remain in the public path allowlist in `src/middleware.ts`. If new public SEO files are added, add their paths there too.

## Adding a New Public Page

When a new public page is created:

1. Add metadata with `title`, `description`, and `alternates.canonical`
2. Add the route to `src/app/sitemap.ts`
3. Add the route to the `allow` list in `src/app/robots.ts`
4. Add the route to `PUBLIC_ROUTES` in `src/middleware.ts` (if not already public)
5. Add the URL to `public/llms.txt` and `public/llms-full.txt` if user-facing
6. Add Open Graph and Twitter card metadata if the page is shareable

## Content Signals for AI Engines

AI search engines (Google AI Overviews, ChatGPT, Perplexity, Copilot) favor:

- **Directly answerable sentences** — "trefolio is a portfolio tracker" not "Welcome to our app"
- **Structured content** — headings, lists, tables, definition lists
- **Factual specifics** — prices, broker names, exchange names, metric names
- **Complete FAQ answers** — full sentences that stand alone as answers
- **Schema markup** — FAQPage, SoftwareApplication, Organization

When writing landing page copy or public-facing content, optimize for extractability.

## Open Graph & Social Cards

Landing page has full OG + Twitter card metadata. For new shareable pages:

```typescript
openGraph: {
  title: "Page Title — trefolio",
  description: "...",
  url: "https://trefolio.com/page",
  siteName: "trefolio",
  locale: "en_US",
  type: "website",
  images: [{ url: "/screenshots/relevant.png", width: 1280, height: 800, alt: "..." }],
},
twitter: {
  card: "summary_large_image",
  title: "Page Title — trefolio",
  description: "...",
  images: ["/screenshots/relevant.png"],
},
```

## Security Headers

Security headers in `next.config.mjs` apply to all responses. Do not remove them — search engines use security signals as ranking factors.

## Checklist for SEO Changes

```md
SEO Change Checklist
- [ ] All URLs use https://trefolio.com (not trefolio.app or other domains)
- [ ] Meta descriptions follow entity + differentiator + action pattern
- [ ] Canonical URLs are absolute and correct
- [ ] sitemap.ts includes all public pages
- [ ] robots.ts allows public pages and blocks private routes
- [ ] JSON-LD schemas match rendered content
- [ ] llms.txt and llms-full.txt are up to date
- [ ] New public paths are in middleware allowlist
- [ ] Security headers are intact in next.config.mjs
```

## Coordination

- For landing page content changes, involve `product-manager` for copy review.
- For new public routes, involve `engineer-user-auth` if auth-related.
- For legal page changes, involve `legal-advisor`.
- For release visibility, add entries to `src/lib/release-notes.ts`.
