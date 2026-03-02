# StockTracker

A self-hosted stock portfolio tracker built with **Next.js 14**, **TypeScript**, and **Tailwind CSS**. Track holdings, view real-time quotes, historical charts, and company fundamentals — all behind a multi-user authentication system.

## Features

- **Portfolio dashboard** — add, edit, and remove stock holdings with real-time prices, gain/loss calculations, and a portfolio summary in EUR.
- **Dual data providers** — switch between Yahoo Finance (default) and Alpha Vantage per user. When Alpha Vantage hits its daily quota, individual requests automatically fall back to Yahoo with a visible badge.
- **Alpha Vantage extras** — company overview (sector, P/E, market cap, dividend yield, etc.) and daily API-call counter when AV is selected.
- **Historical charts** — interactive price charts powered by Recharts.
- **Multi-user auth** — signup/login with bcrypt-hashed passwords and JWT sessions stored in httpOnly cookies. A default `admin` account is created on first run.
- **Admin panel** — manage users, reset passwords, seed or clear portfolio data.
- **Per-user settings** — provider choice, API key, and language preference stored server-side.
- **Internationalization** — English and Spanish.
- **Vercel-ready** — uses Turso (libSQL over HTTP) for the database, so it runs on serverless with zero native dependencies.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Database | SQLite via [@libsql/client](https://github.com/tursodatabase/libsql-client-ts) (local file or Turso cloud) |
| Auth | bcryptjs + jose (JWT) |
| Charts | Recharts |
| Market data | yahoo-finance2, Alpha Vantage REST API |

## Prerequisites

- **Node.js** >= 20
- **npm** (comes with Node)
- A **Turso** account (free tier) if deploying to Vercel — not needed for local development

## Getting Started (Local)

```bash
# Clone the repo
git clone https://github.com/kyberis/stocktracker.git
cd stocktracker

# Install dependencies
npm install

# Start the dev server
npm run dev
```

Open http://localhost:3000. No extra configuration is needed for local development — the app creates a local SQLite file at `data/stocktracker.db` automatically.

### Default admin account

| Username | Password |
|---|---|
| `admin` | `admin` |

You will be prompted to change the password on first login.

### Seed portfolio data

The admin panel (accessible after login) lets you reset any user's holdings to the sample portfolio defined in `data/seed-holdings.json`, or clear them entirely.

## Environment Variables

Copy the example file for reference:

```bash
cp .env.local.example .env.local
```

| Variable | Required | Description |
|---|---|---|
| `STOCKTRACKER_TURSO_DATABASE_URL` | On Vercel | Turso database URL (`libsql://...`). Leave unset locally to use a SQLite file. |
| `STOCKTRACKER_TURSO_AUTH_TOKEN` | On Vercel | Turso auth token. |
| `APP_SESSION_SECRET` | On Vercel | 64-char hex string for signing JWTs. Generate with `openssl rand -hex 32`. Falls back to a dev-only default locally. |

## Deploy to Vercel

### 1. Create a Turso database

```bash
brew install tursodatabase/tap/turso
turso auth signup          # or: turso auth login
turso db create stocktracker
turso db show stocktracker --url       # copy the URL
turso db tokens create stocktracker    # copy the token
```

### 2. Set environment variables in Vercel

Go to **Settings → Environment Variables** in your Vercel project and add:

- `STOCKTRACKER_TURSO_DATABASE_URL` — the `libsql://...` URL from step 1
- `STOCKTRACKER_TURSO_AUTH_TOKEN` — the token from step 1
- `APP_SESSION_SECRET` — output of `openssl rand -hex 32`

### 3. Deploy

Push to the `main` branch or import the repo in the Vercel dashboard. The build runs `next build` automatically.

After the first deployment, log in as `admin` / `admin`, change the password, and use the admin panel to seed portfolio data if desired.

## Project Structure

```
src/
├── app/                    # Next.js App Router pages and API routes
│   ├── api/
│   │   ├── admin/          # Admin endpoints (users, reset-data)
│   │   ├── auth/           # Login, signup, logout, change-password, me
│   │   ├── holdings/       # CRUD for user holdings
│   │   ├── user-settings/  # Per-user settings
│   │   ├── quote/          # Real-time stock quotes
│   │   ├── historical/     # Historical price data
│   │   ├── overview/       # Company fundamentals (Alpha Vantage)
│   │   └── search/         # Stock search/autocomplete
│   ├── admin/              # Admin panel UI
│   ├── login/              # Login page
│   ├── signup/             # Signup page
│   └── change-password/    # Forced password change page
├── components/             # React components (Dashboard, StockRow, Charts, etc.)
├── lib/
│   ├── api-providers/      # Abstraction layer: Yahoo & Alpha Vantage providers
│   ├── auth/               # Password hashing, JWT sessions, route guards
│   ├── db/                 # Database layer (libSQL client, migrations, seed)
│   └── ...                 # Contexts (auth, portfolio, settings, i18n), types, utils
└── middleware.ts            # Route protection and auth redirects
data/
└── seed-holdings.json      # Sample portfolio for seeding new users
```

## License

MIT
