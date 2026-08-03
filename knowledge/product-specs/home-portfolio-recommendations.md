# Home Portfolio Recommendations

> Persistent home tip card with skip/acted queue and diversify sector research.

## 1. Summary

Authenticated Home (`/`) shows one portfolio recommendation at a time (diversification, concentration, idle cash, FX). Users can mark **I took action** or **Next**. When the queue is empty the card hides; new fingerprints reappear when the portfolio changes. Diversify opens `/recommendations/diversify` with two underweight canonical sectors and 2–3 large-cap screener candidates each.

## 2. Status

- **Tier:** Free (all authenticated users with holdings)
- **Feature flag:** _none_ (uses home session; card hidden in `demoMode`)
- **Health:** green
- **Owning skill:** [`.cursor/skills/engineer-homepage/SKILL.md`](../../.cursor/skills/engineer-homepage/SKILL.md)
- **Mockup:** [`public/mockups/home-recommendations-v1.html`](../../public/mockups/home-recommendations-v1.html)

## 3. Entry points

| Type | Path | Notes |
|------|------|-------|
| Component | `src/components/homepage/HomeRecommendationCard.tsx` | After hero on `HomeV2Dashboard` |
| Page | `src/app/(app)/recommendations/diversify/page.tsx` | Sector research |
| API | `GET/POST /api/home-v2/recommendations` | Queue + skip/acted (prefers weekly cache) |
| API | `GET /api/home-v2/diversify-research` | Candidates (no screener quota) |
| Cron | `GET /api/cron/portfolio-recommendations` | Mondays 07:00 UTC — analyze users with ≥1 holding |
| Lib | `src/lib/homepage/build-portfolio-recommendations.ts` | Deterministic engine |
| Lib | `src/lib/homepage/resolve-recommendation-queue.ts` | Cache-or-live resolver |
| DAL | `src/lib/db/portfolio-recommendations.ts` | State + weekly cache |

## 4. Data model

- `portfolio_recommendation_state` — `(user_id, recommendation_key)` PK, `status` (`skipped` \| `acted`), `updated_at`
- `portfolio_recommendation_cache` — `(user_id, portfolio_id)` PK, `week_key`, `queue_json`, `computed_at`
- Fingerprint keys: `diversify:{A}+{B}`, `concentration:{TICKER}`, `cash_idle`, `fx:{CCY}`
- Types: `PortfolioRecommendation` in build module

## 5. API surface

| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| GET | `/api/home-v2/recommendations` | session | Free | Current + remaining queue |
| POST | `/api/home-v2/recommendations` | session | Free | `{ action: skipped\|acted, key }` or `{ action: refresh }` |
| GET | `/api/home-v2/diversify-research` | session | Free | 2 sectors × ≤3 candidates |
| GET | `/api/cron/portfolio-recommendations` | cron secret | — | Weekly precompute for active portfolios |

## 6. UI surface

- Home card: eyebrow, title, body, chips, CTAs (Investigate / Analyze / Took action / Next), short disclaimer
- Research page: two sector blocks, candidate rows → `/analisis/[ticker]`, Took action + Back home, full disclaimer
- Hidden when no holdings, demo mode, or empty queue

## 7. Business logic

**Cadence:** A Monday 07:00 UTC cron analyzes users with ≥1 open holding who were **active in the last 30 days** (`users.last_active_at`) and are **not test accounts** (`test+*@trefolio.com`, `@example.com`, `@test.example.com`). It writes `portfolio_recommendation_cache` for the ISO week and clears prior `skipped` states (`acted` is kept). Home prefers this week's cache; if missing, falls back to live compute. Users can also tap **Run analysis** on Home (`POST … action: refresh`, 60s cooldown) to force the same recompute for their active portfolio.

Queue order: diversify → concentration → cash_idle → fx.

| Kind | Trigger |
|------|---------|
| diversify | &lt;5 sectors OR HHI ≥ 0.22 OR top sector ≥ 35% |
| concentration | single holding ≥ 15% of portfolio |
| cash_idle | cash ≥ 20% of total |
| fx | ≥ 70% invested in quote currency ≠ preferred |

Underweight sectors: two lowest from canonical `ALL_SECTORS` (excl. Diversified). Candidates from `queryScreener` large/mega, excluding owned tickers.

## 8. External dependencies

- Screener cache (read-only, server-side)
- Quotes cache for weights
- No LLM

## 9. Currency / FX / tax implications

- Values EUR-base via holdings `valueInEUR` / quotes + FX when available
- FX tip compares quote currency mix vs `user_settings.default_currency`

## 10. i18n

- Keys `homeRec*` in `en.ts` / `es.ts` (EN fallback for other locales)

## 11. Permissions / tier gating / rate limits

- No screener feature quota on diversify-research
- `/analisis` links keep existing tier gates

## 12. Telemetry

| Event | Purpose |
|-------|---------|
| `home_rec_viewed` | Card shown |
| `home_rec_next` | Skip |
| `home_rec_acted` | Took action |
| `home_rec_diversify_opened` | Research CTA |
| `home_rec_candidate_clicked` | Candidate → analisis |

## 13. Testing

- Unit: `src/lib/homepage/build-portfolio-recommendations.test.ts`
- E2E: `e2e/home-v2.spec.ts` (demo hides card)

## 14. Rollout / migration

- Migration v124 creates `portfolio_recommendation_state`
- No flag; ships with release 2.5.74

## 15. Open questions / known gaps

- Screener sector labels may not perfectly match canonical portfolio sectors
- No landing-page marketing block in MVP
- Legal: deterministic tips + disclaimer; not AI-generated; no new third-party processors

## 16. Related docs

- [unified-homepage](unified-homepage.md)
- [rebalance-targets](rebalance-targets.md)
- [portfolio-review](portfolio-review.md)
