# market-insights

> Pro market-insights feed combining news, indicators, and AI commentary.

## 1. Summary

Single page that aggregates macro indicators, newsworthy moves, and AI-generated commentary on the user's portfolio in the context of the market.

## 2. Status

- **Tier:** Trefolio
- **Feature flag:** _none_
- **Health:** green
- **Owning skill:** [`engineer-integrations`](../../.cursor/skills/engineer-integrations/SKILL.md)

## 3. Entry points

| Type | Path | Notes |
|------|------|-------|
| Page | [`src/app/(app)/market-insights/`](../../src/app/(app)/market-insights) | Page. |
| API | [`src/app/api/market-insights/`](../../src/app/api/market-insights) | Aggregation endpoint. |
| API | [`src/app/api/portfolio-news/`](../../src/app/api/portfolio-news) | News filtered to user's holdings. |

## 4. Data model

- `market_digests` (+ `market_digest_sources`, `market_digest_translations`).

## 5. API surface

| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| GET | `/api/market-insights` | user | Pro | Returns the composed feed. |
| GET | `/api/portfolio-news` | user | Pro | News items per holding. |

## 6. UI surface

- Composable cards (news, indicator, AI summary).

## 7. Business logic

- News via Finnhub and FMP.
- AI summary uses `ai-stream` with a constrained prompt.

## 8. External dependencies

- Finnhub, FMP, OpenAI.

## 9. Currency / FX / tax implications

- Values in native currency.

## 10. i18n

All locales via `market_digest_translations`.

## 11. Permissions / tier gating / rate limits

- `requireSubscriptionFeature('intelligence')`.

## 12. Telemetry

- `analytics_events`: `market_insights.viewed`.

## 13. Edge cases & gotchas

- News deduped by URL hash.
- Translations cached to avoid re-spend.

## 14. Tests

- Integration tests on digest ingestion.

## 15. Related skills and rules

- [`engineer-integrations`](../../.cursor/skills/engineer-integrations/SKILL.md)
- Related specs: [daily-market-digest](daily-market-digest.md), [ai-stream](ai-stream.md).

## 16. Open questions / planned work

- Push notifications for top-of-feed items.
