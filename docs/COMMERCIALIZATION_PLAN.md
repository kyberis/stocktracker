# trefolio — Commercialization Plan

> **Plan version:** 2.0 — March 2026
> **App version:** v0.29.0
> **Price:** Bifolio 2.99 EUR/month | Trefolio 7.99 EUR/month | Free tier available
> **Annual:** Bifolio 23.99 EUR/year | Trefolio 59.99 EUR/year (save up to 37%)
> **Status:** Technical foundation ready — remaining items are legal entity, domain purchase, and production Stripe configuration

---

## Table of Contents

1. [Product Vision & Positioning](#1-product-vision--positioning)
2. [Tier Structure & Pricing](#2-tier-structure--pricing)
3. [Technical Status](#3-technical-status)
4. [Features Shipped](#4-features-shipped)
5. [Legal & Compliance](#5-legal--compliance)
6. [Branding & Domain](#6-branding--domain)
7. [Landing Page](#7-landing-page)
8. [Marketing & Advertising Plan](#8-marketing--advertising-plan)
9. [Launch Checklist](#9-launch-checklist)
10. [Decision Points](#10-decision-points)
11. [Revenue Projections](#11-revenue-projections)

---

## 1. Product Vision & Positioning

### One-liner

**trefolio** — The simplest way to track your stock portfolio with AI-powered insights, in 35 European languages, starting at 2.99 EUR/month.

### Why trefolio?

| Pain point | How trefolio solves it |
|---|---|
| Most portfolio trackers are complex, designed for traders | Simple UI for people who just want to track long-term holdings |
| Free tools lack fundamentals and AI analysis | Pro tier includes company fundamentals, economic indicators, and AI explanations in plain language |
| Multi-currency portfolios are messy | Automatic currency conversion, multi-exchange support (NYSE, XETRA, LSE, AMS, MAD, OMK, etc.) |
| Data privacy concerns with big platforms | All data encrypted at rest; no selling of user data; EU cookie consent and GDPR-compliant |
| English-only tools exclude most of Europe | 35 European languages including all 24 official EU languages |
| Importing portfolio data is painful | One-click import from DEGIRO, Interactive Brokers, Trading 212, and Revolut |

### Target Audience

- **Primary:** Beginner-to-intermediate retail investors across Europe who hold 5-50 stocks/ETFs
- **Secondary:** Expats with multi-currency portfolios
- **Tertiary:** Non-English-speaking European investors (leveraging 35-language support)

### Competitive Landscape

| Competitor | Price | Weakness trefolio exploits |
|---|---|---|
| Yahoo Finance | Free | No AI, cluttered UI, no multi-currency portfolio, English only |
| Seeking Alpha | $19.99/mo | 4x more expensive, US-focused, complex |
| Simply Wall St | $10/mo | 2x more expensive, no broker import, limited languages |
| Portfolio Performance | Free (desktop) | No web/mobile, no AI, steep learning curve, no broker CSV import |
| Snowball Analytics | $8/mo | More expensive, no AI analysis, fewer languages |
| **trefolio** | **2.99-7.99 EUR/mo** | Simple, AI-powered, 35 languages, 14 broker imports, 3-tier model with free tier |

---

## 2. Tier Structure & Pricing

### Free Tier

| Feature | Included |
|---|---|
| Portfolio tracking (up to **15 holdings**) | Yes |
| Yahoo Finance real-time quotes | Yes |
| Historical price charts | Yes |
| Cash balance tracking | Yes |
| Benchmark comparison (S&P 500, Nasdaq, Euro Stoxx 50) | Yes |
| DEGIRO, IBKR, Trading 212, Revolut & Simple CSV import | Yes |
| Dark/Light mode | Yes |
| **35 European languages** | Yes |
| Portfolio growth projection (blurred preview) | Yes |
| Feedback system | Yes |
| **AI analysis** | **5 calls/month** |
| **Price alerts** | **2 alerts (in-app only)** |
| **Unlimited holdings** | No |
| **Alpha Vantage data** | No |
| **Fundamentals (Income, Balance, Cash Flow)** | No |
| **Intelligence (News, Insider, Institutional)** | No |
| **Economic Indicators** | No |
| **CSV Export** | No |

### Starter Tier (Bifolio) — 2.99 EUR/month (23.99 EUR/year)

Everything in Free, plus:

| Feature | Included |
|---|---|
| **Up to 50 holdings** | Yes |
| AI analysis | **20 calls/month** |
| **10 price alerts** + email & push notifications | Yes |
| 1-year portfolio growth history | Yes |
| Portfolio sharing (public link) | Yes |
| CSV export (holdings, transactions, cash) | Yes |

### Pro Tier (Trefolio) — 7.99 EUR/month (59.99 EUR/year)

Everything in Bifolio, plus:

| Feature | Included |
|---|---|
| **Unlimited holdings** | Yes |
| Alpha Vantage premium data | Yes |
| Company fundamentals (income, balance, cash flow) | Yes |
| Stock intelligence (news sentiment, insider trades) | Yes |
| Portfolio news feed across all holdings | Yes |
| Economic indicators dashboard | Yes |
| AI analysis | **30 calls/day** |
| AI Portfolio Review | **5/month** |
| Unlimited price alerts + WhatsApp, push & email | Yes |
| Advanced metrics (Sharpe, Drawdown, Volatility) | Yes |
| Full portfolio history (all time) | Yes |
| Automatic Broker Sync (20+ brokerages via SnapTrade) | Yes |
| Priority support | Yes |
| Up to 3 portfolios with independent tracking | Yes |

### Why this pricing?

- **Bifolio at 2.99 EUR/month** is below the "impulse buy" threshold — high-margin entry point (88% margin) with no expensive API dependencies
- **Trefolio at 7.99 EUR/month** undercuts Getquin Premium (7.50 EUR/mo) and is 2x cheaper than Simply Wall St ($10.95/mo)
- Covers Alpha Vantage API costs (~$50/month premium key shared across Trefolio users)
- Covers SnapTrade broker sync costs ($2/connected user/month)
- Covers OpenAI API costs (~0.10-0.30 EUR/user/month at typical usage)
- Bifolio net revenue per user after Stripe fees: ~2.53 EUR/month
- Trefolio net revenue per user after Stripe fees: ~7.10 EUR/month
- At 50 paying users (mix of Bifolio + Trefolio) = **~250-350 EUR/month** — covers all infrastructure
- At 500 paying users = **~2,500+ EUR/month** — sustainable SaaS business

### Pricing Options

- **Bifolio Monthly:** 2.99 EUR/month (launch), 3.99 EUR/month (regular)
- **Bifolio Annual:** 23.99 EUR/year (launch), 31.99 EUR/year (regular) — save 33%
- **Trefolio Monthly:** 7.99 EUR/month (launch), 9.99 EUR/month (regular)
- **Trefolio Annual:** 59.99 EUR/year (launch), 79.99 EUR/year (regular) — save 37%
- **Family plan (future):** 12 EUR/month for up to 3 accounts
- **Self-hosted license (future):** One-time 99 EUR for Docker image with all Pro features

### Platform Limits

Current rate limiting and capacity configuration:

| Limit | Value | Notes |
|---|---|---|
| `MAX_PRO_SUBSCRIBERS` | 500 | Increase as infrastructure scales |
| `FREE_HOLDINGS_LIMIT` | 15 | Starter: 50, Pro: unlimited |
| `FREE_ALERT_LIMIT` | 2 | Starter: 10, Pro: unlimited |
| `AI_FREE_MONTHLY_LIMIT` | 5 calls/month | |
| `AI_STARTER_MONTHLY_LIMIT` | 20 calls/month | |
| `AI_PRO_DAILY_LIMIT` | 30 calls/day | |
| `AI_IMPORT_DAILY_LIMIT` | 5/day | Any tier |
| `AV_GLOBAL_PER_MINUTE` | 75 | Shared across all users |
| `AV_PER_USER_PER_MINUTE` | 15 | Prevents a single user hogging the pool |
| `FREE_PORTFOLIO_LIMIT` | 1 | Starter: 1, Pro: 3 |

---

## 3. Technical Status

All major technical milestones from the original plan are **implemented and deployed**.

### 3.1 Email Verification & Registration — COMPLETED

| Component | Implementation |
|---|---|
| Email field | `email` column on `users` table, unique, required |
| Email sending | **Resend** — API key admin-managed from the admin panel |
| Verification token | JWT signed with `APP_SESSION_SECRET`, expires in 24h |
| Verification flow | Profile page → send verification → click link → verified |
| Password reset | Email-based reset flow with signed JWT (1h expiry) |
| Rate limiting | Per-customer via Upstash Redis |

### 3.2 Payment Integration (Stripe) — COMPLETED

| Route | Purpose |
|---|---|
| `POST /api/billing/checkout` | Creates Stripe Checkout session (monthly or annual) |
| `POST /api/billing/webhook` | Handles subscription lifecycle events |
| `GET /api/billing/portal` | Redirects to Stripe Customer Portal |
| `POST /api/billing/sync` | Syncs plan status after checkout (before webhook arrives) |
| `GET /api/billing/capacity` | Returns current Pro count vs `MAX_PRO_SUBSCRIBERS` |

Stripe cost: ~1.5% + 0.25 EUR per transaction in Europe. Bifolio (2.99 EUR): ~0.29 EUR fee (9.8%), net ~2.70 EUR. Trefolio (7.99 EUR): ~0.37 EUR fee (4.6%), net ~7.62 EUR.

### 3.3 Subscription Management — COMPLETED

Feature gating implemented in `src/lib/subscription.ts` with `canAccessFeature()`. Eight upsell surfaces defined in `src/lib/upsell.ts` for contextual upgrade prompts across AI limits, stock detail, intelligence, economic indicators, projections, profile, settings, and alerts.

Graceful degradation: when a Pro subscription lapses, all user data is preserved, Yahoo Finance features continue working, and Pro features show an upgrade prompt instead of data.

### 3.4 Data Encryption & Security — COMPLETED

| Layer | Status |
|---|---|
| Passwords hashed with bcrypt | Done |
| JWT sessions in httpOnly cookies | Done |
| API keys encrypted with AES-256-GCM (AV, OpenAI, Resend) | Done |
| HTTPS enforced on Vercel | Done |
| Middleware route protection | Done |
| Database encryption at rest (Turso) | Done |
| Per-customer rate limiting via Upstash Redis | Done |
| Admin feature flags (alerts, CSV export) | Done |
| AI hallucination safeguards (temperature 0.3, grounding rules) | Done |
| EU cookie consent banner | Done |

**Still needed:**
- Security headers in `next.config.mjs` (CSP, X-Frame-Options, HSTS)
- CSRF protection upgrade (SameSite=Strict + CSRF tokens on mutations)
- 2FA via TOTP (nice-to-have for v2)

### 3.5 Infrastructure & Observability — COMPLETED

| Component | Implementation |
|---|---|
| Hosting | Vercel (serverless) |
| Database | Turso (libSQL, encrypted at rest) |
| Rate limiting | Upstash Redis (sub-millisecond checks) |
| Metrics | Prometheus `/api/metrics` endpoint |
| Observability | Grafana Cloud via OTLP HTTP push |
| Cron: price alerts | Every 15 minutes — fetches quotes, triggers email for Pro users |
| Cron: gauge push | Daily — pushes DB-derived metrics to Grafana Cloud |
| Performance | 75% bundle reduction via lazy loading, parallel quote fetching, Cache-Control headers |
| Testing | Pre-deploy suite: unit tests (Vitest) + E2E tests (Playwright) |

**Scaling plan:**

| Users | Infrastructure | Monthly Cost |
|---|---|---|
| 0-500 | Vercel Free/Pro + Turso Free + Upstash Free | 0-20 EUR |
| 500-2,000 | Vercel Pro + Turso Scaler + Upstash Pro | ~50 EUR |
| 2,000-10,000 | Vercel Pro + Turso Scaler + Upstash Pro | ~100 EUR |
| 10,000+ | Consider dedicated hosting or Vercel Enterprise | ~300+ EUR |

---

## 4. Features Shipped

30 versions shipped from v0.5.0 (December 2025) through v0.29.0 (March 2026).

### Core Portfolio

- Real-time dashboard with Yahoo Finance quotes
- Multi-exchange support: NYSE, NASDAQ, XETRA, LSE, AMS, MAD, OMK
- Cash balance tracking with multi-currency (EUR, USD, GBP, DKK, CAD)
- Simplified portfolio view inspired by DEGIRO (v0.23.0)
- Holdings auto-classification by sector, region, and asset class via Yahoo Finance (v0.23.0)
- Performance metrics: TTWROR (Modified Dietz) and IRR/XIRR with methodology notes (v0.12.0)
- Portfolio growth periods: YTD, 1 Month, 1 Year (v0.14.0)
- Multi-currency performance accuracy with historical FX rates (v0.28.1)
- Benchmark comparison: S&P 500, Nasdaq, Dow Jones, Euro Stoxx 50

### Import & Data

- **DEGIRO** CSV import: transactions, dividends, fees, cash balances (v0.10.0-v0.12.0)
- **Interactive Brokers** import: Activity Statement & Flex Query CSV (v0.26.0)
- **Trading 212** History CSV import with automatic fee detection (v0.26.0)
- **Revolut** Account Statement import (Excel/CSV) with dividend grouping (v0.26.0)
- **Simple CSV** format with manual column mapping (v0.12.0)
- **AI-powered smart import** from screenshots or CSV via OpenAI (v0.9.0)
- Unified broker parser architecture with shared deduplication and ISIN resolution (v0.26.0)
- Automatic ISIN-to-ticker resolution via Yahoo Finance search (v0.18.1)

### Intelligence & Analysis (Pro)

- Stock detail pages with interactive price charts (v0.7.0)
- Financial statements: income, balance sheet, cash flow, earnings (v0.7.0)
- News sentiment analysis with bullish/bearish indicators (v0.8.0)
- Insider transactions tracking (v0.8.0)
- Institutional holdings breakdown by top investors (v0.8.0)
- Earnings call transcript viewer (v0.8.0)
- US economic indicators dashboard: GDP, CPI, unemployment, treasury yields (v0.9.0)
- AI-powered analysis with hallucination safeguards (temperature 0.3, grounding rules, ticker/date validation) (v0.9.0, v0.24.1)
- AI responses generated in the user's selected language (v0.29.0)

### Dividends & Projections

- Dividend tracking with estimated annual income (v0.9.6)
- Per-stock dividend breakdowns with yield percentages (v0.9.6)
- 5-year dividend growth projections (v0.9.6)
- Historical dividend calendar from imported broker data (v0.9.8)
- Portfolio growth projection with customizable growth rate, dividend reinvestment, and yearly contributions (v0.9.9)

### Price Alerts & CSV Export (Pro)

- Price alerts: set above/below targets for any stock (v0.20.0)
- Free users: 2 active alerts (in-app only)
- Pro users: unlimited alerts with email delivery via Resend
- Automated cron job checks alerts every 15 minutes (v0.20.0)
- CSV export for holdings, transactions, and cash balances (v0.20.0)
- Both features toggleable via admin feature flags (v0.21.0)

### User & Admin

- Authentication with secure session management (v0.6.0)
- User profiles with avatar, display name, email (v0.6.0)
- Email verification flow via Resend (v0.20.0)
- Change password, delete account with GDPR compliance (v0.9.5)
- Admin panel with tabs: Users, Settings, Analytics, Feedback (v0.6.0+)
- Admin-managed API keys: Alpha Vantage, OpenAI, Resend — all encrypted, no env vars needed (v0.9.2, v0.9.4, v0.21.0)
- Admin feature flags for alerts and CSV export (v0.21.0)
- Admin user tier management (Free/Starter/Pro) (v0.13.0)
- Feedback system with admin replies and status tracking (v0.18.0)
- Missing price reporting with admin notification (v0.18.1)
- Developer architecture page (admin-only) (v0.24.0)
- External services quick links in admin (Stripe, Grafana, Upstash, Vercel, Turso, AV, OpenAI) (v0.17.4)

### Platform & Operations

- Stripe subscriptions: Bifolio (2.99/23.99 EUR) and Trefolio (7.99/59.99 EUR), checkout, webhooks, billing portal (v0.11.0, v0.27.0)
- Pro subscriber capacity cap with visible counter and checkout blocking (v0.16.0)
- Per-customer rate limiting via Upstash Redis for AV, AI analysis, and AI imports (v0.16.0)
- Prometheus `/api/metrics` endpoint (v0.15.0)
- Grafana Cloud observability via OTLP HTTP push (v0.17.0)
- Pre-deploy test suite: unit tests (Vitest) + E2E tests (Playwright) (v0.10.1)
- Vercel Analytics + Speed Insights (v0.9.1)
- Internal event tracking for feature usage (v0.9.1)
- Admin analytics dashboard with usage charts, top stocks, signup trends, landing page analytics (v0.9.1)

### UX & Localization

- **35 European languages** with searchable native-name dropdown (v0.29.0) — includes all 24 EU official languages plus Norwegian, Ukrainian, Turkish, Serbian, Icelandic, Albanian, Bosnian, Macedonian, Belarusian, Catalan, and Welsh
- Dark/light mode (v0.6.0)
- Redesigned two-row navigation header with contextual action bar (v0.19.0)
- Mobile bottom tab bar for small screens (v0.19.0)
- Professional landing page at root (`/`) with value propositions, feature showcase, testimonials, comparison table, FAQ, pricing cards, and video tutorial (v0.11.0, v0.25.0)
- Privacy Policy and Terms of Service pages linked from landing footer (v0.28.0)
- EU cookie consent banner (v0.28.0)
- Performance: 75% bundle reduction via lazy loading, parallel quote fetching, memoized providers, Cache-Control headers (v0.22.0)

---

## 5. Legal & Compliance

### Document Status

| Document | Status |
|---|---|
| **Terms of Service** | DONE — accessible from landing page footer |
| **Privacy Policy** | DONE — GDPR-compliant, accessible from landing page footer |
| **Cookie Consent** | DONE — EU cookie consent banner implemented |
| **Financial Disclaimer** | DONE — "Not financial advice" present in the app |
| **Imprint (Impressum)** | PENDING — required if operating from Germany/Austria/Switzerland |
| **Cancellation Policy** | DONE — handled via Stripe billing portal, cancel anytime |

### GDPR Compliance

| Requirement | Status |
|---|---|
| Consent for data processing | DONE — signup flow |
| Right to access | DONE — CSV export of holdings, transactions, cash |
| Right to deletion | DONE — "Delete my account" in Profile page |
| Data portability | DONE — CSV export (Pro), JSON export planned |
| Cookie consent | DONE — EU banner implemented |
| Breach notification | PLANNED — procedure to notify within 72 hours |

### Tax Considerations

- Selling to EU consumers: **VAT** applies (varies by country: 19% DE, 21% ES, 20% FR, etc.)
- **Stripe Tax** handles this automatically — calculates and collects correct VAT by customer location
- VAT number needed if revenue exceeds thresholds (varies by country)
- Consider **VAT OSS (One-Stop Shop)** — file VAT for all EU countries in your home country

### Legal Entity

| Type | Pros | Cons |
|---|---|---|
| Sole proprietor | Fast, cheap, simple | Personal liability |
| Ltd / GmbH / SL | Limited liability, professional | Setup cost (1,000-3,000 EUR), accounting |
| Estonian e-Residency | Fully digital, EU company, low maintenance | Annual fees, some complexity |

**Recommendation:** Start as sole proprietor, incorporate when revenue exceeds ~500 EUR/month.

---

## 6. Branding & Domain

### Brand Identity

| Element | Value |
|---|---|
| **Name** | trefolio |
| **Meaning** | Inspired by the trefoil (three-leaf clover) — symbolizes growth, good fortune, and balance |
| **Tagline** | "Your portfolio. Understood." |
| **Alt taglines** | "Smart portfolio tracking for everyone" / "Track smarter, not harder" |
| **Tone** | Friendly, approachable, jargon-free — like explaining stocks to a friend |
| **Primary color** | Emerald (#10b981) — conveys growth/money/trust |
| **Secondary color** | Slate/Navy (#0f172a) — professional, fintech feel |
| **Accent** | Violet (#8b5cf6) — for premium/AI features |

### Logo Concepts

**Option A: Wordmark + Growth Arrow** (current)
- Emerald gradient square (rounded-lg) with white upward-trending arrow
- "trefolio" in Inter or DM Sans, bold, dark navy
- The arrow doubles as a chart line — symbolizes growth

**Option B: Trefoil Clover Mark**
- A stylized three-leaf clover (trefoil) with leaves forming an upward arrow
- Ties directly to the brand name — works well as favicon and app icon

**Option C: Abstract chart**
- Three bars of increasing height in emerald gradient
- Clean, universally understood

**Recommendation:** Option B — the trefoil mark ties the name to the visual identity and is distinctive. Polish it for external use.

**Logo deliverables still needed:**
- SVG for web (header, favicon)
- PNG at 512x512 for app stores / social profiles
- White-on-transparent version for dark backgrounds
- Consider using Figma or hiring on Fiverr (~30-50 EUR) for professional polish

### Domain Name Recommendations

The product was rebranded from StockTracker to **trefolio** in v0.26.1. Domain availability checked via WHOIS on March 5, 2026.

**Taken:**
- `trefolio.com` — registered via GoDaddy (proxy-protected)

**Available (verified):**

| Domain | TLD | Why It Works | GoDaddy Link |
|---|---|---|---|
| `trefolio.app` | .app | Modern, implies software, HTTPS-only by default | [Check](https://www.godaddy.com/domainsearch/find?domainToCheck=trefolio.app) |
| `trefolio.eu` | .eu | Perfect brand + EU positioning | [Check](https://www.godaddy.com/domainsearch/find?domainToCheck=trefolio.eu) |
| `trefolio.io` | .io | Modern SaaS TLD, widely recognized | [Check](https://www.godaddy.com/domainsearch/find?domainToCheck=trefolio.io) |
| `trefolio.co` | .co | Short, professional, common for startups | [Check](https://www.godaddy.com/domainsearch/find?domainToCheck=trefolio.co) |
| `trefolio.net` | .net | Classic TLD, good fallback | [Check](https://www.godaddy.com/domainsearch/find?domainToCheck=trefolio.net) |
| `trefolio.org` | .org | Available as secondary/community domain | [Check](https://www.godaddy.com/domainsearch/find?domainToCheck=trefolio.org) |

**Top 3 Recommendations:**

1. **trefolio.app** — Best overall: .app is modern, implies software, enforces HTTPS, and matches the product perfectly
2. **trefolio.eu** — Best for EU positioning: signals European identity, matches the target audience, affordable
3. **trefolio.io** — Best for developer/SaaS credibility: widely recognized in the tech community

**Strategy:** Register `trefolio.app` as the primary domain and `trefolio.eu` as a redirect. Also grab `trefolio.io` to protect the brand. Total cost: ~30-50 EUR/year for all three.

### Typography

- **Headings:** Inter Bold (already used in Tailwind defaults)
- **Body:** Inter Regular
- **Code/numbers:** JetBrains Mono or system monospace

---

## 7. Landing Page — COMPLETED

The landing page has been built in Next.js (same repo) and is deployed at the root route (`/`). Unauthenticated visitors see the landing page; authenticated users are routed to the dashboard.

### Current Sections

1. **Hero** — "Track Your Portfolio With Clarity" with gradient text, CTA buttons, dashboard screenshot
2. **Stats bar** — 5+ exchanges, 35 languages, from 2.99 EUR/mo, 25+ features
3. **Feature showcase** — Tabbed interface with screenshots for Portfolio, Dividends, AI Insights, and Import
4. **Feature grid** — 6 cards: Performance Metrics, Multi-Currency, AI Analysis, CSV Import, Price Alerts, Privacy First
5. **Video tutorial** — "See It in Action" with how-to-upload video and step-by-step guide
6. **FAQ** — 8 questions covering import, security, exchanges, pricing, performance metrics, dividends
7. **Pricing** — Free / Bifolio / Trefolio cards with feature lists, annual plan callout
8. **Competitor comparison** — Feature matrix: trefolio vs others (checkmarks for AI, multi-currency, CSV import, broker import, under $10/mo)
9. **Price comparison** — trefolio Pro at 40 EUR/year vs typical plans at 80-90 EUR/year
10. **Investor metrics** — 50M+ European investors, sub-EUR infrastructure cost, low user count to profitability
11. **CTA** — "Join investors across Europe who track their portfolios with trefolio"
12. **Footer** — Product links, Legal (Privacy Policy, Terms of Service), Resources, and social links

### Landing Page Analytics

Anonymous tracking implemented with IntersectionObserver for section views and click tracking for CTAs. Events: `landing_page_view`, `landing_cta_click`, `landing_section_view`, `landing_feature_tab`, `landing_faq_open`, `landing_pricing_view`.

---

## 8. Marketing & Advertising Plan

### Phase 0: Build in Public (Start Now, 0 EUR)

| Channel | Tactic |
|---|---|
| **Twitter/X** | Weekly dev updates, screenshots, milestones. Hashtags: #buildinpublic #indiehacker #fintech #SaaS |
| **Indie Hackers** | Post milestones, revenue updates. Reference: Wealthfolio went viral on IH by emphasizing simplicity and privacy |
| **Dev.to / Hashnode** | Technical posts: "How I built a 35-language portfolio tracker with Next.js and AI", "Scaling a solo fintech SaaS on Vercel" |
| **LinkedIn** | "Why I built trefolio" long-form post targeting European finance professionals |

### Phase 1: Free Distribution Channels (Launch Week)

| Platform | Tactic | Why |
|---|---|---|
| **Product Hunt** | Schedule Tue-Thu. Tagline: "trefolio — Track your portfolio in 35 languages from 2.99 EUR/month". 4 dark-mode screenshots, maker comment, 60s GIF | Top portfolio trackers (Snowball, Wealthfolio) got early users here |
| **Hacker News** | "Show HN: trefolio — AI portfolio tracker for European investors in 35 languages" | HN loves simple tools with clear pricing and technical depth |
| **Reddit** | Authentic posts in r/eupersonalfinance, r/investing, r/SideProject, r/selfhosted, r/degiro, r/interactivebrokers, r/trading212 | Lead with value; broker-specific subreddits are high-intent |
| **BetaList** | Submit 2-4 weeks before launch for waitlist signups | Free, curated early adopter audience |
| **SaaSHub / AlternativeTo** | List as alternative to Simply Wall St, Seeking Alpha, Portfolio Performance | Captures comparison shoppers |
| **FinTech Weekly** | Submit for newsletter inclusion | Targeted fintech audience |

### Phase 2: Content-Led Growth (Month 1-3, 0 EUR)

| Content Type | Topics | Distribution |
|---|---|---|
| **SEO blog posts** | "Best portfolio trackers for European investors 2026", "How to import your DEGIRO/IBKR/T212 portfolio", "Understanding TTWROR vs IRR" | Blog on trefolio.app, cross-post to Medium |
| **YouTube tutorials** | "Import your broker portfolio in 30 seconds" (one per broker), "AI stock analysis demo" | YouTube + embed on landing page |
| **TikTok/Reels** | 15-30s clips: before/after import, AI analysis demo, "5 EUR vs 20 USD" competitor comparison | TikTok, Instagram Reels, YouTube Shorts |
| **LinkedIn articles** | "Why I built a portfolio tracker from 2.99 EUR/month", "35 languages for 50M+ European investors" | LinkedIn + European finance groups |
| **Localized content** | Blog posts in German, French, Spanish, Dutch, Italian targeting local-language search | SEO in local-language results |

### Phase 3: Paid Advertising (Month 3+, 100-300 EUR/month budget)

| Platform | Strategy | Budget | Expected CPA |
|---|---|---|---|
| **Google Ads** | Target: "portfolio tracker", "DEGIRO portfolio tracker", "Interactive Brokers portfolio tool", "best free portfolio tracker Europe" | 50-100 EUR/mo | 3-8 EUR/signup |
| **Reddit Ads** | Target r/eupersonalfinance, r/investing, r/degiro, r/interactivebrokers with native-style ads | 30-50 EUR/mo | 4-10 EUR/signup |
| **Twitter/X Ads** | Promote feature tweets to finance interest audiences across EU | 30-50 EUR/mo | 3-6 EUR/signup |
| **Google Ads (localized)** | German, French, Spanish, Dutch campaigns targeting local-language keywords | 30-50 EUR/mo | Test per market |
| **Fintech ad networks** | PropellerAds, Blockchain-Ads for targeted fintech audiences | 20-50 EUR/mo | Test and iterate |

### Phase 4: Growth Loops (Month 6+)

- **Referral program:** "Invite a friend, both get 1 month Pro free" — viral coefficient target: 0.3
- **Affiliate program:** 30% recurring commission for finance bloggers (~1.50 EUR/user/month)
- **Email drip sequence:** 5-email onboarding series (import guide, AI demo, Pro value, testimonial, upgrade prompt) — sent in the user's language
- **Community:** Discord or Telegram group for power users, feature voting, beta access
- **Partnerships:** European finance newsletters, broker user communities (DEGIRO, IBKR, T212, Revolut), expat forums
- **Localization partnerships:** Partner with finance content creators in Germany, France, Netherlands, Spain, Italy for local-language promotion

### Creative Campaign Ideas

1. **"The 3 EUR Challenge"** — Social campaign: "What do you get for 2.99 EUR/month? trefolio vs Seeking Alpha ($20) vs Simply Wall St ($10)". Visual comparison cards for Twitter/Instagram.
2. **"My Portfolio in 30 Seconds"** — UGC campaign: screen-record your first import. Each supported broker gets its own challenge. Prize: 1 year Pro free.
3. **"AI Explains Your Stocks"** — Short video series: AI analysis of popular European stocks (ASML, SAP, Inditex, Nestle, LVMH) in plain language. One per language market.
4. **"Expat Investor Spotlight"** — Blog/video series: expats managing multi-currency portfolios with trefolio.
5. **"trefolio in Your Language"** — 35 community members record 5-second clips saying "I track my portfolio with trefolio" in their native language. Stitch into a single viral video.
6. **"Switch from [Broker] in 30 Seconds"** — Broker-specific content: "How to go from DEGIRO CSV to a full dashboard in under a minute". One video per broker.

### Key Metrics to Track

| Metric | Target (Month 1) | Target (Month 6) |
|---|---|---|
| Landing page visitors | 1,000 | 5,000/month |
| Signups (free) | 100 | 500 |
| Conversion to Pro | 10% | 8-12% |
| Paying users | 10 | 50-60 |
| Monthly revenue | 50 EUR | 275 EUR |
| Churn rate | — | < 5%/month |

### Content Calendar (First Month)

| Week | Content |
|---|---|
| 1 | Launch on Product Hunt / HN / Reddit + demo video |
| 2 | Blog: "Why most portfolio trackers fail beginners" |
| 3 | Blog: "How AI can explain your stocks in plain language" + YouTube tutorial per broker |
| 4 | Blog: "Understanding economic indicators without a finance degree" + localized posts (DE, FR, ES) |

---

## 9. Launch Checklist

### Technical — COMPLETED

- [x] Email field + verification flow (Resend)
- [x] Stripe integration (checkout + webhooks + portal + sync + capacity)
- [x] Feature gating (free vs pro) via `canAccessFeature()` + 8 upsell surfaces
- [x] AI call counting (5/month free, 30/day pro, 5 imports/day)
- [x] Rate limiting via Upstash Redis (AV, AI, imports)
- [x] "Delete my account" feature (GDPR)
- [x] CSV export for holdings, transactions, cash (Pro)
- [x] Shared Alpha Vantage API key (admin-managed)
- [x] Landing page redesigned and deployed at root (`/`)
- [x] Price alerts with email delivery + cron
- [x] Admin feature flags (alerts, CSV export)
- [x] Grafana Cloud observability
- [x] Pre-deploy test suite (unit + E2E)
- [x] Multi-broker import (DEGIRO, IBKR, Trading 212, Revolut)
- [x] 35-language support
- [x] Performance optimizations (75% bundle reduction)
- [x] AI hallucination safeguards
- [x] Holdings auto-classification by sector/region/asset class
- [ ] Security headers in `next.config.mjs` (CSP, X-Frame-Options, HSTS)
- [ ] CSRF protection upgrade (SameSite=Strict + CSRF tokens)

### Legal — MOSTLY COMPLETED

- [x] Terms of Service (accessible from landing footer)
- [x] Privacy Policy (GDPR-compliant, accessible from landing footer)
- [x] EU cookie consent banner
- [x] Financial disclaimer
- [ ] Imprint page (if required by jurisdiction)
- [ ] Stripe Tax enabled for EU VAT collection
- [ ] VAT registration (if needed in your country)

### Branding — PARTIALLY COMPLETED

- [x] Product rebranded to trefolio (v0.26.1)
- [x] Logo and icon updated in app
- [ ] Logo finalized for external use (SVG + PNG, multiple sizes)
- [ ] Favicon verified for trefolio brand
- [ ] Open Graph images for social sharing
- [ ] Demo video recorded with new branding

### Marketing — REMAINING

- [ ] Domain purchased (trefolio.app recommended)
- [ ] DNS setup + SSL configuration
- [ ] Product Hunt listing prepared
- [ ] Reddit posts drafted
- [ ] HN "Show HN" post drafted
- [ ] Twitter/X account created
- [ ] Blog post written
- [ ] Localized marketing content (DE, FR, ES, NL, IT)

### Infrastructure — REMAINING

- [ ] Production Stripe products (verify not still in test mode)
- [ ] Increase `MAX_PRO_SUBSCRIBERS` cap when ready for more users
- [ ] Set up monitoring alerts in Grafana for critical thresholds

---

## 10. Decision Points

| # | Decision | Status |
|---|---|---|
| 1 | **Product name** | DECIDED: **trefolio** (v0.26.1) |
| 2 | **Domain name** | trefolio.app, .eu, .io all AVAILABLE — see Section 6 |
| 3 | **Legal entity** | Still pending — recommend sole proprietor to start |
| 4 | **Email provider** | DECIDED: **Resend** (implemented, admin-managed key) |
| 5 | **Free tier AI limit** | DECIDED: **5/month** (implemented) |
| 6 | **Shared AV key** | DECIDED: **Platform key** (admin-managed, encrypted) |
| 7 | **Open source** | Still pending — recommend private for commercial, self-hosted license later |
| 8 | **Annual plan** | DECIDED: **From day one** — Bifolio 23.99 EUR/year (save 33%), Trefolio 59.99 EUR/year (save 37%) |
| 9 | **Landing page** | DECIDED: **Same repo** — root `/` route, professionally redesigned |
| 10 | **Logo** | Partially done — rebranded in app, needs external-use assets |
| 11 | **Country of operation** | Still pending — affects VAT, Imprint, legal entity |
| 12 | **Contact email** | Still pending — need domain first (e.g., support@trefolio.app) |
| 13 | **Analytics** | DECIDED: **Vercel Analytics + internal event tracking** (implemented) |
| 14 | **Pricing** | DECIDED: **3-tier: Bifolio 2.99-3.99 EUR/month, Trefolio 7.99-9.99 EUR/month** (v0.27.0, updated v1.9.0) |
| 15 | **Free tier limits** | DECIDED: **15 holdings, 2 alerts, 5 AI/month** (v0.27.0) |
| 16 | **Languages** | DECIDED: **35 European languages** (v0.29.0) |
| 17 | **Legal documents** | DECIDED: **Privacy Policy + Terms of Service live** (v0.28.0) |

**Remaining decisions that need your input:**
- Domain name (recommend trefolio.app)
- Legal entity (sole proprietor vs Ltd/GmbH/SL)
- Country of operation (affects VAT + Imprint)
- Contact email (once domain is purchased)
- Open source vs private

---

## 11. Revenue Projections

Revenue per user after Stripe fees: Bifolio ~2.70 EUR/month, Trefolio ~7.62 EUR/month. Blended average depends on tier mix.

| Month | Free Users | Bifolio | Trefolio | MRR (EUR) | Costs (EUR) | Profit (EUR) |
|---|---|---|---|---|---|---|
| 1 | 80 | 5 | 3 | 39 | 85 | -46 |
| 3 | 200 | 15 | 10 | 125 | 100 | 25 |
| 6 | 500 | 30 | 25 | 290 | 130 | 160 |
| 12 | 1,200 | 80 | 60 | 718 | 180 | 538 |
| 24 | 3,000 | 200 | 150 | 1,737 | 300 | 1,437 |

*Assumes 8-12% free-to-paid conversion (60% Bifolio / 40% Trefolio), 4% monthly churn, organic growth.*
*Costs include: Vercel Pro (~20 EUR), Turso (~10 EUR), AV Premium ($50 ≈ 46 EUR), Upstash Redis (~5 EUR), SnapTrade ($2/Trefolio user), Resend (~0 EUR on free tier), Stripe fees (~5-10% of revenue).*

**Breakeven point:** ~18 paying users (covers fixed infrastructure at ~65 EUR/month).
**Profitability target:** 50 paying users = ~160 EUR/month net profit.

---

## Next Steps (Priority Order)

1. **Purchase domain** — trefolio.app (primary) + trefolio.eu (redirect) + trefolio.io (brand protection)
2. **Decide legal entity and country of operation** — affects VAT, Imprint, contact email
3. **Verify Stripe is in production mode** — test vs live keys
4. **Increase MAX_PRO_SUBSCRIBERS** — raise cap from 10 when ready for public launch
5. **Add security headers** — CSP, X-Frame-Options, HSTS in next.config.mjs
6. **Finalize logo for external use** — SVG, PNG, Open Graph images
7. **Record demo video** — with trefolio branding
8. **Prepare launch materials** — Product Hunt listing, HN post, Reddit posts, blog post
9. **Create social accounts** — Twitter/X, LinkedIn, Indie Hackers
10. **Launch** — Product Hunt / HN / Reddit in the same week for maximum impact

---

*This plan is a living document. Last updated: March 2026 (v0.29.0).*
