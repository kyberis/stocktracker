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
| Page | `src/app/(app)/analisis/page.tsx` | Search landing |
| Page | `src/app/(app)/analisis/[ticker]/page.tsx` | Report |
| API | `GET /api/company-analysis` | Aggregated report |
| API | `POST /api/company-analysis/narrative` | Grounded JSON narratives |
| Nav | `src/lib/app-nav.ts` | Primary overflow + Pro badge |
| Components | `src/components/company-analysis/*` | Search + report UI |

## 4. Data model

No new tables. In-memory TTL cache in `src/lib/company-analysis/cache.ts`. Quota key `company_analysis` in `src/lib/platform-config.ts`.

## 5. API surface

| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| GET | `/api/company-analysis?symbol=` | session | quota | Parallel fetch + assemble report |
| POST | `/api/company-analysis/narrative` | session | `ai_consult` | JSON narrative slices grounded in payload |

Ticker must match `^[A-Z0-9.\-]{1,10}$` (validated server-side).

## 6. UI surface

- Reuses trefolio `.card` / tokens; price chart is a TradingView `widgetembed` (weekly / 24M) with a public-chart fallback link (no custom TradingView brand palette on the rest of the page).
- Sections: header stats, chart, business, competitive, sector/risks, fundamentals tables, technicals, news, insiders, Congress, sector alternative (editorial banner), footer sources.
- Missing fields show **Data unavailable** — never fabricated numbers.

## 7. Business logic

- `Promise.allSettled`-style per source; one failure does not block others.
- Technical levels computed from real 1y history (`computeTechnicalLevels`).
- Next-quarter forecast: Yahoo `earningsTrend`/`calendarEvents` plus FMP `/earnings` unreported row (consensus revenue/EPS). Company guidance stays unavailable unless an explicit guidance source exists.
- Insider tags: RSU/tax/options → neutral; open-market buy/sell → buy/sell.
- Congress: FMP `senate-trades` + `house-trades`; empty state when none in 12 months.
- Sector alternative: peer with better distance-to-52w-high than subject; editorial disclaimer required.
- Outbound URLs sanitized to `http:`/`https:` only.

## 8. External dependencies

- Yahoo / FMP market data (existing providers)
- TradingView widgetembed (browser iframe for the price chart)
- FMP Congress + stock-peers
- AI Gateway for narratives

## 9. Currency / FX / tax implications

- Display uses quote currency from provider; no FX conversion in v1 report.

## 10. i18n

- All UI strings under `companyAnalysis*` keys (+ landing card keys).

## 11. Permissions / tier gating / rate limits

- `requireFeatureQuota(..., "company_analysis")` on fresh builds
- Cached reads: session only
- FMP `requireRateLimit`
- Narratives: `ai_consult` + AI rate limits

## 12. Telemetry

- `withMetrics` on both routes; AI logs `source: company_analysis_narrative`

## 13. Edge cases & gotchas

- Never invent Congress activity.
- Label 12-month close high as such (not all-time ATH unless confirmed).
- Do not present consensus as company guidance.
- Launch checklist: product/legal review of “sector alternative” copy.

## 14. Tests

- `src/lib/company-analysis/*.test.ts` — ticker, URLs, technicals, insider tags, congress empty, peer pick.

## 15. Related skills and rules

- [`.cursor/rules/legal-compliance.mdc`](../../.cursor/rules/legal-compliance.mdc)
- [`.cursor/rules/landing-page.mdc`](../../.cursor/rules/landing-page.mdc)
- [`engineer-integrations`](../../.cursor/skills/engineer-integrations/SKILL.md)
