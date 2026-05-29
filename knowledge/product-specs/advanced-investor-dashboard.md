# Investor Briefing (AID — internal codename)

> Beta briefing at `/aid`: portfolio pulse, FinPulse, scannable AI news, and Warren / Will / Clara — one screen for “what changed” and “how am I doing?”

## 1. Summary

**Investor Briefing** (internal codename **AID**, flag `aid_beta`) is a feature-flagged alternative landing experience. User-facing title: **Investor Briefing** / **Briefing de inversor**. Entry: **Beta** CTA on the classic home with unread badge from `/api/aid/status`. Route stays `/aid`. Mockups: `public/mockups/control-panel-cockpit*.html`, `aid-addictiveness-proposal.html`.

## 2. Status

- **Tier:** Authenticated (beta via feature flag; tier TBD after beta)
- **Feature flag:** `aid_beta`
- **Health:** yellow (beta shipped; flag-gated at `/aid`)
- **Owning skill:** [`engineer-dashboard`](../../.cursor/skills/engineer-dashboard/SKILL.md)
- **Exec plan:** [`../exec-plans/active/advanced-investor-dashboard.md`](../exec-plans/active/advanced-investor-dashboard.md)
- **Rollout:** [`../runbooks/aid-beta-rollout.md`](../runbooks/aid-beta-rollout.md)

## 3. Entry points

| Type | Path | Notes |
|------|------|-------|
| Page | `src/app/(app)/aid/page.tsx` | Client shell → `AidDashboard` |
| CTA | Home dashboard (`/`) | `AidBetaCta` when `aid_beta` |
| API | `src/app/api/aid/*` | digest, status, feed, finpulse, refresh, insights |
| Cron | `/api/cron/aid-digest` (6h), `/api/cron/aid-finpulse` (30m) | Pre-warm caches |
| Admin | Settings → FinPulse handles | `GET/PUT /api/admin/finpulse-handles` |
| Components | `src/components/aid/*` | Briefing, priority strip, FinPulse, digest, etc. |

## 4. Data model

- `aid_news_cache` — per-user ticker digest summaries (v116)
- `aid_social_posts` — FinPulse raw posts + AI summaries (v117)
- `user_settings.last_aid_visit_at`, `aid_warren_nudge_date` (v117)
- `user_settings.aid_layout_order` — JSON `{ main, sidebar }` section order (v118)
- Platform setting `aid_finpulse_handles` — curated X accounts (JSON)
- Reuse: holdings, quotes, alerts, calendar events, rebalance targets

## 5. API surface

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/aid/digest` | user + `aid_beta` | 48h news rows (sorted by impact score) |
| GET | `/api/aid/status` | user + `aid_beta` | Since-last-visit counts, briefing, Warren nudge |
| POST | `/api/aid/status` | user + `aid_beta` | Mark visit (`last_aid_visit_at`) |
| GET | `/api/aid/feed` | user + `aid_beta` | Top-5 priority items merged across sources |
| GET | `/api/aid/finpulse` | user + `aid_beta` | FinPulse (`tab=foryou\|market_voices`) |
| GET | `/api/aid/earnings-recap` | user + `aid_beta` | Recent earnings AI summaries |
| POST | `/api/aid/refresh` | user + `aid_beta` | Force web refresh for one ticker |
| GET | `/api/aid/insights` | user + `aid_beta` | Clara + Will cards |
| GET/PUT | `/api/aid/layout` | user + `aid_beta` | Read/save main + sidebar section order |
| GET/PUT | `/api/admin/finpulse-handles` | admin | Curated FinPulse X handles |

## 6. UI surface (with holdings)

**Main column order:**

1. Briefing strip (`AidBriefingStrip`) — session dot, new counts, AI brief, catch-up CTA
2. Priority strip (`AidPriorityStrip`) — top 5 cross-source items by impact 1–5
3. FinPulse (`AidFinPulse`) — For you / Market voices
4. News digest (`AidNewsDigest`) — All / Earnings / Movement
5. Earnings recap (`AidEarningsRecap`)
6. Portfolio pulse + allocation/dividend modals
7. Extras row (alerts prioritized)
8. Holdings lookup + shortcuts

**Empty:** welcome CTAs + FinPulse Market voices only (no For you tab).

**Sidebar:** Warren (proactive nudge 1/day), Will, Clara.

**Layout customization:** “Customize layout” toggles drag handles on main column and sidebar independently. Order persists in `user_settings.aid_layout_order` via `GET/PUT /api/aid/layout`. Default order matches the list above; new sections append automatically on upgrade.

## 7. Impact score (1–5)

- Computed in `src/lib/aid/impact-score.ts` from AI `impact` (high/medium/low) + portfolio signals (move %, earnings tag, FinPulse relevance).
- Shown via `AidImpactBadge`; feeds sorted descending by score.
- Merged priority list: `mergePriorityFeed()` → `/api/aid/feed`.

## 8. External dependencies

- Tavily — earnings web search + FinPulse X discovery
- OpenAI / AI Gateway — summaries (digest, FinPulse, briefing)
- Clara / Will office APIs — insights card
- Market data — quotes for movers and impact

## 9. Telemetry

| Event | Purpose |
|-------|---------|
| `aid_page_viewed` | Page load (`state`: empty \| holdings) |
| `aid_return_within_24h` | Repeat visit within 24h (`hours`) |
| `aid_section_viewed` | First scroll into section (`section`, `order`) |
| `aid_feed_loaded` | Priority strip loaded (`count`, `topScore`) |
| `aid_priority_item_clicked` | User jumps to section from priority strip |
| `aid_briefing_shown`, `aid_caught_up_dismissed` | Briefing engagement |
| `aid_finpulse_tab`, `aid_finpulse_post_clicked` | FinPulse |
| `aid_warren_nudge_clicked` | Proactive Warren |
| `aid_layout_reordered` | User reordered main or sidebar (`column`, `count`) |

### Success thresholds (beta targets)

| Metric | Target | Notes |
|--------|--------|-------|
| DAU/WAU on `/aid` | ≥ 25% of `aid_beta` WAU | North star habit |
| Median visits / week | ≥ 3 among active AID users | Check-in ritual |
| `aid_return_within_24h` rate | ≥ 30% of visits | Return hook working |
| `aid_section_viewed` finpulse before news | ≥ 40% of sessions with both | Layout hypothesis |
| Priority strip CTR | ≥ 15% click `aid_priority_item_clicked` / `aid_feed_loaded` | Impact strip utility |

## 10. Related docs

- Compliance: `knowledge/compliance/aid-beta-compliance.md`
- E2E: `e2e/aid-dashboard.spec.ts`
- Mockups: `public/mockups/aid-addictiveness-proposal.html`
