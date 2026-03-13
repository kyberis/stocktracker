# trefolio

**Your portfolio. Understood.**

A modern, AI-powered stock portfolio tracker built for European investors. Track holdings across multiple exchanges and 21 currencies, get EU-specific tax reports, discover stocks with the screener, track your full net worth, and receive AI analysis in 35 European languages — all in a clean, fast interface with 4 dashboard themes.

## Why trefolio?

- **Built for European investors.** EU tax reports for Germany, France, Spain, Netherlands, and Italy. AI Tax Assistant with country-specific optimization.
- **AI that explains, not confuses.** Plain-language analysis of any company's financials, market intelligence, or your tax report. In your language.
- **Multi-currency, multi-exchange.** 21 currencies, NYSE to XETRA to LSE. Automatic FX conversion with impact tracking.
- **From €2.99/month.** Cheaper than a coffee. Trefolio at €7.99/month includes tax reports, screener, net worth, and unlimited AI.
- **Your data stays yours.** GDPR-compliant, built in Portugal. No tracking, no selling your data. Ever.

## Features

### Free Tier (Folio)

- Portfolio dashboard with real-time quotes (Yahoo Finance)
- Historical price charts with multiple time ranges
- Cash balance tracking with 21-currency support
- Benchmark comparison (S&P 500, Nasdaq, Dow Jones, Euro Stoxx 50)
- 14 broker CSV import formats + AI Import
- Portfolio growth projection
- Earnings calendar for your holdings
- Guided onboarding wizard
- Dark & light mode
- 35 European languages
- 5 AI analysis calls/month
- 2 price alerts (in-app)

### Bifolio — €2.99/month

Everything in Free, plus:

- Up to 50 holdings
- 20 AI analysis calls/month
- 10 price alerts + email & push notifications
- Full portfolio growth history (all time)
- Advanced metrics (Sharpe Ratio, Max Drawdown, Volatility)
- Portfolio sharing (public link)
- CSV export of holdings & transactions
- 1 SnapTrade broker sync connection with auto-sync
- Canvas dashboard theme
- Full market earnings + economic events calendar
- Net worth tracking (manual assets)

### Trefolio — €7.99/month

Everything in Bifolio, plus:

- **Unlimited holdings**
- **Unlimited AI analysis**
- **EU tax reports** for Germany, France, Spain, Netherlands, Italy
- **AI Tax Assistant** with optimization suggestions
- **Stock screener** (600+ stocks, 6 filters, 5 preset strategies)
- Company fundamentals (income, balance, cash flow)
- Stock intelligence (news sentiment, insider trades)
- Economic indicators dashboard
- All 4 dashboard themes (Default, Canvas, Terminal, Studio)
- Unlimited SnapTrade broker sync connections
- IPO calendar
- Up to 3 portfolios
- Unlimited price alerts + all notification channels
- trefolio Leaf device support
- Priority support

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS (4 themes, light/dark) |
| Database | Turso (libSQL) |
| Auth | bcrypt + jose (JWT), Google/Apple OAuth, Passkeys |
| Encryption | AES-256-GCM for sensitive data at rest |
| Charts | Recharts |
| AI | OpenAI GPT |
| Market data | Yahoo Finance, Alpha Vantage (Pro) |
| Broker sync | SnapTrade (20+ brokerages) |
| Payments | Stripe |
| Email | Resend (transactional) |
| Mobile | PWA + Capacitor (iOS, Android) |
| Hosting | Vercel (serverless) |

## Getting Started (Local Development)

### Prerequisites

- **Node.js** >= 20
- **npm** (comes with Node)

### Quick Start

```bash
git clone https://github.com/kyberis/trefolio.git
cd trefolio
npm install
npm run dev
```

Open http://localhost:3000. No extra configuration needed — a local SQLite file is created automatically.

### Default Admin Account

| Username | Password |
|---|---|
| `admin` | `admin` |

You'll be prompted to change the password on first login.

## Environment Variables

Copy the example file:

```bash
cp .env.local.example .env.local
```

| Variable | Required | Description |
|---|---|---|
| `TREFOLIO_TURSO_DATABASE_URL` | Production | Turso database URL (`libsql://...`) |
| `TREFOLIO_TURSO_AUTH_TOKEN` | Production | Turso auth token |
| `APP_SESSION_SECRET` | Production | 64-char hex for JWTs. Generate: `openssl rand -hex 32` |
| `STRIPE_SECRET_KEY` | For payments | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | For payments | Stripe webhook signing secret |
| `RESEND_API_KEY` | For emails | Resend API key |

## Deploy to Vercel

### 1. Create a Turso Database

```bash
brew install tursodatabase/tap/turso
turso auth signup
turso db create trefolio
turso db show trefolio --url
turso db tokens create trefolio
```

### 2. Set Environment Variables in Vercel

Go to **Settings > Environment Variables** and add all variables from the table above.

### 3. Deploy

Push to `main` or import the repo in the Vercel dashboard. After the first deployment, log in as `admin` / `admin` and change the password.

## Security

- Passwords hashed with **bcrypt** (12 rounds)
- Sessions via **JWT** in `httpOnly`, `SameSite=Lax` cookies
- API keys encrypted with **AES-256-GCM** at rest
- All database queries use **parameterized statements** (no SQL injection)
- **HTTPS** enforced on Vercel
- **Middleware** protects all authenticated routes
- **GDPR-compliant** — built in Portugal (EU)
- Cookie consent with Consent Mode v2

## Contributing

This is a commercial project. If you'd like to contribute, please reach out first.

## License

Proprietary. All rights reserved.

---

**trefolio** — Your portfolio. Understood.
