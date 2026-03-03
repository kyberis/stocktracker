# StockTracker

**Your portfolio. Understood.**

A modern, AI-powered stock portfolio tracker built for people who invest but don't speak Wall Street. Track your holdings across multiple exchanges and currencies, get plain-language AI analysis of company fundamentals, and explore economic indicators — all in a clean, fast interface.

## Why StockTracker?

- **Built for real people, not traders.** Most portfolio tools are cluttered with features you'll never use. StockTracker shows you what matters: what you own, what it's worth, and whether it's doing well.
- **AI that explains, not confuses.** Click a button and get a plain-language breakdown of any company's financials, market intelligence, or economic trends. No jargon.
- **Multi-currency, multi-exchange.** Holding stocks in NYSE, XETRA, LSE, and MAD? Cash in EUR and USD? It all works together, converted automatically.
- **2 EUR/month for Pro.** Cheaper than a coffee. Includes Alpha Vantage data, unlimited AI analysis, stock intelligence, and economic indicators.
- **Your data stays yours.** AES-256 encryption at rest, no tracking, no selling your data. Ever.

## Features

### Free Tier

- Portfolio dashboard with real-time quotes (Yahoo Finance)
- Historical price charts with multiple time ranges
- Cash balance tracking in EUR
- Benchmark comparison (S&P 500, Nasdaq, Dow Jones, Euro Stoxx 50)
- Dark mode / Light mode
- English + Spanish
- 5 AI analysis calls per month
- Multi-user with authentication

### Pro Tier — 2 EUR/month

Everything in Free, plus:

- **Alpha Vantage data** — more accurate quotes, 75 requests/minute
- **Company fundamentals** — Income Statement, Balance Sheet, Cash Flow, Earnings for any stock
- **Stock Intelligence** — news sentiment analysis, insider transactions, institutional holdings, earnings call transcripts
- **Economic Indicators** — Real GDP, CPI, Unemployment, Treasury Yields, and more with interactive charts
- **Unlimited AI analysis** — plain-language explanations of all financial data
- **Priority support**

## Screenshots

> *(Add dashboard screenshots here — dark mode recommended for marketing)*

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router, Edge Runtime) |
| Language | TypeScript |
| Styling | Tailwind CSS (light/dark theme) |
| Database | SQLite via [@libsql/client](https://github.com/tursodatabase/libsql-client-ts) (local file or Turso cloud) |
| Auth | bcryptjs + jose (JWT in httpOnly cookies) |
| Encryption | AES-256-GCM for sensitive data at rest |
| Charts | Recharts |
| AI | OpenAI GPT-4o-mini (streaming responses) |
| Market data | Yahoo Finance (free), Alpha Vantage (Pro) |
| Payments | Stripe (subscriptions) |
| Email | Resend (verification, password reset) |
| Hosting | Vercel (serverless) |

## Getting Started (Local Development)

### Prerequisites

- **Node.js** >= 20
- **npm** (comes with Node)

### Quick Start

```bash
git clone https://github.com/kyberis/stocktracker.git
cd stocktracker
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
| `STOCKTRACKER_TURSO_DATABASE_URL` | Production | Turso database URL (`libsql://...`) |
| `STOCKTRACKER_TURSO_AUTH_TOKEN` | Production | Turso auth token |
| `APP_SESSION_SECRET` | Production | 64-char hex for JWTs. Generate: `openssl rand -hex 32` |
| `STOCKTRACKER_OPENAI_API_KEY` | For AI features | OpenAI API key |
| `STRIPE_SECRET_KEY` | For payments | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | For payments | Stripe webhook signing secret |
| `RESEND_API_KEY` | For emails | Resend API key |

## Deploy to Vercel

### 1. Create a Turso Database

```bash
brew install tursodatabase/tap/turso
turso auth signup
turso db create stocktracker
turso db show stocktracker --url
turso db tokens create stocktracker
```

### 2. Set Environment Variables in Vercel

Go to **Settings > Environment Variables** and add all variables from the table above.

### 3. Deploy

Push to `main` or import the repo in the Vercel dashboard. After the first deployment, log in as `admin` / `admin` and change the password.

## Project Structure

```
src/
├── app/                        # Next.js App Router
│   ├── api/
│   │   ├── admin/              # Admin endpoints
│   │   ├── auth/               # Login, signup, verification, password reset
│   │   ├── billing/            # Stripe checkout, webhooks, portal
│   │   ├── holdings/           # Portfolio CRUD
│   │   ├── quote/              # Real-time stock quotes
│   │   ├── historical/         # Price history
│   │   ├── fundamentals/       # Company financial statements
│   │   ├── intelligence/       # News, insider, institutional data
│   │   ├── economic-indicators/# US economic data
│   │   ├── ai-analysis/        # AI-powered explanations
│   │   └── exchange-rates/     # Currency conversion
│   ├── stock/[ticker]/         # Stock detail + intelligence pages
│   ├── economic-indicators/    # Economic indicators dashboard
│   ├── admin/                  # Admin panel
│   └── login/ signup/          # Auth pages
├── components/                 # React components
├── lib/
│   ├── api-providers/          # Yahoo & Alpha Vantage abstraction
│   ├── auth/                   # Password hashing, JWT, guards
│   ├── db/                     # Database layer, migrations, seed
│   ├── crypto.ts               # AES-256-GCM encryption
│   └── ...                     # Contexts, i18n, types, utils
├── middleware.ts                # Route protection
data/
├── seed-holdings.json          # Sample portfolio
└── seed-cash.json              # Sample cash balances
docs/
└── COMMERCIALIZATION_PLAN.md   # Full business plan
```

## Security

- Passwords hashed with **bcrypt** (12 rounds)
- Sessions via **JWT** in `httpOnly`, `SameSite=Lax` cookies
- Alpha Vantage API keys encrypted with **AES-256-GCM** at rest
- All database queries use **parameterized statements** (no SQL injection)
- **HTTPS** enforced on Vercel
- **Middleware** protects all authenticated routes
- No tracking cookies, no analytics cookies

## Contributing

This is a commercial project. If you'd like to contribute, please reach out first.

## License

Proprietary. All rights reserved.

---

**StockTracker** — Track smarter, not harder.
