# Company analysis (`/analisis`)

> Search a ticker and render a multi-section company analysis report (fundamentals, technicals, news, Form 4, US Congress trading).

## 1. Summary

Authenticated users open **Analysis** in primary nav, search a US-listed symbol via autocomplete, and land on `/analisis/[ticker]`. The backend aggregates market data in parallel (never inventing missing figures), caches the report, and optionally generates grounded AI narrative slices.

## 2. Status

- **Tier:** Free (low monthly sample quota) / Pro (generous quota via `company_analysis`)
- **Feature flag:** _none_
- **Health:** yellow (new; Congress depends on FMP plan entitlements)
- **Owning skill:** [`engineer-integrations`](../../.cursor/skills/engineer-integrations/SKILL.md)

## 3. Entry points

| Type | Path | Notes |
|------|------|-------|
| Page | `src/app/(app)/analisis/page.tsx` | Search landing (`?q=` prefill); hub metadata + WebPage JSON-LD |
| Page | `src/app/(app)/analisis/[ticker]/page.tsx` | Report (`?exchange=`); `generateMetadata` + SSR SEO article |
| Component | `src/components/company-analysis/AnalisisSeoContent.tsx` | Crawler/LLM HTML + Corporation/WebPage/Breadcrumb JSON-LD |
| API | `GET /api/company-analysis` | Aggregated report |
| API | `POST /api/company-analysis/narrative` | Grounded JSON narratives |
| Nav | `src/lib/app-nav.ts` | Primary overflow + Pro badge |
| Nav | `NavAssetSearch` in landing header + AppNav | Select → `/analisis/...?exchange=` |
| Components | `src/components/company-analysis/*` | Search + report UI |

Back from a ticker report always goes to `/` (landing for anonymous, dashboard when logged in — middleware). No client-spoofable `?from=` param.

## 4. Data model

Durable Turso table `company_analysis_cache` (migration 121) keyed by `report:TICKER` / `narrative:TICKER:lang`, with `generated_at`, `expires_at` (1 day), and `last_gap_retry_at` for narrative AI gap fills. In-process L1 mirror in `src/lib/company-analysis/cache.ts`. Quota key `company_analysis` in `src/lib/platform-config.ts` (charged on full report build only). Live quote overlays on cache hits via `withLiveQuote` (not written into the day cache).

## 5. API surface

| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| GET | `/api/company-analysis?symbol=` | session | quota | Parallel fetch + assemble report |
| POST | `/api/company-analysis/narrative` | session | `ai_consult` | JSON narrative slices grounded in payload |

Ticker must match `^[A-Z0-9.\-]{1,10}$` (validated server-side).

## 6. UI surface

- Reuses trefolio `.card` / tokens; price chart is a TradingView `widgetembed` (weekly / 24M) with a public-chart fallback link (no custom TradingView brand palette on the rest of the page).
- Sections: header stats, chart, business, competitive, sector/risks, fundamentals tables, technicals, news, insiders, Congress, sector alternative (editorial banner), footer sources.
- Initial load uses a report-shaped skeleton; AI narrative sections pulse while `/narrative` is in flight (never flash empty copy as “unavailable”).
- Optional missing fields/rows/sections are **omitted** after load — never fabricated numbers. Company guidance row appears only when a citable value exists. Whole blocks with `status: unavailable` (or empty news) are hidden; loaded-empty insider/Congress lists keep their dedicated empty copy.

## 7. Business logic

- `Promise.allSettled`-style per source; one failure does not block others.
- Technical levels computed from real 1y history (`computeTechnicalLevels`).
- Next-quarter forecast: Yahoo `earningsTrend`/`calendarEvents` plus FMP `/earnings` unreported row (consensus revenue/EPS). Company guidance stays unavailable unless an explicit guidance source exists (API or cited web extract).
- Last reported EPS: Yahoo earnings history, with FMP `/earnings` fill when Yahoo lacks `reportedEPS`.
- Narratives (`POST /api/company-analysis/narrative`): optional Tavily web context for outlook/risks/competitive; numeric web fills require `sourceUrl`; durable 1-day cache with merge-only gap retries (AI gap retry at most once per 24h).
- Report + narrative serve from day cache when present; UI shows `generatedAt`. Cache hits overlay a live quote (price/change/marketCap) without rewriting durable storage. Unavailable sections (Congress/news/insiders/EPS/etc.) are refetched and merged without wiping good fields; full rebuild only on miss (expired after 1 day or never cached) or `?fresh=1` / UI **Regenerate** (clears Turso + L1 for that ticker, then rebuilds; charges quota).
- SEO: `/analisis` allow-listed in `robots.ts`; hub + cached tickers in `sitemap.ts`; SSR summary omits live price (quote is live via API).
- Insider tags: RSU/tax/options → neutral; open-market buy/sell → buy/sell.
- Congress: FMP `senate-trades` + `house-trades`; empty state when none in 12 months.
- Sector alternative: peer with better distance-to-52w-high than subject; editorial disclaimer required.
- Outbound URLs sanitized to `http:`/`https:` only.

## 8. External dependencies

- Yahoo / FMP market data (existing providers)
- TradingView widgetembed (browser iframe for the price chart)
- Tavily web search (optional; same key as AID) for narrative enrichment
- FMP Congress + stock-peers
- AI Gateway for narratives

## 9. Currency / FX / tax implications

- Display uses quote currency from provider; no FX conversion in v1 report.

## 10. i18n

- All UI strings under `companyAnalysis*` keys (+ landing card keys).

## 11. Permissions / tier gating / rate limits

- `requireFeatureQuota(..., "company_analysis")` on fresh builds
- Cached reads: anonymous allowed with `redactPaidSections` (Congress + insiders → `locked`); session gets the full cached report
- HTTP responses: `Cache-Control: private, no-store` + `Vary: Cookie` so a redacted anonymous body is never reused for a logged-in visitor
- FMP `requireRateLimit`
- Narratives: `ai_consult` + AI rate limits

## 12. Telemetry

- `withMetrics` on both routes; AI logs `source: company_analysis_narrative`

## 13. Edge cases & gotchas

- Never invent Congress activity.
- Label 12-month close high as such (not all-time ATH unless confirmed).
- Do not present consensus as company guidance.
- Launch checklist: product/legal review of “sector alternative” copy.
- Do not cache GET `/api/company-analysis` in the browser or CDN (`max-age` on the same URL mixed anonymous/authenticated bodies and showed a login wall to logged-in users). Client fetch uses `cache: "no-store"` and refetches once if the session is present but Congress/insiders are still `locked`.

## 14. Tests

- `src/lib/company-analysis/*.test.ts` — ticker, URLs, technicals, insider tags, congress empty, peer pick, empty-UI row/section visibility, paid-section redact, `no-store` response headers.

## 15. Related skills and rules

- [`.cursor/rules/legal-compliance.mdc`](../../.cursor/rules/legal-compliance.mdc)
- [`.cursor/rules/landing-page.mdc`](../../.cursor/rules/landing-page.mdc)
- [`engineer-integrations`](../../.cursor/skills/engineer-integrations/SKILL.md)
