# Warren empty-portfolio add-stock mode

> When a portfolio has no holdings, Warren helps add stocks or import a portfolio — with a 10-chat burst and a 15-minute cooldown.

## 1. Summary

New users see Warren on the empty portfolio CTA (`EmptyPortfolio`) to add stocks by chat or import a portfolio (CSV, SnapTrade, AI). Off-topic / high-cost tools stay blocked until the first holding exists. Limited to 10 consults, then a 15-minute break. Applies to web drawer, Telegram, and Agent Office when holdings count is zero. Post-onboarding skip may open the left-panel first-stock treatment when `warren_first_stock` is running — see [warren-first-stock.md](warren-first-stock.md).

## 2. Status

- **Tier:** Free / Bifolio / Trefolio (same `ai_consult` quota; extra burst limiter on top)
- **Feature flag:** _none_
- **Health:** green
- **Owning skill:** [`.cursor/skills/engineer-dashboard/SKILL.md`](../../.cursor/skills/engineer-dashboard/SKILL.md)

## 3. Entry points

| Type | Path | Notes |
|------|------|-------|
| Component | `src/components/EmptyPortfolio.tsx` | Chat box + hint about add-stock-only + limit |
| Component | `src/components/warren/WarrenDrawer.tsx` | Empty greeting + add-stock chips when `holdings.length === 0` |
| API | `src/app/api/warren/chat/route.ts` | Detects empty portfolio, enforces burst, sets `emptyAddStockOnly` |
| Telegram | `src/lib/telegram/handler.ts` | Same mode + cooldown |
| Office | `src/lib/ai/office/office-general.ts` | Same mode + cooldown |
| Lib | `src/lib/ai/warren/empty-add-stock.ts` | Tool allowlist + system appendix |
| Lib | `src/lib/db/rate-limits.ts` | `checkAndIncrementBurstCooldown` |
| Lib | `src/lib/rate-limit.ts` | `checkWarrenEmptyAddRateLimit` |

## 4. Data model

- Reuses `rate_limits` (`user_id`, `provider`, `call_count`, `window_start`).
- Provider key: `warren_empty_add`.
- While counting: `call_count` = consults in burst, `window_start` = burst start ISO.
- After the 10th consult: `window_start` = cooldown-until ISO (`now + 15m`).
- After cooldown: counter resets to 1 on the next allowed call.

No new tables or migrations.

## 5. API surface

| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| POST | `/api/warren/chat` | session + `ai_consult` | Free+ | When `countHoldings === 0` (and not demo): apply empty-add burst; on deny return **429** `{ reason: "warren_empty_add_cooldown", retryAfter, resetAt }` and **refund** `ai_consult`. Passes `emptyAddStockOnly: true` into `runWarrenTurn`. |

## 6. UI surface

- `EmptyPortfolio`: title, hint (add or import / 10 then 15 min), placeholder example.
- `WarrenDrawer`: empty greeting, add-stock + import chips, “Add-stock mode” context line.
- Persistent Warren disclaimer footer unchanged.

## 7. Business logic

- **Empty detection:** server `countHoldings(userId, portfolioId) === 0` (web); snapshot `holdingsCount` / `countHoldings` (Telegram/Office). Demo skips empty-add burst.
- **Tools allowlist:** `getQuote`, `listPortfolios`, `proposeAddHolding`, `renderStockSnapshot`, plus import tools (`presentImportOptions`, `parseBrokerCsvImport`, `extractAiPortfolioImport`, `startSnapTradeConnect`, `fetchSnapTradeImport`). Sister tools (Clara/Will) disabled.
- **Burst:** 10 consults → 15-minute cooldown → new burst of 10. Admins bypass.
- **Constants:** `PLATFORM_LIMITS.WARREN_EMPTY_ADD_MAX_CONSULTS` / `WARREN_EMPTY_ADD_COOLDOWN_MS`.

## 8. External dependencies

- Same AI Gateway / OpenAI path as normal Warren.
- No new env vars.

## 9. Currency / FX / tax implications

- None beyond existing `proposeAddHolding` currency field.

## 10. i18n

- EN + ES keys: `emptyStateWarrenChatHint`, `warrenGreetingEmptyAdd`, `warrenConnectedEmptyAdd`, `warrenChipAddExample1..3`, `warrenChipImportPortfolio`.

## 11. Permissions / tier gating / rate limits

- Still consumes monthly `ai_consult` when allowed.
- Extra provider `warren_empty_add` burst+cooldown (not a paywall).
- On cooldown, refund `ai_consult` so the monthly quota is not burned by blocked turns.

## 12. Telemetry

- No new analytics events in v1 (429 reason `warren_empty_add_cooldown` is enough for logs).

## 13. Edge cases & gotchas

- Cash-only portfolios still count as empty (`holdings.length === 0`).
- After the first confirmed holding, next Warren turn uses full tools (no empty-add limiter).
- Multipart attachments are used for CSV / screenshot import in empty-add mode.
- Admins bypass the burst limiter.

## 14. Tests

- Unit: `src/lib/ai/warren/empty-add-stock.test.ts`, `src/lib/db/rate-limits-burst.test.ts`
- API: `src/app/api/warren/chat/route.test.ts` (empty mode + 429)
- Office: `src/lib/ai/office/office-general.test.ts` (cooldown)
- E2E: `e2e/home-v2-empty-warren.spec.ts` — empty home shows Warren add-stock hint

## 15. Related skills and rules

- Skills: engineer-dashboard, legal-advisor (AI scope change; existing disclaimer)
- Specs: [unified-homepage](unified-homepage.md), [warren-telegram-bot](warren-telegram-bot.md), [warren-import](warren-import.md)

## 16. Open questions / planned work

- Optional: surface remaining consults in the UI before cooldown.
- Optional: disable file attachments entirely in empty-add mode.
