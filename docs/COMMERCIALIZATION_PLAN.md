# trefolio — Commercialization Plan

> **Version:** 1.0 — March 2026
> **Price:** 2 EUR/month (Pro plan) | Free tier available
> **Target launch:** Q2 2026

---

## Table of Contents

1. [Product Vision & Positioning](#1-product-vision--positioning)
2. [Tier Structure & Pricing](#2-tier-structure--pricing)
3. [Technical Roadmap](#3-technical-roadmap)
   - 3.1 Email Verification & Registration Flow
   - 3.2 Payment Integration (Stripe)
   - 3.3 Subscription Management
   - 3.4 Data Encryption & Security
   - 3.5 Infrastructure & Scaling
4. [Legal & Compliance](#4-legal--compliance)
5. [Branding & Logo](#5-branding--logo)
6. [Landing Page](#6-landing-page)
7. [Marketing Plan](#7-marketing-plan)
8. [Launch Checklist](#8-launch-checklist)
9. [Decision Points (Needs Your Input)](#9-decision-points)

---

## 1. Product Vision & Positioning

### One-liner

**trefolio** — The simplest way to track your stock portfolio with AI-powered insights, for just 2 EUR/month.

### Why trefolio?

| Pain point | How trefolio solves it |
|---|---|
| Most portfolio trackers are complex, designed for traders | Simple UI for people who just want to track long-term holdings |
| Free tools lack fundamentals and AI analysis | Pro tier includes company fundamentals, economic indicators, and AI explanations in plain language |
| Multi-currency portfolios are messy | Automatic currency conversion, multi-exchange support (LSE, XETRA, MAD, NYSE, etc.) |
| Data privacy concerns with big platforms | Self-hostable option; all data encrypted at rest; no selling of user data |
| English-only tools | English + Spanish (expandable to German, French, etc.) |

### Target Audience

- **Primary:** Beginner-to-intermediate retail investors in Europe who hold 5-50 stocks/ETFs
- **Secondary:** Expats with multi-currency portfolios
- **Tertiary:** Spanish-speaking investors (Latin America, Spain)

### Competitive Landscape

| Competitor | Price | Weakness trefolio exploits |
|---|---|---|
| Yahoo Finance | Free | No AI, cluttered UI, no multi-currency portfolio |
| Seeking Alpha | 19.99 USD/mo | Expensive, US-focused, complex |
| Simply Wall St | 10 USD/mo | Expensive for casual investors |
| Portfolio Performance | Free (desktop) | No web/mobile, no AI, steep learning curve |
| **trefolio** | **2 EUR/mo** | Simple, AI-powered, cheap, multi-language, web-based |

---

## 2. Tier Structure & Pricing

### Free Tier

| Feature | Included |
|---|---|
| Portfolio tracking (unlimited stocks/ETFs) | Yes |
| Yahoo Finance data | Yes |
| Historical charts | Yes |
| Cash balance tracking | Yes |
| Benchmark comparison (S&P 500, etc.) | Yes |
| Dark/Light mode | Yes |
| English + Spanish | Yes |
| **AI analysis** | **5 calls/month** |
| **Alpha Vantage data** | No |
| **Fundamentals (Income, Balance, Cash Flow)** | No |
| **Intelligence (News, Insider, Institutional)** | No |
| **Economic Indicators** | No |

### Pro Tier — 2 EUR/month

Everything in Free, plus:

| Feature | Included |
|---|---|
| Alpha Vantage real-time data | Yes |
| Company fundamentals | Yes |
| Stock Intelligence (news sentiment, insider trades, institutional holdings) | Yes |
| Economic Indicators dashboard | Yes |
| AI analysis | **Unlimited** |
| Priority support | Yes |
| Export to CSV | Yes |

### Why 2 EUR/month?

- Below the "impulse buy" threshold — most people won't think twice
- Covers Alpha Vantage API costs (~$0 per user on their free tier, but AV's premium tiers can be shared across users)
- Covers OpenAI API costs (~0.10-0.30 EUR/user/month at typical usage)
- At 500 paying users = 1,000 EUR/month = covers all infrastructure + profit
- At 2,000 users = sustainable small SaaS business

### Future Pricing Options

- **Annual plan:** 20 EUR/year (save 17%) — incentivizes commitment
- **Family plan:** 5 EUR/month for up to 3 accounts
- **Self-hosted license:** One-time 49 EUR for Docker image with all Pro features

---

## 3. Technical Roadmap

### 3.1 Email Verification & Registration Flow

**Current state:** Open signup with username/password, no email.

**Target state:**

```
[Sign Up Form]
  → email + password + (optional) name
  → Server creates user with status="pending"
  → Send verification email with a signed token (valid 24h)
  → User clicks link → status="verified"
  → Can now log in
```

**Implementation:**

| Component | Technology | Notes |
|---|---|---|
| Email field | Add `email` column to `users` table | Unique, required |
| Email sending | **Resend** (resend.com) | Free tier: 3,000 emails/month, great DX, works on Edge |
| Verification token | JWT signed with `APP_SESSION_SECRET` | Contains userId, expires in 24h |
| Email templates | React Email (from Resend) | Branded HTML emails |
| Rate limiting | In-memory or Redis | Prevent abuse of signup/email endpoints |

**Alternative email providers:**
- SendGrid (free: 100/day)
- AWS SES (cheapest at scale)
- Postmark (great deliverability)

**Recommendation:** Resend — simplest integration, free tier is generous, built for Next.js.

**Password reset flow:**
```
[Forgot Password]
  → Enter email
  → Server sends reset link (signed JWT, valid 1h)
  → User clicks link → enters new password
  → Password updated, all sessions invalidated
```

### 3.2 Payment Integration (Stripe)

**Why Stripe:**
- Native EUR support
- Stripe Checkout = no PCI compliance burden
- Built-in subscription management, invoicing, tax collection
- Webhook-based — works with serverless (Vercel)

**Flow:**

```
[User clicks "Upgrade to Pro"]
  → Redirect to Stripe Checkout (hosted page)
  → User pays 2 EUR/month
  → Stripe sends webhook → server updates user.plan = "pro"
  → User redirected back with Pro features unlocked

[User cancels]
  → Stripe webhook → server sets user.plan = "free" at period end
  → Pro features degrade gracefully (no data loss)
```

**Database changes:**

```sql
ALTER TABLE users ADD COLUMN email TEXT UNIQUE;
ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN plan TEXT DEFAULT 'free';        -- 'free' | 'pro'
ALTER TABLE users ADD COLUMN stripe_customer_id TEXT;
ALTER TABLE users ADD COLUMN stripe_subscription_id TEXT;
ALTER TABLE users ADD COLUMN plan_expires_at TEXT;            -- ISO date
ALTER TABLE users ADD COLUMN ai_calls_this_month INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN ai_calls_reset_at TEXT;
```

**New API routes:**

| Route | Purpose |
|---|---|
| `POST /api/billing/checkout` | Creates Stripe Checkout session |
| `POST /api/billing/webhook` | Handles Stripe webhooks (subscription created/updated/canceled) |
| `GET /api/billing/portal` | Redirects to Stripe Customer Portal (manage subscription) |
| `POST /api/auth/verify-email` | Verifies email token |
| `POST /api/auth/forgot-password` | Sends password reset email |
| `POST /api/auth/reset-password` | Resets password with token |

**Stripe setup steps:**
1. Create Stripe account at stripe.com
2. Create a Product ("trefolio Pro") with a Price (2 EUR/month, recurring)
3. Set up webhook endpoint pointing to `/api/billing/webhook`
4. Store `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` in env vars

**Cost:** Stripe takes 1.5% + 0.25 EUR per transaction in Europe = ~0.28 EUR per 2 EUR payment = 14% fee. Net revenue per user: ~1.72 EUR/month.

### 3.3 Subscription Management

**Feature gating logic:**

```typescript
// In settings context or middleware
function canAccessFeature(user: User, feature: string): boolean {
  const FREE_FEATURES = ["yahoo", "charts", "cash", "benchmarks"];
  const PRO_FEATURES = ["alphavantage", "fundamentals", "intelligence", "economic-indicators"];

  if (FREE_FEATURES.includes(feature)) return true;
  if (PRO_FEATURES.includes(feature)) return user.plan === "pro";

  // AI: free users get 5/month, pro gets unlimited
  if (feature === "ai") {
    if (user.plan === "pro") return true;
    return user.aiCallsThisMonth < 5;
  }
  return false;
}
```

**Graceful degradation:** When a Pro user's subscription lapses:
- They keep all their data (holdings, cash, settings)
- Yahoo data continues working
- Pro features show an "Upgrade to Pro" prompt instead of data
- No data is deleted

### 3.4 Data Encryption & Security

**Current state (already implemented):**

| Layer | Status |
|---|---|
| Passwords hashed with bcrypt | Done |
| JWT sessions in httpOnly cookies | Done |
| Alpha Vantage API key encrypted with AES-256-GCM | Done |
| HTTPS enforced on Vercel | Done |
| Middleware route protection | Done |

**Additional for commercial launch:**

| Measure | Implementation |
|---|---|
| Database encryption at rest | Turso encrypts at rest by default (libSQL on Fly.io) |
| Email encryption | Store emails hashed for lookup + encrypted for display |
| CSRF protection | Add `SameSite=Strict` to cookies (already `Lax`), add CSRF token to mutation routes |
| Rate limiting | Implement per-IP and per-user rate limiting on auth/API routes |
| Input sanitization | Already handled by parameterized queries, add explicit validation |
| Security headers | Add `Content-Security-Policy`, `X-Frame-Options`, `Strict-Transport-Security` via `next.config.mjs` |
| Dependency auditing | Add `npm audit` to CI pipeline |
| 2FA (future) | TOTP-based (Google Authenticator) — nice-to-have for v2 |

**Privacy messaging for marketing:**
- "Your data never leaves your encrypted database"
- "We don't sell your data — ever"
- "Bank-grade AES-256 encryption for sensitive data"
- "Open-source: audit our code yourself"

### 3.5 Infrastructure & Scaling

| Users | Infrastructure | Monthly Cost |
|---|---|---|
| 0-500 | Vercel Free/Pro + Turso Free | 0-20 EUR |
| 500-2,000 | Vercel Pro + Turso Scaler | ~50 EUR |
| 2,000-10,000 | Vercel Pro + Turso Scaler + Redis (Upstash) | ~100 EUR |
| 10,000+ | Consider dedicated hosting or Vercel Enterprise | ~300+ EUR |

**Alpha Vantage API strategy:**
- Free AV key: 25 calls/day — not viable for multi-user
- Premium AV key ($49.99/mo): 75 calls/min — serves ~100-200 active users
- At scale: Cache aggressively (economic indicators change monthly/quarterly, fundamentals quarterly)
- Consider a shared AV key model: the platform holds one premium key, users don't need their own

---

## 4. Legal & Compliance

### Required Documents

| Document | Purpose |
|---|---|
| **Terms of Service** | Liability limitation, acceptable use, subscription terms |
| **Privacy Policy** | GDPR-required: what data you collect, how you process it, retention periods |
| **Cookie Policy** | Required in EU — explain httpOnly session cookies |
| **Financial Disclaimer** | "Not financial advice" — critical for any investment-related tool |
| **Imprint (Impressum)** | Required in Germany/Austria/Switzerland if operating from there |
| **Cancellation Policy** | EU consumers have right to cancel subscriptions |

### GDPR Compliance

Since pricing is in EUR and the audience is European, GDPR applies regardless of where the server is located.

**Key requirements:**

| Requirement | Implementation |
|---|---|
| Consent for data processing | Checkbox on signup: "I agree to the Terms and Privacy Policy" |
| Right to access | Add "Download my data" button in settings (export JSON) |
| Right to deletion | Add "Delete my account" button — deletes all user data |
| Data portability | CSV/JSON export of holdings and settings |
| Data processing agreement | If using Turso/Vercel/Stripe, they act as data processors — check their DPAs |
| Cookie consent | Minimal: only essential cookies (session) — no analytics cookies = no banner needed |
| Breach notification | Procedure to notify users within 72 hours if data is compromised |

### Tax Considerations

- Selling to EU consumers: you must charge **VAT** (varies by country: 19% DE, 21% ES, 20% FR, etc.)
- **Stripe Tax** handles this automatically — calculates and collects the correct VAT based on customer location
- You'll need a VAT number if revenue exceeds thresholds (varies by country)
- Consider registering for **VAT OSS (One-Stop Shop)** — file VAT for all EU countries in your home country

### Legal Entity

**Options:**

| Type | Pros | Cons |
|---|---|---|
| Sole proprietor | Fast, cheap, simple | Personal liability |
| Ltd / GmbH / SL | Limited liability, professional | Setup cost (1,000-3,000 EUR), accounting |
| Estonian e-Residency | Fully digital, EU company, low maintenance | Annual fees, some complexity |

**Recommendation:** Start as sole proprietor, incorporate when revenue exceeds ~500 EUR/month.

---

## 5. Branding & Logo

### Brand Identity

| Element | Value |
|---|---|
| **Name** | trefolio (trefolio.com) |
| **Tagline** | "Your portfolio. Understood." |
| **Alt taglines** | "Smart portfolio tracking for everyone" / "Track smarter, not harder" |
| **Tone** | Friendly, approachable, jargon-free — like explaining stocks to a friend |
| **Primary color** | Emerald (#10b981) — already in the app, conveys growth/money/trust |
| **Secondary color** | Slate/Navy (#0f172a) — professional, fintech feel |
| **Accent** | Violet (#8b5cf6) — for premium/AI features |

### Logo Concept

**Option A: Wordmark + Growth Arrow**
```
  ↗
trefolio
```
The current app already has this: a rounded square with a growth arrow icon. Formalize it:
- Emerald gradient square (rounded-lg) with white upward-trending arrow
- "trefolio" in Inter or DM Sans, bold, dark navy
- The arrow doubles as a chart line — symbolizes growth

**Option B: Trefoil Clover Mark**
- A stylized three-leaf clover (trefoil) with leaves forming an upward arrow
- Works well as favicon and app icon — ties directly to the brand name

**Option C: Abstract chart**
- Three bars of increasing height (like a bar chart) in emerald gradient
- Clean, universally understood

**Recommendation:** Option A — it's already in the app and recognizable. Just polish it for marketing materials.

**Logo deliverables needed:**
- SVG for web (header, favicon)
- PNG at 512x512 for app stores / social profiles
- White-on-transparent version for dark backgrounds
- Consider using Figma or hiring on Fiverr (~20-50 EUR) for professional polish

### Typography

- **Headings:** Inter Bold (already used in Tailwind defaults)
- **Body:** Inter Regular
- **Code/numbers:** JetBrains Mono or system monospace

---

## 6. Landing Page

### Structure

A single-page marketing site at the root domain (e.g., `trefolio.com`), separate from the app (`app.trefolio.com`).

**Sections:**

1. **Hero**
   - Headline: "Track your stocks. Understand your portfolio."
   - Subheadline: "AI-powered insights, real-time data, and clean design — for just 2 EUR/month."
   - CTA: "Start Free" → signup
   - Screenshot/mockup of the dashboard (dark mode looks best for fintech)

2. **Problem/Solution**
   - "Most portfolio trackers are built for traders. trefolio is built for you."
   - Three pain points with icons → how trefolio solves them

3. **Feature Showcase** (with screenshots)
   - Portfolio dashboard
   - AI analysis ("AI explains your stocks in plain language")
   - Economic indicators
   - Stock intelligence
   - Dark mode
   - Multi-language

4. **Pricing**
   - Two cards: Free vs Pro (2 EUR/month)
   - Feature comparison table
   - "No credit card required for Free tier"

5. **Security & Privacy**
   - "Bank-grade encryption"
   - "Your data stays yours"
   - "Open-source" (if applicable)
   - GDPR badge

6. **Testimonials / Social Proof** (add after launch)
   - Early user quotes
   - "Trusted by X investors across Europe"

7. **FAQ**
   - "Is my data safe?"
   - "Can I cancel anytime?"
   - "What happens if I cancel Pro?"
   - "Is this financial advice?" → "No."

8. **Footer**
   - Links: Terms, Privacy, Imprint, Contact
   - Social links
   - "Made in [your country] with emerald green"

### Tech for Landing Page

**Option A:** Build in Next.js (same repo, separate route group)
**Option B:** Use a landing page builder (Framer, Carrd, or Webflow)
**Recommendation:** Build in Next.js — keeps everything in one codebase, SEO-friendly, fast.

---

## 7. Marketing Plan

### Phase 1: Pre-Launch (4-6 weeks before)

| Action | Channel | Cost |
|---|---|---|
| Create landing page with email waitlist | Website | 0 EUR |
| Post on Reddit (r/investing, r/eupersonalfinance, r/stocks, r/SideProject) | Reddit | 0 EUR |
| Post on Hacker News ("Show HN: I built a portfolio tracker for 2 EUR/month") | HN | 0 EUR |
| Product Hunt launch preparation | Product Hunt | 0 EUR |
| Create Twitter/X account, post dev journey | Twitter/X | 0 EUR |
| Write a blog post: "Why I built trefolio" | Blog/Medium/Dev.to | 0 EUR |
| Create short demo video (screen recording + voiceover) | YouTube/Twitter | 0 EUR |

### Phase 2: Launch Week

| Action | Channel | Cost |
|---|---|---|
| Launch on Product Hunt | Product Hunt | 0 EUR |
| Post on all subreddits above | Reddit | 0 EUR |
| Submit to HN | Hacker News | 0 EUR |
| Post demo video | Twitter, YouTube, LinkedIn | 0 EUR |
| Reach out to finance/tech bloggers | Email | 0 EUR |
| Post in Facebook investing groups | Facebook | 0 EUR |
| Submit to SaaS directories (BetaList, SaaSHub, AlternativeTo) | Directories | 0 EUR |

### Phase 3: Growth (ongoing)

| Strategy | Details | Cost |
|---|---|---|
| **SEO content** | Blog posts: "Best portfolio trackers 2026", "How to track European stocks", "Understanding P/E ratio" | 0 EUR (time) |
| **Referral program** | "Invite a friend → both get 1 month free" | Cost of 1 month free |
| **Twitter/X presence** | Daily market commentary, feature announcements, tips | 0 EUR |
| **YouTube tutorials** | "How to set up trefolio", "Understanding your portfolio with AI" | 0 EUR |
| **Google Ads** (optional) | Target: "stock portfolio tracker", "best free portfolio tracker Europe" | 50-100 EUR/month |
| **Affiliate program** (future) | Finance bloggers get 30% recurring commission | 0.60 EUR/user/month |
| **Partnerships** | Partner with investment communities, forums, newsletters | 0 EUR |

### Key Metrics to Track

| Metric | Target (Month 1) | Target (Month 6) |
|---|---|---|
| Landing page visitors | 1,000 | 5,000/month |
| Signups (free) | 100 | 500 |
| Conversion to Pro | 10% | 8-12% |
| Paying users | 10 | 50-60 |
| Monthly revenue | 20 EUR | 100-120 EUR |
| Churn rate | — | < 5%/month |

### Content Calendar (First Month)

| Week | Content |
|---|---|
| 1 | Launch post on HN/Reddit/PH + demo video |
| 2 | Blog: "Why most portfolio trackers fail beginners" |
| 3 | Blog: "How AI can explain your stocks in plain language" |
| 4 | Blog: "Understanding economic indicators without a finance degree" |

---

## 8. Launch Checklist

### Technical

- [ ] Email field added to registration
- [ ] Email verification flow (Resend)
- [ ] Forgot password / reset password flow
- [ ] Stripe integration (checkout + webhooks + portal)
- [ ] Feature gating (free vs pro) in middleware and components
- [ ] AI call counting (5/month for free tier)
- [ ] Security headers in `next.config.mjs`
- [ ] Rate limiting on auth and API routes
- [ ] "Delete my account" feature (GDPR)
- [ ] "Export my data" feature (GDPR)
- [ ] Shared Alpha Vantage API key (platform-level, not per-user for Pro)
- [ ] Landing page built and deployed

### Legal

- [ ] Terms of Service written
- [ ] Privacy Policy written (GDPR-compliant)
- [ ] Financial disclaimer on every page
- [ ] Cookie policy (minimal — session cookies only)
- [ ] Imprint page (if required in your jurisdiction)
- [ ] Stripe Tax enabled for EU VAT collection
- [ ] VAT registration (if needed in your country)

### Branding

- [ ] Logo finalized (SVG + PNG)
- [ ] Favicon updated
- [ ] Open Graph images for social sharing
- [ ] App screenshots for landing page (light + dark mode)
- [ ] Demo video recorded

### Marketing

- [ ] Landing page live
- [ ] Product Hunt listing prepared
- [ ] Reddit posts drafted
- [ ] HN "Show HN" post drafted
- [ ] Twitter/X account created and first posts scheduled
- [ ] Blog post written

---

## 9. Decision Points

These need your input before implementation:

| # | Question | Options | My Recommendation |
|---|---|---|---|
| 1 | **Domain name** | trefolio.com (REGISTERED), trefolio.io, trefolio.app | `trefolio.com` — registered March 2026 |
| 2 | **Legal entity** | Sole proprietor, Ltd/GmbH/SL, Estonian e-Residency? | Start as sole proprietor |
| 3 | **Email provider** | Resend, SendGrid, AWS SES? | Resend (best DX for Next.js) |
| 4 | **Free tier AI limit** | 5/month, 10/month, or 3/month? | 5/month — enough to hook users |
| 5 | **Shared AV key** | Platform holds one AV Premium key, or users bring their own? | Platform key for Pro users — simpler UX |
| 6 | **Open source?** | Keep the repo public, or make it private? | Private for commercial — offer self-hosted license separately |
| 7 | **Annual plan** | 20 EUR/year (17% off) from day one, or add later? | From day one — increases LTV |
| 8 | **Landing page** | Same Next.js repo, or separate (Framer/Carrd)? | Same repo (route group `/marketing`) |
| 9 | **Logo** | DIY, AI-generated, or hire designer? | Start with polished version of current icon; hire on Fiverr later (~30 EUR) |
| 10 | **Country of operation** | Where are you based? (Affects VAT, Imprint, legal) | Need your input |
| 11 | **Contact email** | support@trefolio.com or personal? | Dedicated domain email |
| 12 | **Analytics** | None, Plausible (privacy-friendly), or Vercel Analytics? | Plausible — no cookie banner needed, GDPR-friendly |

---

## Revenue Projections

| Month | Free Users | Pro Users | MRR (EUR) | Costs (EUR) | Profit (EUR) |
|---|---|---|---|---|---|
| 1 | 80 | 8 | 16 | 20 | -4 |
| 3 | 200 | 25 | 50 | 30 | 20 |
| 6 | 500 | 55 | 110 | 50 | 60 |
| 12 | 1,200 | 140 | 280 | 80 | 200 |
| 24 | 3,000 | 350 | 700 | 150 | 550 |

*Assumes 8-12% free-to-pro conversion, 4% monthly churn, organic growth.*
*Costs include: Vercel Pro (~20 EUR), Turso (~10 EUR), AV Premium ($50 ≈ 46 EUR), Resend (~0 EUR on free tier), Stripe fees (~14% of revenue).*

---

## Next Steps (Priority Order)

1. **Answer the 12 decision points above** — I need these to start implementation
2. **Email + verification** — Foundation for everything else
3. **Stripe integration** — Revenue from day one
4. **Feature gating** — Enforce free vs pro boundaries
5. **Legal documents** — Terms, Privacy, Disclaimer
6. **Landing page** — Start collecting signups
7. **Logo polish** — Professional first impression
8. **Launch on Product Hunt / HN / Reddit** — Free distribution

---

*This plan is a living document. Update it as decisions are made and features are implemented.*
