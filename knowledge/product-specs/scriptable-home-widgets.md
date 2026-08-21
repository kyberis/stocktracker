# Scriptable home screen widgets

> iOS home-screen widgets via Scriptable: portfolio summary and top-movers variants.

## 1. Summary

Authenticated users copy a ready-made Scriptable script from `/widget/setup`, paste it into the free Scriptable iOS app, and pin a live portfolio widget. Two script versions ship: portfolio summary (value + day change) and top movers (two gainers + one loser by day %).

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
| API | [`src/app/api/portfolio/summary/route.ts`](../../src/app/api/portfolio/summary/route.ts) | Bearer widget token; `?full=true` for prices |
| API | [`src/app/api/widget-token/route.ts`](../../src/app/api/widget-token/route.ts) | Issue / revoke widget token |
| Profile | [`src/components/ProfilePage.tsx`](../../src/components/ProfilePage.tsx) | **Widget & devices** tab (always visible) → primary “Set up widget” CTA |

## 4. Data model

- `users.widget_token_hash` — hashed bearer token for Scriptable / Widget View.
- `users.device_portfolio_id` — portfolio scope for widget token requests (Profile → Device & Widget).
- Summary `topHoldings[]`: `ticker`, `name`, `weight`, `dayChange`; with `full=true` also `shares`, `price`, `currency`.

## 5. API surface

| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| GET | `/api/portfolio/summary` | session / widget token / device passkey | Free | Portfolio totals + top holdings |
| GET | `/api/portfolio/summary?full=true` | same | Free | Up to 30 holdings including price (movers script) |
| GET/POST/DELETE | `/api/widget-token` | session | Free | Token status / issue / revoke |

## 6. UI surface

- Setup page: platform tabs (iOS / Android), token controls, **script version** radiogroup (Portfolio summary | Top movers), copy-ready preview.
- **One token for all scripts:** after generate (or URL `?token=`), plaintext is kept in `localStorage` (`trefolio.widgetToken`) so switching variants or returning later still injects the token. If the server has a hash but local storage is empty, setup offers a paste field to reuse the existing `tfw_…` token instead of regenerating.
- Scripts are loaded from `/widget/*.js` so the public files remain the single source of truth.
- Movers Scriptable script reads `config.widgetFamily` and adapts: **Small** (compact, no company name, tiny spark), **Medium** (3 rows + names), **Large** (5 rows, bigger type).

## 7. Business logic

- Mover selection: [`src/lib/widget/pick-top-movers.ts`](../../src/lib/widget/pick-top-movers.ts) — prefer 2 gainers + 1 loser by day %, fill from absolute movers if a side is empty, then sort by `|dayChange|` desc. Large widgets use 3+2 / 5 rows.
- Client token helpers: [`src/lib/widget/widget-token-client.ts`](../../src/lib/widget/widget-token-client.ts).
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

- Fewer than three holdings / all flat / only gainers or only losers → fill from absolute movers or show fewer rows.
- Missing `price` without `full=true` → movers script requires `?full=true`.
- Yahoo sparkline failures → synthetic sparkline; widget still shows price + %.
- Small / Medium / Large are all supported; Small hides company names and uses a compact sparkline.
- Regenerating the token invalidates every Scriptable widget that still embeds the old value — prefer paste/reuse when adding a second script.

## 14. Tests

- Unit: [`src/lib/widget/pick-top-movers.test.ts`](../../src/lib/widget/pick-top-movers.test.ts), [`src/lib/widget/widget-token-client.test.ts`](../../src/lib/widget/widget-token-client.test.ts)
- E2E: [`e2e/widget-setup.spec.ts`](../../e2e/widget-setup.spec.ts)
- Manual: copy movers script into Scriptable, pin Medium widget, confirm two green + one red when the book has both sides. Switch to Portfolio script without regenerating the token.

## 15. Related skills and rules

- Skills: engineer-mobile, legal-advisor (financial disclaimer on setup page)
- Rules: `.cursor/rules/legal-compliance.mdc`, `.cursor/rules/release-notes.mdc`
- Related: [pwa](pwa.md), [trefolio-leaf-device](trefolio-leaf-device.md)

## 16. Open questions / planned work

- i18n the setup page through `src/locales/`.
- Optional analytics event when a script variant is copied.
- Server-side sparkline points on summary to avoid Yahoo from Scriptable.
