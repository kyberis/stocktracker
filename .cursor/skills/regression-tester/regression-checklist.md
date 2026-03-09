# Regression Test Checklist

Full test matrix organized by feature area. Each test has a browser action and expected outcome.

---

## 1. Landing Page (`/`)

| # | Test | Action | Expected |
|---|------|--------|----------|
| 1.1 | Page loads | Navigate to `/` while logged out | Landing page renders with hero, features, pricing |
| 1.2 | Feature cards | Scroll to features section | 6 feature cards visible with icons and descriptions |
| 1.3 | Pricing section | Scroll to pricing | Free, Bifolio, and Trefolio tiers shown with correct prices (€2.99/mo, €7.99/mo) |
| 1.4 | Navigation links | Click Features / Pricing / FAQ anchors | Smooth scroll to each section |
| 1.5 | CTA buttons | Locate "Get Started" buttons | Buttons link to `/signup` |
| 1.6 | Footer links | Check footer | Privacy Policy and Terms of Service links present and working |
| 1.7 | Mobile menu | Resize to 375px, open hamburger | Mobile menu shows nav items |

## 2. Authentication

| # | Test | Action | Expected |
|---|------|--------|----------|
| 2.1 | Login page | Navigate to `/login` | Email and password fields, submit button, Google OAuth button |
| 2.2 | Valid login | Login with test credentials | Redirect to dashboard `/` |
| 2.3 | Invalid login | Submit wrong password | Error message displayed, no redirect |
| 2.4 | Signup page | Navigate to `/signup` | Email, password fields, Google OAuth option |
| 2.5 | New signup | Sign up with fresh email | Redirect to dashboard, seeded or empty portfolio |
| 2.6 | Duplicate signup | Sign up with existing email | Error message about existing account |
| 2.7 | Logout | Click sign out from user dropdown | Redirect to landing, session cleared |
| 2.8 | Change password | Navigate to `/change-password` | Form accepts current + new password, confirms change |
| 2.9 | Protected routes | Visit `/tools` while logged out | Redirect to landing `/` |
| 2.10 | Google OAuth | Google button present on login/signup | Button visible and styled (don't actually OAuth) |

## 3. Dashboard (Portfolio)

| # | Test | Action | Expected |
|---|------|--------|----------|
| 3.1 | Dashboard loads | Login, go to `/` | Portfolio summary, holdings table, growth periods visible |
| 3.2 | Portfolio summary | Check header area | Total value, daily change, total gain/loss displayed |
| 3.3 | Holdings table | Check table | Ticker, shares, price, value, daily change columns |
| 3.4 | Empty state | Login as new user with no holdings | Empty state message or prompt to import/add |
| 3.5 | Add holding | Use add holding UI | Holding appears in table with correct data |
| 3.6 | Edit holding | Edit an existing holding | Updated values reflected |
| 3.7 | Delete holding | Delete a holding | Removed from table, totals recalculated |
| 3.8 | Growth periods | Check YTD / 1M / 1Y cards | Values displayed with correct date ranges |
| 3.9 | Performance metrics | Check TTWROR and IRR | Percentage values displayed |
| 3.10 | Projection chart | Check growth projection (Pro or blurred for Free) | Chart renders with controls |
| 3.11 | Stock link | Click a ticker in the table | Navigates to `/stock/[ticker]` |

## 4. Portfolio Tools (`/tools`)

| # | Test | Action | Expected |
|---|------|--------|----------|
| 4.1 | Tools page loads | Navigate to `/tools` | Tab interface with multiple tool sections |
| 4.2 | Transactions tab | Click Transactions | Transaction list with type, ticker, date, amount |
| 4.3 | Add transaction | Add a buy transaction | Appears in list, holding updated |
| 4.4 | Delete transaction | Delete a transaction | Removed, holding recalculated |
| 4.5 | Dividends tab | Click Dividends | Dividend history, estimated annual income |
| 4.6 | Performance tab | Click Performance | TTWROR, IRR metrics displayed |
| 4.7 | Taxonomy tab | Click Taxonomy | Sector/region/asset class breakdown |
| 4.8 | Rebalancing tab | Click Rebalancing | Target allocation vs actual |
| 4.9 | Accounts tab | Click Accounts | Account list |
| 4.10 | Watchlist tab | Click Watchlist | Watchlist entries |
| 4.11 | Alerts tab | Click Price Alerts (if feature flag enabled) | Alert list, create alert UI |
| 4.12 | Broker Import tab | Click Broker Import | Broker selection cards (DEGIRO, IBKR, T212, Revolut) |

## 5. Import Flows

| # | Test | Action | Expected |
|---|------|--------|----------|
| 5.1 | Import modal | Open import modal from dashboard | Format selection (AI, DEGIRO, IBKR, T212, Revolut, Simple CSV) |
| 5.2 | DEGIRO CSV | Upload a DEGIRO CSV | Parse preview with transaction count, import succeeds |
| 5.3 | Simple CSV | Upload a simple format CSV | Parse and import with preview |
| 5.4 | AI import | Upload CSV/image for AI extraction | AI processes and returns parsed transactions |
| 5.5 | Import errors | Upload invalid/empty file | Clear error message, cancel button available |
| 5.6 | Free-tier limit | Import > 15 holdings on Free | Stops at limit with message, not a full failure |

## 6. Stock Detail (`/stock/[ticker]`)

| # | Test | Action | Expected |
|---|------|--------|----------|
| 6.1 | Page loads | Navigate to `/stock/AAPL` | Stock name, price, chart visible |
| 6.2 | Price chart | Check chart area | Interactive chart with time range selectors |
| 6.3 | Fundamentals | Check fundamentals section (Pro) | Financial data or paywall for Free users |
| 6.4 | Financials | Check financials section | Income statement, balance sheet, cash flow |

## 7. Stock Intelligence (`/stock/[ticker]/intelligence`)

| # | Test | Action | Expected |
|---|------|--------|----------|
| 7.1 | Page loads (Pro) | Navigate as Pro user | News, insider trades, institutional holdings, earnings |
| 7.2 | Paywall (Free) | Navigate as Free user | Upgrade prompt or locked content |
| 7.3 | AI analysis | Trigger AI analysis button | Analysis generated in user language |

## 8. Economic Indicators (`/economic-indicators`)

| # | Test | Action | Expected |
|---|------|--------|----------|
| 8.1 | Page loads (Pro) | Navigate as Pro user | GDP, CPI, unemployment charts |
| 8.2 | Paywall (Free) | Navigate as Free user | Upgrade prompt |
| 8.3 | AI analysis | Trigger AI analysis | Analysis generated |

## 9. Profile (`/profile`)

| # | Test | Action | Expected |
|---|------|--------|----------|
| 9.1 | Page loads | Navigate to `/profile` | Email, display name, avatar, plan badge |
| 9.2 | Edit profile | Change display name | Saved and reflected |
| 9.3 | Plan display | Check subscription section | Free or Pro badge, upgrade CTA if Free |
| 9.4 | Email verification | Check email verification status | Verified badge or verify button |
| 9.5 | Delete account | Check delete account section | Delete button with confirmation |

## 10. Admin Panel (`/admin`)

| # | Test | Action | Expected |
|---|------|--------|----------|
| 10.1 | Admin access | Login as admin, navigate to `/admin` | Admin panel loads |
| 10.2 | Non-admin blocked | Login as regular user, navigate to `/admin` | Access denied or redirect |
| 10.3 | Users tab | Click Users | User list with email, plan, actions |
| 10.4 | Analytics tab | Click Analytics | Usage charts, signup trends |
| 10.5 | Settings tab | Click Settings | API keys (AV, OpenAI, Resend), feature flags |
| 10.6 | Feature flags | Toggle a feature flag | Flag state changes, UI reflects it |
| 10.7 | Change user tier | Change a user from Free to Pro | User plan updated |

## 11. Billing & Subscription

| # | Test | Action | Expected |
|---|------|--------|----------|
| 11.1 | Upgrade CTA | Click upgrade on Free account | Redirect to Stripe checkout or capacity message |
| 11.2 | Pro features access | Login as Pro user | Fundamentals, intelligence, indicators unlocked |
| 11.3 | Free limits | Login as Free user | AI calls limited, 15 holdings cap, export locked |
| 11.4 | Billing portal | Access billing portal link | Redirect to Stripe portal (or error if no subscription) |

## 12. Settings

| # | Test | Action | Expected |
|---|------|--------|----------|
| 12.1 | Settings modal | Open settings | Theme, language, quote provider, refresh interval |
| 12.2 | Theme toggle | Switch dark/light | Theme changes across all pages |
| 12.3 | Language switch | Switch to Spanish | UI text changes to Spanish |
| 12.4 | Quote provider | Check provider options | Yahoo Finance option available |

## 13. Navigation & Layout

| # | Test | Action | Expected |
|---|------|--------|----------|
| 13.1 | Top nav | Check header | Portfolio, Tools, Indicators links |
| 13.2 | User dropdown | Click user avatar | Profile, Admin (if admin), sign out options |
| 13.3 | Mobile bottom tabs | Resize to mobile | Bottom tab bar with main sections |
| 13.4 | What's New modal | Check for what's new indicator | Release notes modal shows latest changes |

## 14. Legal Pages

| # | Test | Action | Expected |
|---|------|--------|----------|
| 14.1 | Privacy Policy | Navigate to `/privacy` | Full privacy policy content loads |
| 14.2 | Terms of Service | Navigate to `/terms` | Full terms content loads |

## 15. API Health

Quick API sanity checks (via browser fetch or direct request):

| # | Endpoint | Method | Expected |
|---|----------|--------|----------|
| 15.1 | `/api/auth/me` | GET (no session) | 401 |
| 15.2 | `/api/auth/me` | GET (with session) | 200 + user data |
| 15.3 | `/api/holdings` | GET (with session) | 200 + holdings array |
| 15.4 | `/api/feature-flags` | GET | 200 + flags object |
| 15.5 | `/api/exchange-rates` | GET | 200 + rates |
| 15.6 | `/api/metrics` | GET | 200 + Prometheus format |
