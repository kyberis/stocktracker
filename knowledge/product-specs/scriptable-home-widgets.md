# Scriptable home screen widgets

> iOS home-screen widgets via Scriptable: portfolio summary, top-movers, and by-asset-type variants.

## 1. Summary

Authenticated users copy a ready-made Scriptable script from `/widget/setup`, paste it into the free Scriptable iOS app, and pin a live portfolio widget. Three script versions ship: portfolio summary (value + day change), top movers (two gainers + one loser by day %), and by asset type (value + day change per Stocks / ETFs / Crypto / Funds / Fixed return sleeve).

## 2. Status

- **Tier:** Free
- **Feature flag:** _none_
- **Health:** green
- **Owning skill:** [`.cursor/skills/engineer-mobile/SKILL.md`](../../.cursor/skills/engineer-mobile/SKILL.md)

## 3. Entry points

| Type | Path | Notes |
|------|------|-------|
| Page | [`src/app/(app)/widget/setup/page.tsx`](../../src/app/(app)/widget/setup/page.tsx) | Token + script copy UI |
| Page | [`src/app/(app)/widget/page.tsx`](../../src/app/(app)/widget/page.tsx) | In-browser compact widget view |
| Nav | [`src/lib/app-nav.ts`](../../src/lib/app-nav.ts) | Desktop overflow + mobile More → `/widget/setup` |
| Nav | Dashboard More menu + menu search | Always lists “Home screen widget” |
| Static | [`public/widget/trefolio-scriptable.js`](../../public/widget/trefolio-scriptable.js) | Portfolio summary Scriptable script |
| Static | [`public/widget/trefolio-scriptable-movers.js`](../../public/widget/trefolio-scriptable-movers.js) | Top movers Scriptable script |
| Static | [`public/widget/trefolio-scriptable-by-type.js`](../../public/widget/trefolio-scriptable-by-type.js) | By asset type Scriptable script |
| API | [`src/app/api/portfolio/summary/route.ts`](../../src/app/api/portfolio/summary/route.ts) | Bearer widget token; `?full=true` for prices |
| API | [`src/app/api/widget-token/route.ts`](../../src/app/api/widget-token/route.ts) | Issue / revoke widget token |
| Profile | [`src/components/ProfilePage.tsx`](../../src/components/ProfilePage.tsx) | **Widget & devices** tab (always visible) → primary “Set up widget” CTA |

## 4. Data model

- `widget_tokens` — multiple hashed bearer tokens per user (AES-256-GCM encrypted plaintext for script copy); legacy `users.widget_token_hash` kept in sync with the newest active token.
- `users.device_portfolio_id` — portfolio scope for widget token requests (Profile → Device & Widget).
- Summary `topHoldings[]`: `ticker`, `name`, `weight`, `dayChange`; with `full=true` also `shares`, `price`, `currency`.
- Summary `byAssetType[]`: `key` (`stock`|`etf`|`fund`|`crypto`|`fixed_return`), `value`, `allocationPercent`, `dayChange`, `dayChangePercent`, `totalGainLoss`, `totalGainLossPercent`. Built via [`src/lib/widget/build-by-asset-type.ts`](../../src/lib/widget/build-by-asset-type.ts) using the same totals + day-change pipeline as the dashboard.

## 5. API surface

| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| GET | `/api/portfolio/summary` | session / widget token / device passkey | Free | Portfolio totals + top holdings + `byAssetType[]` |
| GET | `/api/portfolio/summary?full=true` | same | Free | Up to 30 holdings including price (movers script) |
| GET/POST/DELETE | `/api/widget-token` | session | Free | List active tokens + latest copyable token / issue new / revoke one or all |

## 6. UI surface

- Setup page: platform tabs (iOS / Android), **token list** with per-token revoke, **latest valid token auto-embedded** on script copy, **script version** radiogroup (Portfolio summary | Top movers | By asset type), copy-ready preview.
- Scripts are loaded from `/widget/*.js` so the public files remain the single source of truth.
- By asset type script reads `config.widgetFamily` and adapts: **Small** (total + top 2 types), **Medium** (total + up to 4 types), **Large** (total + up to 5 types with allocation % and day €).
- Movers Scriptable script reads `config.widgetFamily` and adapts: **Small** (compact, no company name, tiny spark), **Medium** (3 rows + names), **Large** (7 rows: prefer 4 gainers + 3 losers).

## 7. Business logic

- Mover selection: [`src/lib/widget/pick-top-movers.ts`](../../src/lib/widget/pick-top-movers.ts) — prefer N gainers + M losers by day % (Medium/Small default 2+1; Large 4+3). If one side is short, fill remaining slots from the other side / absolute movers, then sort by `|dayChange|` desc.
- By asset type rows: [`src/lib/widget/build-by-asset-type.ts`](../../src/lib/widget/build-by-asset-type.ts) + [`computeDayChangeByType`](../../src/lib/day-change-pct.ts) — same math as dashboard breakdown pills / performance table.
- The movers Scriptable script inlines the same algorithm (Scriptable cannot import app modules).
- Sparklines: Scriptable fetches Yahoo 5m/1d chart closes on-device; falls back to a synthetic path from `dayChange` when Yahoo is unavailable.
- Layout avoids fixed column widths that clipped on Small; uses natural widths + a trailing spacer.

## 8. External dependencies

- Scriptable (iOS App Store) — runs the script on-device.
- Yahoo chart endpoint (called from the user's phone for sparklines only; ticker symbols only).
- Env: none beyond existing market-data / auth stack.

## 9. Currency / FX / tax implications

- Amounts use portfolio display currency from summary (`currency`; legacy `totalValueEUR` key).
- Movers script formats prices with a European-friendly locale for EUR/DKK/GBP.
- Informational only — not tax or investment advice.

## 10. i18n

- Setup page copy is currently English (hardcoded, same as prior widget setup). Spanish release-note entry covers the feature announcement.

## 11. Permissions / tier gating / rate limits

- Available on Free. Device auth rate limit applies to bearer widget-token calls (`checkDeviceAuthRateLimit`).

## 12. Telemetry

- No dedicated analytics event yet for script-variant copy (follow-up).

## 13. Edge cases & gotchas

- Fewer than wanted holdings / all flat / only gainers or only losers → fill from the other side or show fewer rows.
- Missing `price` without `full=true` → movers script requires `?full=true`.
- Yahoo sparkline failures → synthetic sparkline; widget still shows price + %.
- Small / Medium / Large are all supported; Small hides company names and uses a compact sparkline.
- Large prefers 4 positives + 3 negatives; if fewer than 3 negatives exist, extra positives fill (and vice versa).

## 14. Tests

- Unit: [`src/lib/widget/pick-top-movers.test.ts`](../../src/lib/widget/pick-top-movers.test.ts), [`src/lib/widget/build-by-asset-type.test.ts`](../../src/lib/widget/build-by-asset-type.test.ts)
- E2E: [`e2e/widget-setup.spec.ts`](../../e2e/widget-setup.spec.ts)
- Manual: copy movers script into Scriptable, pin Medium widget, confirm two green + one red when the book has both sides.

## 15. Related skills and rules

- Skills: engineer-mobile, legal-advisor (financial disclaimer on setup page)
- Rules: `.cursor/rules/legal-compliance.mdc`, `.cursor/rules/release-notes.mdc`
- Related: [pwa](pwa.md), [trefolio-leaf-device](trefolio-leaf-device.md)

## 16. Open questions / planned work

- i18n the setup page through `src/locales/`.
- Optional analytics event when a script variant is copied.
- Server-side sparkline points on summary to avoid Yahoo from Scriptable.
