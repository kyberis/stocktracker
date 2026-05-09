---
name: seo-specialist
description: SEO and AI/LLM discoverability for Next.js App Router apps — metadata, JSON-LD, sitemaps, robots, llms.txt, Open Graph. Use when editing public pages, meta tags, or crawler-facing files.
---

# SEO and AI discoverability

## Scope

Improve traditional SEO and signals used by AI crawlers (`llms.txt`, structured summaries).

## Typical files (App Router)

Map to your app:

- Root layout — `metadataBase`, icons, default title template
- Per-route `layout.tsx` / `page.tsx` — `metadata` export or `generateMetadata`
- `app/robots.ts`, `app/sitemap.ts` — if you use dynamic robots/sitemap
- `public/llms.txt`, `public/llms-full.txt` — optional AI-facing summaries
- `middleware.ts` — ensure public assets and crawler routes are reachable

## Page metadata checklist

- Unique `title` and `description` per important public URL
- Canonical URLs where duplicates exist
- Open Graph / Twitter cards for pages you share socially
- JSON-LD for entities you want rich results for (validate with Google's Rich Results Test)

## Content patterns

- Title: specific page + brand delimiter you standardize on
- Description: concrete benefit + entity; avoid keyword stuffing

## llms.txt

Keep a concise product summary; optional longer file for detail. Update when positioning changes.

## Hygiene

- Do not block legitimate crawlers from public marketing content unless security requires it.
- Use `noindex` on authenticated or transient pages.
