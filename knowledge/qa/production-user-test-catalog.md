# Production user test catalog (non-admin)

Agent-executable use cases for **https://trefolio.com**. Admin, staff ops, impersonation, and internal crons are out of scope.

See [`README.md`](README.md) for how to run and report.

---

## Execution preface

### Environment

| Item | Value |
| --- | --- |
| App | `https://trefolio.com` |
| IdP (OneLogin) | `https://user.trefolio.com` |
| Credentials | Injected by human: `{{TEST_EMAIL}}`, `{{TEST_PASSWORD}}` — never commit |

### Login (IdP)

1. Open `https://trefolio.com/login`.
2. Expect redirect or bridge to OneLogin at `user.trefolio.com` (no local password form when IdP is enabled).
3. Sign in with `{{TEST_EMAIL}}` / `{{TEST_PASSWORD}}`.
4. Land on an authenticated surface (`/`, `/portfolio`, `/onboarding`, or similar) — URL must not stay on `/login`.
5. Run **Shared setup: dismiss overlays** once.

### Shared setup: dismiss overlays

After login (and again if they reappear):

1. Cookie banner → click **Accept** if visible.
2. What's New modal → click **Got it** if visible.
3. Theme tour dialog → **Skip tour** / **Saltar**, or press Escape.
4. Wait until the main content is clickable (no full-screen overlay).

### Production safety (mandatory)

- Do **not** delete the test account.
- Do **not** cancel or change a real paid subscription (billing UCs are UI-only).
- Do **not** complete SnapTrade / broker OAuth unless the human provides broker credentials and asks to.
- Prefer **reversible** mutations: add then remove the same test holding/alert/watchlist item.
- For AI UCs: smoke the UI; avoid long multi-turn streams unless needed to prove Pass. Prefer opening a panel / starting then cancelling over burning daily quota.
- Do **not** visit `/admin` or use staff tools.
- Do not post spam on the social network; use draft/cancel or minimal ephemeral content only when required.

### Risk tags

| Tag | Meaning |
| --- | --- |
| `safe` | Read-only / navigation smoke |
| `reversible` | Create then delete test data |
| `external-oauth` | Third-party connect UI only unless instructed |
| `billing-ui-only` | Open Stripe/checkout UI; never complete payment |
| `tier-gated` | May Skip on Free with paywall (document as Skip if expected) |

### Pass / Fail / Skip

- **Pass** — all listed expects met; no unexpected error toast/page crash.
- **Fail** — expect not met, blank page, 5xx, auth loop, or data corruption.
- **Skip** — feature flag off, wrong tier, missing portfolio data, or human-restricted risk. Record reason.

### Evidence

Per UC: one screenshot of the asserted UI **or** a short note of the key visible string/URL. Attach in the QA Report under Failures (and optionally Passes).

---

## Index

### A. Public / marketing
- [UC-PUB-01](#uc-pub-01--landing-hero) — Landing hero
- [UC-PUB-02](#uc-pub-02--landing-pricing) — Landing pricing
- [UC-PUB-03](#uc-pub-03--interactive-demo) — Interactive demo
- [UC-PUB-04](#uc-pub-04--studio-hub) — Studio hub
- [UC-PUB-05](#uc-pub-05--blog-index) — Blog index
- [UC-PUB-06](#uc-pub-06--legal-privacy--terms) — Legal privacy & terms
- [UC-PUB-07](#uc-pub-07--leaf-waitlist) — Leaf waitlist
- [UC-PUB-08](#uc-pub-08--cookie-consent) — Cookie consent

### B. Auth & profile
- [UC-AUTH-01](#uc-auth-01--idp-login) — IdP login
- [UC-AUTH-02](#uc-auth-02--logout) — Logout
- [UC-AUTH-03](#uc-auth-03--profile-hub) — Profile hub
- [UC-AUTH-04](#uc-auth-04--locale--display-currency) — Locale & display currency
- [UC-AUTH-05](#uc-auth-05--whats-new--release-notes) — What's New / release notes
- [UC-AUTH-06](#uc-auth-06--onboarding-gate) — Onboarding gate

### C. Home & portfolio core
- [UC-PORT-01](#uc-port-01--home-daily) — Home daily
- [UC-PORT-02](#uc-port-02--portfolio-value--chart) — Portfolio value & chart
- [UC-PORT-03](#uc-port-03--holdings-list) — Holdings list
- [UC-PORT-04](#uc-port-04--addremove-stock-holding-reversible) — Add/remove stock holding
- [UC-PORT-05](#uc-port-05--cash-entry-smoke) — Cash entry smoke
- [UC-PORT-06](#uc-port-06--portfolio-switcher) — Portfolio switcher
- [UC-PORT-07](#uc-port-07--explore-asset-search) — Explore asset search
- [UC-PORT-08](#uc-port-08--classic-dashboard) — Classic dashboard

### D. Import
- [UC-IMP-01](#uc-imp-01--import-hub) — Import hub
- [UC-IMP-02](#uc-imp-02--broker-csv-path-ui) — Broker CSV path UI
- [UC-IMP-03](#uc-imp-03--import-data-quality-surface) — Import data-quality surface
- [UC-IMP-04](#uc-imp-04--snaptrade-connect-ui) — SnapTrade connect UI

### E. Dashboard / metrics / charts
- [UC-DASH-01](#uc-dash-01--performance-matrix) — Performance matrix
- [UC-DASH-02](#uc-dash-02--chart-range-selector) — Chart range selector
- [UC-DASH-03](#uc-dash-03--tools-performance--projection) — Tools performance & projection
- [UC-DASH-04](#uc-dash-04--economic-indicators) — Economic indicators
- [UC-DASH-05](#uc-dash-05--market-ticker-bar) — Market ticker bar

### F. Tools
- [UC-TOOL-01](#uc-tool-01--tools-hub) — Tools hub
- [UC-TOOL-02](#uc-tool-02--taxonomy--diversification) — Taxonomy / diversification
- [UC-TOOL-03](#uc-tool-03--dividends) — Dividends
- [UC-TOOL-04](#uc-tool-04--events-calendar) — Events calendar
- [UC-TOOL-05](#uc-tool-05--rebalancing) — Rebalancing
- [UC-TOOL-06](#uc-tool-06--watchlist-reversible) — Watchlist
- [UC-TOOL-07](#uc-tool-07--stock-screener) — Stock screener
- [UC-TOOL-08](#uc-tool-08--warren-screener) — Warren screener

### G. AI
- [UC-AI-01](#uc-ai-01--company-analysis-hub) — Company analysis hub
- [UC-AI-02](#uc-ai-02--company-analysis-ticker) — Company analysis ticker
- [UC-AI-03](#uc-ai-03--holding-or-portfolio-ai-panel) — Holding / portfolio AI panel
- [UC-AI-04](#uc-ai-04--agent-office) — Agent office
- [UC-AI-05](#uc-ai-05--mcp--docs-public) — MCP / docs public

### H. Alerts & notifications
- [UC-ALERT-01](#uc-alert-01--price-alert-reversible) — Price alert
- [UC-ALERT-02](#uc-alert-02--in-app-notifications-bell) — In-app notifications bell
- [UC-ALERT-03](#uc-alert-03--goals-ui) — Goals UI

### I. Crypto
- [UC-CRYPTO-01](#uc-crypto-01--crypto-market-page) — Crypto market page
- [UC-CRYPTO-02](#uc-crypto-02--add-crypto-modal-smoke) — Add crypto modal smoke

### J. Social
- [UC-SOC-01](#uc-soc-01--network-feed) — Network feed
- [UC-SOC-02](#uc-soc-02--people-search) — People search
- [UC-SOC-03](#uc-soc-03--public-profile) — Public profile
- [UC-SOC-04](#uc-soc-04--connections) — Connections
- [UC-SOC-05](#uc-soc-05--chats-list-smoke) — Chats list smoke

### K. Billing (UI only)
- [UC-BILL-01](#uc-bill-01--profile-subscription) — Profile subscription
- [UC-BILL-02](#uc-bill-02--pro-paywall-surface) — Pro paywall surface
- [UC-BILL-03](#uc-bill-03--manage-subscription--checkout-link) — Manage subscription / checkout link

### L. Cross-cutting
- [UC-X-01](#uc-x-01--theme-switch) — Theme switch
- [UC-X-02](#uc-x-02--locale-enes) — Locale EN/ES
- [UC-X-03](#uc-x-03--global-search-cmd-k) — Global search cmd-K
- [UC-X-04](#uc-x-04--mobile-home--portfolio-smoke) — Mobile home & portfolio smoke

**Total: 61 use cases.**

---

## A. Public / marketing

### UC-PUB-01 — Landing hero
- **Dominio / rutas:** Marketing · `/landing`
- **Tier / flags:** Public
- **Riesgo:** `safe`
- **Precondiciones:** None (logged out or logged in OK)
- **Setup overlays:** Dismiss cookie banner if it blocks CTA
- **Pasos:**
  1. Open `https://trefolio.com/landing`.
  2. Wait for first viewport to paint.
  3. Confirm brand “trefolio” (or logo) is visible as a primary hero signal.
  4. Confirm one primary CTA (e.g. Sign up / Try demo / Get started) is visible.
- **Esperado:** Page loads without blank error; hero has brand + headline + CTA; no `/admin` chrome.
- **Evidencia:** Screenshot of first viewport.
- **Pass / Fail / Skip:** Pass if brand + CTA visible. Fail on 5xx/blank. Skip never.

### UC-PUB-02 — Landing pricing
- **Dominio / rutas:** Marketing · `/landing#pricing` or pricing section on landing
- **Tier / flags:** Public
- **Riesgo:** `safe`
- **Precondiciones:** None
- **Setup overlays:** Dismiss cookies if needed
- **Pasos:**
  1. Open `https://trefolio.com/landing`.
  2. Scroll to pricing (or navigate to `#pricing` if present).
  3. Identify Free / Bifolio / Trefolio (or Folio / Bifolio / Trefolio) tier names and prices.
- **Esperado:** At least three tiers visible with price amounts; no claim of admin features.
- **Evidencia:** Screenshot of pricing block.
- **Pass / Fail / Skip:** Pass if tiers + prices visible. Fail if section missing or broken layout.

### UC-PUB-03 — Interactive demo
- **Dominio / rutas:** Demo · `/demo`
- **Tier / flags:** Public
- **Riesgo:** `safe`
- **Precondiciones:** None
- **Setup overlays:** Dismiss demo banner only if it blocks content; do not require login
- **Pasos:**
  1. Open `https://trefolio.com/demo`.
  2. Confirm a demo banner or “demo” indicator is present.
  3. Confirm dashboard-like content renders (portfolio value, holdings, or chart — seeded data).
  4. Confirm page did not redirect to `/login`.
- **Esperado:** Interactive demo dashboard with static data; no API auth error wall.
- **Evidencia:** Screenshot showing demo content + banner.
- **Pass / Fail / Skip:** Pass if demo UI loads without login. Fail if blank or forced login.

### UC-PUB-04 — Studio hub
- **Dominio / rutas:** Marketing · `/studio`
- **Tier / flags:** Public
- **Riesgo:** `safe`
- **Precondiciones:** None
- **Pasos:**
  1. Open `https://trefolio.com/studio`.
  2. Confirm agents (Warren, Clara, Will, and/or Renata/Roxana) are listed or described.
- **Esperado:** Studio hub loads; agent cards/sections visible.
- **Evidencia:** Screenshot of agent list/hero.
- **Pass / Fail / Skip:** Pass if ≥1 agent presented. Fail on blank/5xx.

### UC-PUB-05 — Blog index
- **Dominio / rutas:** Marketing · `/blog`
- **Tier / flags:** Public
- **Riesgo:** `safe`
- **Pasos:**
  1. Open `https://trefolio.com/blog`.
  2. Confirm at least one post title/link is listed.
  3. Optionally open one post and confirm article body renders.
- **Esperado:** Blog index with posts; post page has readable content.
- **Evidencia:** Screenshot of index (and post if opened).
- **Pass / Fail / Skip:** Pass if index lists posts. Fail if empty error or 404 on index.

### UC-PUB-06 — Legal privacy & terms
- **Dominio / rutas:** Legal · `/privacy`, `/terms`
- **Tier / flags:** Public
- **Riesgo:** `safe`
- **Pasos:**
  1. Open `https://trefolio.com/privacy`. Confirm heading related to Privacy and substantial text.
  2. Open `https://trefolio.com/terms`. Confirm Terms of Service (or equivalent) and substantial text.
- **Esperado:** Both pages load with legal copy (not placeholder stub only).
- **Evidencia:** Note headings found on each page.
- **Pass / Fail / Skip:** Pass if both pages have real content. Fail on 404/blank.

### UC-PUB-07 — Leaf waitlist
- **Dominio / rutas:** Device marketing · `/leaf`
- **Tier / flags:** Public; buy UI may depend on `commerce_enabled`
- **Riesgo:** `safe`
- **Pasos:**
  1. Open `https://trefolio.com/leaf`.
  2. Confirm Leaf / device marketing content.
  3. If a waitlist or interest form exists, do **not** submit unless asked; verify fields render.
- **Esperado:** Page loads with Leaf product messaging; form visible or clear CTA.
- **Evidencia:** Screenshot of `/leaf`.
- **Pass / Fail / Skip:** Pass if marketing page renders. Skip buy-checkout path if commerce off (still Pass page smoke).

### UC-PUB-08 — Cookie consent
- **Dominio / rutas:** GDPR · any public page
- **Tier / flags:** Public
- **Riesgo:** `safe`
- **Precondiciones:** Prefer fresh session / cleared site cookies for this UC, or first visit of session
- **Pasos:**
  1. Open `https://trefolio.com/landing` in a context where the cookie banner may show.
  2. If banner visible, click **Accept**.
  3. Confirm banner dismisses and page remains usable.
- **Esperado:** Banner can be accepted and does not permanently block UI.
- **Evidencia:** Before/after note or screenshot.
- **Pass / Fail / Skip:** Pass if Accept works or banner already dismissed from prior UC (note “already accepted”). Fail if Accept does nothing and UI stays blocked.

---

## B. Auth & profile

### UC-AUTH-01 — IdP login
- **Dominio / rutas:** Auth · `/login` → IdP → app
- **Tier / flags:** Any
- **Riesgo:** `safe`
- **Precondiciones:** `{{TEST_EMAIL}}`, `{{TEST_PASSWORD}}`; start logged out (clear cookies for trefolio.com + user.trefolio.com if needed)
- **Pasos:**
  1. Open `https://trefolio.com/login`.
  2. Complete OneLogin / IdP sign-in with test credentials.
  3. Wait until URL is on `trefolio.com` and not `/login`.
  4. Run dismiss overlays.
- **Esperado:** Authenticated app chrome (nav/home/portfolio). No endless redirect loop.
- **Evidencia:** Screenshot of post-login home/portfolio.
- **Pass / Fail / Skip:** Pass if authenticated landing works. Fail on wrong password loop after correct creds, or stuck on IdP.

### UC-AUTH-02 — Logout
- **Dominio / rutas:** Auth · profile / account menu
- **Tier / flags:** Any
- **Riesgo:** `safe`
- **Precondiciones:** Logged in (UC-AUTH-01)
- **Pasos:**
  1. Open account/profile menu (avatar or Profile).
  2. Click **Sign out** / **Log out** / equivalent.
  3. Confirm session ends (redirect to landing/login or unauthenticated marketing).
  4. Open `https://trefolio.com/portfolio` — expect redirect to login/IdP, not portfolio data.
- **Esperado:** Protected routes require login after logout.
- **Evidencia:** Screenshot of post-logout state.
- **Pass / Fail / Skip:** Pass if portfolio is gated after logout. Fail if still authenticated.
- **Note:** Re-login (UC-AUTH-01) before continuing authenticated UCs.

### UC-AUTH-03 — Profile hub
- **Dominio / rutas:** Profile · `/profile`
- **Tier / flags:** Any authenticated
- **Riesgo:** `safe`
- **Precondiciones:** Logged in
- **Pasos:**
  1. Open `https://trefolio.com/profile`.
  2. Confirm tabs/sections exist (e.g. Profile, Subscription, preferences).
  3. Confirm email or display identity is shown (may be masked).
- **Esperado:** Profile hub loads without error.
- **Evidencia:** Screenshot of profile.
- **Pass / Fail / Skip:** Pass if hub + identity/sections visible.

### UC-AUTH-04 — Locale & display currency
- **Dominio / rutas:** Profile settings · `/profile`
- **Tier / flags:** Any
- **Riesgo:** `reversible` (change back to original)
- **Precondiciones:** Logged in; note current locale and currency first
- **Pasos:**
  1. On `/profile`, find language/locale and display currency controls.
  2. Change currency to a different supported value (e.g. EUR ↔ USD) if available.
  3. Navigate to `/portfolio` and confirm currency symbols/labels reflect the choice (or amounts re-labeled).
  4. Restore original currency and locale.
- **Esperado:** Preference persists across navigation; restore succeeds.
- **Evidencia:** Screenshot of portfolio with temporary currency.
- **Pass / Fail / Skip:** Pass if change + restore work. Skip if controls not found (document). Fail if change breaks portfolio page.

### UC-AUTH-05 — What's New / release notes
- **Dominio / rutas:** Release · modal and/or `/releasenotes`
- **Tier / flags:** Any
- **Riesgo:** `safe`
- **Precondiciones:** Logged in
- **Pasos:**
  1. If What's New appeared at login, confirm **Got it** dismissed it (already in shared setup).
  2. Open `https://trefolio.com/releasenotes`.
  3. Confirm version entries / change list render.
- **Esperado:** Release notes page has content; modal does not permanently block app.
- **Evidencia:** Screenshot of release notes.
- **Pass / Fail / Skip:** Pass if page has entries. Fail on blank/404.

### UC-AUTH-06 — Onboarding gate
- **Dominio / rutas:** Onboarding · `/onboarding`
- **Tier / flags:** Any; may already be completed
- **Riesgo:** `safe`
- **Precondiciones:** Logged in
- **Pasos:**
  1. Open `https://trefolio.com/onboarding`.
  2. If wizard shows, do **not** wipe portfolio; either complete optional skip or navigate away to `/`.
  3. If redirected away because already onboarded, note that as Pass.
- **Esperado:** Either onboarding UI loads cleanly or app correctly skips completed onboarding.
- **Evidencia:** Note which path occurred.
- **Pass / Fail / Skip:** Pass on either completed-skip or usable wizard. Fail on crash/loop.

---

## C. Home & portfolio core

### UC-PORT-01 — Home daily
- **Dominio / rutas:** Home · `/`
- **Tier / flags:** Default home (`home_v2`); authenticated
- **Riesgo:** `safe`
- **Precondiciones:** Logged in; overlays dismissed
- **Pasos:**
  1. Open `https://trefolio.com/`.
  2. Confirm home content (highlights, movers, brief, recommendations, or portfolio summary — not a blank shell).
  3. Confirm this is not the admin panel.
- **Esperado:** Daily home renders meaningful sections.
- **Evidencia:** Screenshot of home.
- **Pass / Fail / Skip:** Pass if primary home content visible. Fail if empty error.

### UC-PORT-02 — Portfolio value & chart
- **Dominio / rutas:** Portfolio · `/portfolio`
- **Tier / flags:** Any
- **Riesgo:** `safe`
- **Precondiciones:** Logged in; ideally ≥1 holding or cash (else empty state is OK)
- **Pasos:**
  1. Open `https://trefolio.com/portfolio`.
  2. Confirm “Portfolio Value” or “Total Net Worth” (or localized equivalent) appears, **or** a clear empty/import CTA.
  3. If holdings exist, confirm a chart or performance visualization area is present.
- **Esperado:** Portfolio page loads; value/empty state consistent.
- **Evidencia:** Screenshot of portfolio hero.
- **Pass / Fail / Skip:** Pass if value or empty CTA visible. Fail on crash.

### UC-PORT-03 — Holdings list
- **Dominio / rutas:** Portfolio holdings · `/portfolio` (or holdings section/tab)
- **Tier / flags:** Any
- **Riesgo:** `safe`
- **Precondiciones:** Logged in
- **Pasos:**
  1. On `/portfolio`, locate holdings table/list.
  2. If holdings exist: confirm ticker, quantity, and value columns (or cards) render.
  3. If empty: confirm empty state with import/add CTA.
- **Esperado:** List or empty state — no perpetual loading >30s.
- **Evidencia:** Screenshot of holdings or empty state.
- **Pass / Fail / Skip:** Pass either path. Fail if spinner forever / error toast only.

### UC-PORT-04 — Add/remove stock holding (reversible)
- **Dominio / rutas:** Holdings CRUD
- **Tier / flags:** Subject to Free holding caps (`tier-gated`)
- **Riesgo:** `reversible`
- **Precondiciones:** Logged in; room under holding limit (or Skip)
- **Pasos:**
  1. Open add-holding / add-stock flow from portfolio or toolbar.
  2. Search for a liquid ticker (e.g. `AAPL` or `MC.PA`).
  3. Add a small test position (e.g. 1 share) with today’s or a clear date; save.
  4. Confirm holding appears in list.
  5. Remove/delete that same holding.
  6. Confirm it is gone.
- **Esperado:** Create and delete succeed without corrupting other holdings.
- **Evidencia:** Screenshots after add and after remove.
- **Pass / Fail / Skip:** Pass if add+remove work. Skip if paywall/cap blocks add (note tier). Fail if add succeeds but delete fails leaving orphan.

### UC-PORT-05 — Cash entry smoke
- **Dominio / rutas:** Cash · portfolio cash UI
- **Tier / flags:** Any
- **Riesgo:** `reversible` (prefer open modal then cancel if unsure; or add small amount then delete)
- **Precondiciones:** Logged in
- **Pasos:**
  1. Find cash / balances UI on portfolio or tools/accounts.
  2. Open add-cash flow.
  3. Either cancel without saving (smoke) **or** add €1 test cash then delete the entry.
- **Esperado:** Cash UI opens; cancel or reversible save works.
- **Evidencia:** Screenshot of cash modal/section.
- **Pass / Fail / Skip:** Pass if UI works. Fail if modal crashes.

### UC-PORT-06 — Portfolio switcher
- **Dominio / rutas:** Multi-portfolio · toolbar / global selector
- **Tier / flags:** Multi-portfolio often Bifolio/Trefolio (`tier-gated`)
- **Riesgo:** `safe`
- **Precondiciones:** Logged in
- **Pasos:**
  1. Locate portfolio selector/switcher in the app chrome.
  2. If multiple portfolios: switch and confirm holdings/summary change or name updates.
  3. If only one portfolio: confirm selector shows the current portfolio name (smoke).
- **Esperado:** Switcher visible; switch works when >1 portfolio.
- **Evidencia:** Screenshot of selector.
- **Pass / Fail / Skip:** Pass on smoke or successful switch. Skip if UI hidden on Free with clear upgrade — note as Skip only if selector absent entirely; single-portfolio display is Pass.

### UC-PORT-07 — Explore asset search
- **Dominio / rutas:** Explore · `/explore`
- **Tier / flags:** Any
- **Riesgo:** `safe`
- **Pasos:**
  1. Open `https://trefolio.com/explore`.
  2. Type a ticker or company name (e.g. `AAPL`).
  3. Confirm search results appear.
  4. Open one result if clickable; confirm detail or add affordance.
- **Esperado:** Search returns results without error.
- **Evidencia:** Screenshot of results.
- **Pass / Fail / Skip:** Pass if results show. Fail if search errors/empty for known ticker.

### UC-PORT-08 — Classic dashboard
- **Dominio / rutas:** Classic · `/classic`
- **Tier / flags:** `classic_home` (or always available legacy)
- **Riesgo:** `safe`
- **Pasos:**
  1. Open `https://trefolio.com/classic`.
  2. If redirected or upgrade wall: document Skip with message.
  3. If loaded: confirm tabbed dashboard (overview/holdings/etc.) renders.
- **Esperado:** Classic UI or intentional gate.
- **Evidencia:** Screenshot.
- **Pass / Fail / Skip:** Pass if classic UI works. Skip if flag/gate disables with clear message. Fail if 500/blank.

---

## D. Import

### UC-IMP-01 — Import hub
- **Dominio / rutas:** Import · `/import`
- **Tier / flags:** Any
- **Riesgo:** `safe`
- **Pasos:**
  1. Open `https://trefolio.com/import`.
  2. Confirm import methods listed (CSV/broker, SnapTrade, etc.).
- **Esperado:** Hub loads with ≥1 import method.
- **Evidencia:** Screenshot of hub.
- **Pass / Fail / Skip:** Pass if methods visible.

### UC-IMP-02 — Broker CSV path UI
- **Dominio / rutas:** Import · `/import` broker CSV flow
- **Tier / flags:** Any
- **Riesgo:** `safe` (do not upload real PII files unless human provides a fixture)
- **Pasos:**
  1. On `/import`, choose broker CSV / file import method.
  2. Confirm broker list or file picker UI appears.
  3. Cancel/back without importing if no fixture provided.
- **Esperado:** CSV path UI reachable and dismissible.
- **Evidencia:** Screenshot of broker/file step.
- **Pass / Fail / Skip:** Pass if UI opens. Fail if broken navigation.

### UC-IMP-03 — Import data-quality surface
- **Dominio / rutas:** Import quality · `/import` or post-import / holdings repair UI
- **Tier / flags:** Any
- **Riesgo:** `safe`
- **Pasos:**
  1. From import hub or portfolio, look for data quality / review / repair messaging if present.
  2. Open `https://trefolio.com/import/compare` if linked; confirm page loads (may be empty state).
- **Esperado:** Compare/quality pages do not 500; empty state OK.
- **Evidencia:** Screenshot or note “empty state OK”.
- **Pass / Fail / Skip:** Pass if pages load. Skip if feature not exposed to this account (document). Fail on 500.

### UC-IMP-04 — SnapTrade connect UI
- **Dominio / rutas:** SnapTrade · `/import?method=snaptrade_api` (or hub card)
- **Tier / flags:** Any; `external-oauth`
- **Riesgo:** `external-oauth`
- **Pasos:**
  1. Open SnapTrade / synced broker connect from import hub.
  2. Confirm connect/start OAuth CTA appears.
  3. **Do not** complete broker login unless human instructs.
  4. Optionally open `/import/synced` and confirm list or empty state.
- **Esperado:** Connect UI present; canceling leaves app stable.
- **Evidencia:** Screenshot of SnapTrade entry point.
- **Pass / Fail / Skip:** Pass if CTA/UI visible. Fail if hub claims SnapTrade but click 500s.

---

## E. Dashboard / metrics / charts

### UC-DASH-01 — Performance matrix
- **Dominio / rutas:** Portfolio performance matrix · `/portfolio` (hero table)
- **Tier / flags:** Any
- **Riesgo:** `safe`
- **Pasos:**
  1. Open `/portfolio`.
  2. Locate performance matrix / breakdown by asset class or period (if present).
  3. If absent (empty portfolio), confirm no crash — Pass with note.
- **Esperado:** Matrix renders or graceful empty.
- **Evidencia:** Screenshot.
- **Pass / Fail / Skip:** Pass on render or graceful empty. Fail on layout crash.

### UC-DASH-02 — Chart range selector
- **Dominio / rutas:** Charts · `/portfolio`
- **Tier / flags:** Any
- **Riesgo:** `safe`
- **Pasos:**
  1. On `/portfolio`, find range controls (1D / 1W / 1M / 1Y / etc.).
  2. Click a different range.
  3. Confirm chart updates or loading then settles (no permanent error).
- **Esperado:** Range change works when chart exists.
- **Evidencia:** Screenshot after range change.
- **Pass / Fail / Skip:** Pass if ranges work or no chart due to empty portfolio (note). Fail if range click errors.

### UC-DASH-03 — Tools performance & projection
- **Dominio / rutas:** Tools · `/tools/performance`, `/tools/projection`
- **Tier / flags:** Any / some projection may be gated
- **Riesgo:** `safe` / `tier-gated`
- **Pasos:**
  1. Open `https://trefolio.com/tools/performance`. Confirm distinct performance view (not Home).
  2. Open `https://trefolio.com/tools/projection`. Confirm growth/projection UI or paywall.
- **Esperado:** Routes cold-load dedicated content or clear paywall.
- **Evidencia:** Screenshots of both.
- **Pass / Fail / Skip:** Pass if content or paywall. Fail if both show Home movers by mistake / blank.

### UC-DASH-04 — Economic indicators
- **Dominio / rutas:** Macro · `/economic-indicators`
- **Tier / flags:** May be tier-gated
- **Riesgo:** `safe` / `tier-gated`
- **Pasos:**
  1. Open `https://trefolio.com/economic-indicators`.
  2. Confirm indicators (CPI, rates, etc.) or paywall/upgrade.
- **Esperado:** Page loads with data or intentional gate.
- **Evidencia:** Screenshot.
- **Pass / Fail / Skip:** Pass on data or paywall. Fail on 500.

### UC-DASH-05 — Market ticker bar
- **Dominio / rutas:** Market ticker · app chrome / landing
- **Tier / flags:** Any
- **Riesgo:** `safe`
- **Pasos:**
  1. On authenticated `/` or `/portfolio`, look for top market ticker strip.
  2. Also check `/landing` or `/demo` if not on app.
  3. Confirm tickers/prices move or static quotes display.
- **Esperado:** Ticker bar present on at least one of app/demo/landing.
- **Evidencia:** Screenshot including ticker.
- **Pass / Fail / Skip:** Pass if visible somewhere in session. Fail if documented as always-on but missing on all checked pages.

---

## F. Tools

### UC-TOOL-01 — Tools hub
- **Dominio / rutas:** Tools · `/tools`
- **Tier / flags:** Any
- **Riesgo:** `safe`
- **Pasos:**
  1. Open `https://trefolio.com/tools`.
  2. Confirm tool cards/links (screener, watchlist, alerts, etc.).
- **Esperado:** Hub lists multiple tools.
- **Evidencia:** Screenshot of hub.
- **Pass / Fail / Skip:** Pass if ≥3 tools linked.

### UC-TOOL-02 — Taxonomy / diversification
- **Dominio / rutas:** `/tools/taxonomy`
- **Tier / flags:** Any
- **Riesgo:** `safe`
- **Pasos:**
  1. Open `https://trefolio.com/tools/taxonomy`.
  2. Confirm diversification/taxonomy view (allocation chart/table) or empty state — **not** Home highlights.
- **Esperado:** Dedicated taxonomy content.
- **Evidencia:** Screenshot.
- **Pass / Fail / Skip:** Pass if taxonomy UI. Fail if Home content only.

### UC-TOOL-03 — Dividends
- **Dominio / rutas:** `/tools/dividends`
- **Tier / flags:** Any
- **Riesgo:** `safe`
- **Pasos:**
  1. Open `https://trefolio.com/tools/dividends`.
  2. Confirm dividends tool UI or empty state.
- **Esperado:** Page is dividends-specific.
- **Evidencia:** Screenshot.
- **Pass / Fail / Skip:** Pass if dedicated UI loads.

### UC-TOOL-04 — Events calendar
- **Dominio / rutas:** `/tools/events`
- **Tier / flags:** Any
- **Riesgo:** `safe`
- **Pasos:**
  1. Open `https://trefolio.com/tools/events`.
  2. Confirm events view (`portfolio-events` or calendar of earnings/ex-div) or empty state.
- **Esperado:** Events page loads.
- **Evidencia:** Screenshot.
- **Pass / Fail / Skip:** Pass if events UI visible.

### UC-TOOL-05 — Rebalancing
- **Dominio / rutas:** `/tools/rebalancing` (or rebalance tab under tools)
- **Tier / flags:** May be tier-gated
- **Riesgo:** `safe` / `tier-gated`
- **Pasos:**
  1. Open rebalancing from `/tools` or direct tools tab URL.
  2. Confirm targets UI or paywall.
- **Esperado:** Rebalance UI or clear upgrade gate.
- **Evidencia:** Screenshot.
- **Pass / Fail / Skip:** Pass on UI or paywall. Fail on 500.

### UC-TOOL-06 — Watchlist (reversible)
- **Dominio / rutas:** `/tools/watchlist` or watchlist tool
- **Tier / flags:** Any
- **Riesgo:** `reversible`
- **Pasos:**
  1. Open watchlist tool.
  2. Add a ticker (e.g. `MSFT`) if search allows.
  3. Confirm it appears.
  4. Remove it.
- **Esperado:** Add and remove succeed.
- **Evidencia:** Screenshots add/remove.
- **Pass / Fail / Skip:** Pass if reversible cycle works. Skip if watchlist disabled. Fail if add without remove path.

### UC-TOOL-07 — Stock screener
- **Dominio / rutas:** `/tools/screener`
- **Tier / flags:** Often Trefolio (`tier-gated`)
- **Riesgo:** `safe` / `tier-gated`
- **Pasos:**
  1. Open `https://trefolio.com/tools/screener`.
  2. Confirm screener filters/table **or** paywall.
  3. If accessible, apply one filter and confirm results refresh.
- **Esperado:** Screener or paywall — not blank.
- **Evidencia:** Screenshot.
- **Pass / Fail / Skip:** Pass on either. Fail on 500.

### UC-TOOL-08 — Warren screener
- **Dominio / rutas:** `/tools/warren-screener`
- **Tier / flags:** May be tier-gated
- **Riesgo:** `safe` / `tier-gated`
- **Pasos:**
  1. Open `https://trefolio.com/tools/warren-screener`.
  2. Confirm moat/value list or paywall.
- **Esperado:** Page loads with list or gate.
- **Evidencia:** Screenshot.
- **Pass / Fail / Skip:** Pass on list or paywall.

---

## G. AI

### UC-AI-01 — Company analysis hub
- **Dominio / rutas:** `/analisis`
- **Tier / flags:** Any / some sections Pro
- **Riesgo:** `safe`
- **Pasos:**
  1. Open `https://trefolio.com/analisis`.
  2. Confirm search/hub UI for company analysis.
- **Esperado:** Hub loads with search.
- **Evidencia:** Screenshot.
- **Pass / Fail / Skip:** Pass if search/hub visible.

### UC-AI-02 — Company analysis ticker
- **Dominio / rutas:** `/analisis/[ticker]` e.g. `/analisis/AAPL`
- **Tier / flags:** Sections may be `tier-gated`
- **Riesgo:** `safe` (prefer cached/public sections; avoid forcing every AI regenerate)
- **Pasos:**
  1. Open `https://trefolio.com/analisis/AAPL` (or search from hub).
  2. Confirm multi-section report shell (fundamentals / news / etc.) or paywall on sections.
  3. Do not spam regenerate on every section.
- **Esperado:** Ticker analysis page renders sections or gates.
- **Evidencia:** Screenshot of report header + one section.
- **Pass / Fail / Skip:** Pass if page useful. Fail on blank/500.

### UC-AI-03 — Holding or portfolio AI panel
- **Dominio / rutas:** AI analysis / portfolio review / chart AI panel
- **Tier / flags:** Quota + tier (`tier-gated`)
- **Riesgo:** `safe` (minimize quota)
- **Pasos:**
  1. From portfolio or a holding, open AI analysis / review / chat panel if available.
  2. Confirm panel opens (composer or existing report).
  3. Optionally send one short prompt **or** stop at panel-open if quota is a concern.
  4. Close panel.
- **Esperado:** Panel opens without crash; if prompt sent, stream or error message is coherent (not silent hang >60s).
- **Evidencia:** Screenshot of open panel.
- **Pass / Fail / Skip:** Pass if panel opens. Skip if no AI entry points on Free (document). Fail if open crashes app.

### UC-AI-04 — Agent office
- **Dominio / rutas:** `/office`
- **Tier / flags:** Pro / feature-gated (`tier-gated`)
- **Riesgo:** `safe` / minimize missions
- **Pasos:**
  1. Open `https://trefolio.com/office`.
  2. Confirm office UI (Warren/Clara/Will) **or** upgrade gate.
  3. Do not launch long multi-agent missions unless asked.
- **Esperado:** Office or paywall.
- **Evidencia:** Screenshot.
- **Pass / Fail / Skip:** Pass on UI or gate. Fail on 500.

### UC-AI-05 — MCP / docs public
- **Dominio / rutas:** `/docs`, `/landing/mcp`
- **Tier / flags:** Public docs; token minting may need login
- **Riesgo:** `safe`
- **Pasos:**
  1. Open `https://trefolio.com/docs` (or `/landing/mcp`).
  2. Confirm MCP/API documentation content.
  3. Optionally open Profile Developer · MCP tab while logged in — **do not** create tokens unless asked.
- **Esperado:** Docs land with readable MCP setup info.
- **Evidencia:** Screenshot of docs/MCP landing.
- **Pass / Fail / Skip:** Pass if docs render. Fail on 404 for both paths.

---

## H. Alerts & notifications

### UC-ALERT-01 — Price alert (reversible)
- **Dominio / rutas:** `/tools/alerts` or alerts tool
- **Tier / flags:** Caps by tier (`tier-gated`)
- **Riesgo:** `reversible`
- **Pasos:**
  1. Open alerts tool.
  2. Create a price alert on a ticker far from market (unlikely to fire) if UI allows.
  3. Confirm alert listed.
  4. Delete the alert.
- **Esperado:** Create + delete works; or paywall at cap.
- **Evidencia:** Screenshots.
- **Pass / Fail / Skip:** Pass if reversible or clear cap/paywall. Fail if create without delete.

### UC-ALERT-02 — In-app notifications bell
- **Dominio / rutas:** App chrome notifications
- **Tier / flags:** Any
- **Riesgo:** `safe`
- **Pasos:**
  1. Click the notifications bell/icon in the app header.
  2. Confirm drawer/panel opens (list or empty state).
  3. Close drawer.
- **Esperado:** Drawer opens and closes without error.
- **Evidencia:** Screenshot of open drawer.
- **Pass / Fail / Skip:** Pass if drawer works. Fail if click no-ops with console error wall.

### UC-ALERT-03 — Goals UI
- **Dominio / rutas:** Goals (home/AID/tools — wherever exposed)
- **Tier / flags:** May be gated
- **Riesgo:** `safe`
- **Pasos:**
  1. Search UI/nav for Goals / target value.
  2. Open goals UI if present; confirm list or create form (cancel without saving).
- **Esperado:** Goals surface exists or intentional absence on this tier.
- **Evidencia:** Screenshot or note “not exposed”.
- **Pass / Fail / Skip:** Pass if UI works. Skip if feature not exposed (document). Fail if link exists but page 500s.

---

## I. Crypto

### UC-CRYPTO-01 — Crypto market page
- **Dominio / rutas:** `/crypto`
- **Tier / flags:** May be tier-gated
- **Riesgo:** `safe` / `tier-gated`
- **Pasos:**
  1. Open `https://trefolio.com/crypto`.
  2. Confirm crypto market/list UI or paywall.
- **Esperado:** Page loads with quotes or gate.
- **Evidencia:** Screenshot.
- **Pass / Fail / Skip:** Pass on market or paywall.

### UC-CRYPTO-02 — Add crypto modal smoke
- **Dominio / rutas:** Add crypto modal (from crypto or portfolio)
- **Tier / flags:** Caps / tier
- **Riesgo:** `safe` (prefer cancel) or `reversible`
- **Pasos:**
  1. Open add-crypto flow.
  2. Search a coin (e.g. BTC).
  3. Cancel without saving **or** add tiny amount then remove.
- **Esperado:** Modal usable; cancel/remove leaves portfolio clean.
- **Evidencia:** Screenshot of modal.
- **Pass / Fail / Skip:** Pass if modal works. Skip if crypto add gated. Fail if modal crashes.

---

## J. Social

### UC-SOC-01 — Network feed
- **Dominio / rutas:** `/network`
- **Tier / flags:** `social_network_enabled`
- **Riesgo:** `safe`
- **Pasos:**
  1. Open `https://trefolio.com/network`.
  2. Confirm feed UI or feature-disabled message.
- **Esperado:** Feed or clear disabled state (not 500).
- **Evidencia:** Screenshot.
- **Pass / Fail / Skip:** Pass if feed loads. Skip if flag off with message. Fail on 500.

### UC-SOC-02 — People search
- **Dominio / rutas:** `/network/search`
- **Tier / flags:** `social_network_enabled`
- **Riesgo:** `safe`
- **Pasos:**
  1. Open `https://trefolio.com/network/search`.
  2. Enter a short query (e.g. `a`).
  3. Confirm results or empty state — no crash.
- **Esperado:** Search UI functional when social on.
- **Evidencia:** Screenshot.
- **Pass / Fail / Skip:** Pass/Skip same as flag rules. Fail on crash.

### UC-SOC-03 — Public profile
- **Dominio / rutas:** `/u/[slug]`
- **Tier / flags:** Public profiles; social flag may apply
- **Riesgo:** `safe`
- **Pasos:**
  1. From people search or known handle, open a public profile `/u/...`.
  2. If no handle known: open own profile share link from settings if available.
  3. Confirm profile header renders.
- **Esperado:** Profile page loads.
- **Evidencia:** Screenshot.
- **Pass / Fail / Skip:** Pass if any profile opens. Skip if no slug discoverable and social off.

### UC-SOC-04 — Connections
- **Dominio / rutas:** `/network/connections`
- **Tier / flags:** `social_network_enabled`
- **Riesgo:** `safe` (do not mass-follow)
- **Pasos:**
  1. Open `https://trefolio.com/network/connections`.
  2. Confirm connections UI (followers/following) or empty state.
- **Esperado:** Page loads.
- **Evidencia:** Screenshot.
- **Pass / Fail / Skip:** Pass/Skip per flag. Fail on 500.

### UC-SOC-05 — Chats list smoke
- **Dominio / rutas:** `/chats` or `/network/conversations`
- **Tier / flags:** Social / chat enabled
- **Riesgo:** `safe` (do not message strangers)
- **Pasos:**
  1. Open chats/conversations list.
  2. Confirm list or empty state.
  3. Do not send messages.
- **Esperado:** List UI loads.
- **Evidencia:** Screenshot.
- **Pass / Fail / Skip:** Pass if list loads. Skip if chat disabled. Fail on 500.

---

## K. Billing (UI only)

### UC-BILL-01 — Profile subscription
- **Dominio / rutas:** `/profile?section=subscription` (or Subscription tab)
- **Tier / flags:** Any
- **Riesgo:** `billing-ui-only`
- **Pasos:**
  1. Open profile Subscription section.
  2. Confirm current plan/tier label visible (Free / Bifolio / Trefolio / trial).
  3. Confirm upgrade or manage actions present as appropriate.
- **Esperado:** Subscription status readable.
- **Evidencia:** Screenshot (redact payment method details if shown).
- **Pass / Fail / Skip:** Pass if tier shown. Fail if section missing/errors.

### UC-BILL-02 — Pro paywall surface
- **Dominio / rutas:** Any Pro tool (e.g. screener, office, economic indicators)
- **Tier / flags:** Free accounts expected to see paywall; Pro may Pass as “feature unlocked”
- **Riesgo:** `billing-ui-only` / `tier-gated`
- **Pasos:**
  1. Open a known Pro feature URL (e.g. `/tools/screener` or `/office`).
  2. If Free: confirm upgrade/paywall messaging (not a silent blank).
  3. If Pro: confirm feature content (also Pass).
- **Esperado:** Gate or feature — never broken empty page.
- **Evidencia:** Screenshot of paywall or unlocked feature.
- **Pass / Fail / Skip:** Pass either. Fail if Free gets blank 200 with no CTA.

### UC-BILL-03 — Manage subscription / checkout link
- **Dominio / rutas:** Stripe customer portal or checkout from subscription UI
- **Tier / flags:** Any
- **Riesgo:** `billing-ui-only`
- **Pasos:**
  1. From Subscription, click **Manage subscription** or upgrade CTA.
  2. Confirm Stripe Checkout or Customer Portal loads (stripe.com or Stripe-hosted UI).
  3. **Do not** complete payment, change plan, or cancel.
  4. Close tab / back to trefolio.
- **Esperado:** Stripe UI opens; app still usable after return.
- **Evidencia:** Screenshot of Stripe page header (no card numbers).
- **Pass / Fail / Skip:** Pass if Stripe opens. Skip if button absent on Free with only in-app pricing (then verify pricing CTA). Fail if button 500s.

---

## L. Cross-cutting

### UC-X-01 — Theme switch
- **Dominio / rutas:** Theme settings (profile or theme control)
- **Tier / flags:** Themes: Default, Canvas, Terminal, Studio
- **Riesgo:** `reversible`
- **Pasos:**
  1. Note current theme.
  2. Switch to a different theme (prefer Terminal or Canvas).
  3. Confirm `/portfolio` remains readable (text contrast, no missing chrome).
  4. Switch to a third theme if available.
  5. Restore original theme.
- **Esperado:** ≥2 themes render without broken layout; restore works.
- **Evidencia:** Screenshot per theme tried.
- **Pass / Fail / Skip:** Pass if ≥2 themes OK. Fail if theme switch blanks app.

### UC-X-02 — Locale EN/ES
- **Dominio / rutas:** Profile language
- **Tier / flags:** i18n
- **Riesgo:** `reversible`
- **Pasos:**
  1. Note current language.
  2. Switch to Spanish (Español) if not already; confirm key chrome strings change (e.g. nav labels).
  3. Switch to English; confirm strings revert.
  4. Restore original language.
- **Esperado:** Language toggle updates UI strings.
- **Evidencia:** Screenshot ES + EN nav/home.
- **Pass / Fail / Skip:** Pass if both languages apply. Fail if toggle no-ops.

### UC-X-03 — Global search cmd-K
- **Dominio / rutas:** Command palette
- **Tier / flags:** Any authenticated
- **Riesgo:** `safe`
- **Pasos:**
  1. On `/`, press `Meta+K` (macOS) or `Ctrl+K`.
  2. If palette opens, type `portfolio` or a ticker; confirm results.
  3. Escape to close.
  4. If shortcut fails, find Search button in UI and open palette.
- **Esperado:** Palette opens and returns navigable results.
- **Evidencia:** Screenshot of palette.
- **Pass / Fail / Skip:** Pass if palette works. Fail if neither shortcut nor UI search exists.

### UC-X-04 — Mobile home & portfolio smoke
- **Dominio / rutas:** `/`, `/portfolio`
- **Tier / flags:** Any
- **Riesgo:** `safe`
- **Pasos:**
  1. Set viewport to `375×812`.
  2. Open `/` — confirm usable layout (no permanent horizontal scroll; primary content visible).
  3. Open `/portfolio` — confirm value/holdings/empty CTA usable; touch targets not clipped by unsafe areas if obvious.
  4. Restore desktop viewport.
- **Esperado:** Core pages usable on mobile width.
- **Evidencia:** Screenshots mobile home + portfolio.
- **Pass / Fail / Skip:** Pass if both usable. Fail if content unreachable / severe overflow.

---

## Explicitly out of scope

Do **not** test as part of this catalog:

- `/admin/*` and all admin sub-tools
- Impersonation, membership grants (admin), ops Telegram agent
- Cron jobs, internal analytics admin, AI model admin registry
- Device firmware OTA, SDL simulator, Capacitor native binary builds
- `/developer` internal architecture registry (unless human asks)
- Completing real payments, refunds, or account deletion
- Creating Personal Access Tokens / MCP secrets unless human asks

---

## Suggested execution order for a full run

1. UC-PUB-* (no login)
2. UC-AUTH-01 → overlays
3. UC-PORT-*, UC-DASH-*, UC-TOOL-*, UC-IMP-* (safe first, then reversible)
4. UC-AI-* (quota-aware)
5. UC-ALERT-*, UC-CRYPTO-*
6. UC-SOC-* (skip if flag off)
7. UC-BILL-* (UI only)
8. UC-X-*
9. UC-AUTH-02 logout last (or re-login after if more work remains)

---

## QA Report (copy for agent)

```md
## QA Report
- Scope: production-user-test-catalog (UC-… list)
- Environment: https://trefolio.com
- Account: {{TEST_EMAIL}} (tier: …)
- Results:
  - PASS: …
  - FAIL: … — reason + evidence
  - SKIP: … — reason
- Findings: …
- Risk level: Low | Medium | High
```
