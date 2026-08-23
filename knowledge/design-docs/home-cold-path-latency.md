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
4. Quote batches via `GET /api/quote` → then FX — **skipped on Home cold path when bootstrap hydrates ≥90% coverage**
5. localStorage quotes/FX for fast revisit paint
6. Name enrichment: idle + batches of ≤10 `PUT`s (not a synchronous storm)

### Home bootstrap (preferred path)

`GET /api/home-v2/bootstrap?portfolioId=` — **one** holdings list + **one** quote map + FX, then:

- Day highlights (reuse quotes)
- AID status **without** LLM briefing
- Recommendation tip **from weekly cache only** (no live quote recompute)
- Returns `quotes` + `exchangeRates` for `PortfolioProvider.hydrateMarketData`
- `Server-Timing`: `dur`, `quoteHits`, `quoteMisses`, `holdings`

Contract: Home calls `hydrateMarketData` on bootstrap success; if coverage ≥ 90%, discard competing foreground `/api/quote` fan-out and schedule a background refresh at 30s.

Lazy follow-ups:

- `GET /api/aid/status?includeBriefing=1` — LLM summary (Redis day cache)
- `GET /api/aid/feed` — deferred until idle / near viewport
- `GET /api/portfolio-news` — same deferral on Home compact feed
- Recommendations cold GET uses `?cacheOnly=1` (live only via manual refresh CTA)
- Catalysts / digests / MarketAndCash remain section-local

### Advanced hero only

Starts **simple** each session (does not restore advanced from localStorage on mount). History `range=all` + txs load only after the user clicks Advanced. Aggregated “all portfolios” view on Home skips N× `/api/historical` (`allowPerTickerHistorical={false}`).

## Ranked bottlenecks (large N tickers)

1. Cold Yahoo O(N) per symbol on bootstrap (Redis TTL 30s; in-flight coalesce) — single dominant fan-out when hydrate wins
2. LLM briefing (deferred + day cache)
3. Cold AID feed generation (deferred off critical path)
4. Unbounded holdings/alerts payloads
5. Advanced hero history/txs (session-gated)

## Related

- Spec: [`../product-specs/unified-homepage.md`](../product-specs/unified-homepage.md)
- Skill: [`.cursor/skills/engineer-homepage/SKILL.md`](../../.cursor/skills/engineer-homepage/SKILL.md)
- Quote cache: [`src/lib/quote-cache.ts`](../../src/lib/quote-cache.ts)
