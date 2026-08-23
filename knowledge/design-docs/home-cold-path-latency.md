# Home cold-path latency

Baseline inventory of what authenticated Home (`/`) loads on entry, and which work scales badly with large portfolios (many unique tickers). Goal: one server-side quote pipeline per visit for home sections; defer LLM and below-the-fold feeds.

## Entry

`/` → `DashboardShell` → `HomeV2Dashboard`. No RSC portfolio prefetch; client providers hydrate first.

## Request map (non-demo)

### Layout (every app page)

| Request | Notes |
|---------|--------|
| `GET /api/auth/me` | O(1) |
| `GET /api/feature-flags` | O(1) |
| `GET /api/user-settings` | O(1) |
| `GET /api/ticker-bar` | Shared module fetch (bar + toast) |
| `GET /api/satisfaction` | O(1) |

### Portfolio core (`PortfolioProvider`)

1. `GET /api/portfolios`
2. `GET /api/holdings` + `GET /api/cash` (unbounded)
3. `GET /api/alerts/tickers`, `GET /api/goals` (fire-and-forget)
4. Quote batches via `GET /api/quote` → then FX
5. localStorage quotes/FX for fast revisit paint

### Home bootstrap (preferred path)

`GET /api/home-v2/bootstrap?portfolioId=` — **one** holdings list + **one** quote map, then:

- Day highlights (reuse quotes)
- AID status **without** LLM briefing
- Recommendation tip **from weekly cache only** (no live quote recompute)

Lazy follow-ups:

- `GET /api/aid/status?includeBriefing=1` — LLM summary (Redis day cache)
- `GET /api/aid/feed` — deferred until idle / near viewport
- `GET /api/portfolio-news` — same deferral on Home compact feed
- Catalysts / digests / MarketAndCash remain section-local

### Advanced hero only

`range=all` history + full transactions (+ optional per-ticker historical). Not on simple hero default.

## Ranked bottlenecks (large N tickers)

1. Repeated full-book quote fetches across parallel home APIs (mitigated by bootstrap + `/api/quote` → `getQuotesWithCache` coalesce)
2. Cold Yahoo O(N) per symbol (Redis TTL 30s; in-flight coalesce per isolate)
3. LLM on every AID status visit (deferred + day cache)
4. Cold AID feed generation (deferred off critical path)
5. Unbounded holdings/alerts payloads
6. Name-enrichment PATCH storms after first quote load

## Related

- Spec: [`../product-specs/unified-homepage.md`](../product-specs/unified-homepage.md)
- Skill: [`.cursor/skills/engineer-homepage/SKILL.md`](../../.cursor/skills/engineer-homepage/SKILL.md)
- Quote cache: [`src/lib/quote-cache.ts`](../../src/lib/quote-cache.ts)
