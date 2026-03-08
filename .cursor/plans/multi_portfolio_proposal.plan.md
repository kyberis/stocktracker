---
name: ""
overview: ""
todos: []
isProject: false
---

# Multi-Portfolio Support — Engineering Proposal

## Executive Summary

Multiple portfolios is trefolio's single biggest feature gap vs Snowball Analytics, which offers
10 portfolios (Investor) or unlimited (Expert). This proposal adds a first-class `portfolios`
entity that scopes holdings, transactions, cash, snapshots, and shares — while keeping backward
compatibility and a seamless upgrade path for existing users.

---

## 1. Tier Limits


| Plan    | Portfolios | Notes                          |
| ------- | ---------- | ------------------------------ |
| Free    | 1          | Default portfolio, no creation |
| Starter | 1          | Same as Free                   |
| Pro     | 3          | Create, rename, delete, select |


Every user gets exactly 1 portfolio on signup (auto-created, named "My Portfolio").
Pro users can create up to 2 more.

---

## 2. Data Model Changes

### 2.1 New `portfolios` table

```sql
CREATE TABLE portfolios (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'My Portfolio',
  is_default INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, name)
);
CREATE INDEX idx_portfolios_user ON portfolios(user_id);
```

- `is_default` — exactly one per user; used by widget/device when no explicit selection
- `sort_order` — for UI ordering in the portfolio switcher

### 2.2 Column additions to existing tables


| Table                 | New column                            | Default                           |
| --------------------- | ------------------------------------- | --------------------------------- |
| `holdings`            | `portfolio_id TEXT`                   | → backfilled to default portfolio |
| `transactions`        | `portfolio_id TEXT`                   | → backfilled to default portfolio |
| `cash_entries`        | `portfolio_id TEXT`                   | → backfilled to default portfolio |
| `portfolio_snapshots` | `portfolio_id TEXT`                   | → backfilled to default portfolio |
| `portfolio_shares`    | `portfolio_id TEXT`                   | → backfilled to default portfolio |
| `users`               | `device_portfolio_id TEXT DEFAULT ''` | empty = combined view             |


The `UNIQUE(user_id, date)` constraint on `portfolio_snapshots` becomes
`UNIQUE(user_id, portfolio_id, date)`.

### 2.3 Migration strategy

**Migration vN: Create portfolios and backfill**

```
1. CREATE TABLE portfolios (...)
2. For each user: INSERT INTO portfolios (id, user_id, name, is_default) VALUES (uuid, user_id, 'My Portfolio', 1)
3. ALTER TABLE holdings ADD COLUMN portfolio_id TEXT NOT NULL DEFAULT ''
4. UPDATE holdings SET portfolio_id = (SELECT id FROM portfolios WHERE user_id = holdings.user_id AND is_default = 1)
5. Repeat for transactions, cash_entries, portfolio_snapshots, portfolio_shares
6. ALTER TABLE users ADD COLUMN device_portfolio_id TEXT NOT NULL DEFAULT ''
```

All new rows require a valid `portfolio_id`. Existing rows are backfilled to the default portfolio.

---

## 3. Database Layer Changes

### 3.1 New `src/lib/db/portfolios.ts`

```typescript
// CRUD
listPortfolios(userId: string): Promise<Portfolio[]>
createPortfolio(userId: string, name: string): Promise<Portfolio>
renamePortfolio(portfolioId: string, name: string): Promise<void>
deletePortfolio(portfolioId: string): Promise<void>       // moves holdings/tx to default
getDefaultPortfolio(userId: string): Promise<Portfolio>
setDefaultPortfolio(userId: string, portfolioId: string): Promise<void>
countPortfolios(userId: string): Promise<number>
```

### 3.2 Updated query functions

Every function that currently queries by `user_id` needs an optional `portfolioId` parameter:


| Function              | Change                                                     |
| --------------------- | ---------------------------------------------------------- |
| `listHoldings`        | Add `WHERE portfolio_id = ?` when provided; omit for "all" |
| `addHolding`          | Accept `portfolioId`, default to user's default portfolio  |
| `listTransactions`    | Filter by `portfolio_id` when provided                     |
| `addTransaction`      | Accept `portfolioId`                                       |
| `addTransactionsBulk` | Accept `portfolioId`                                       |
| `listCashEntries`     | Filter by `portfolio_id` when provided                     |
| `addCashEntry`        | Accept `portfolioId`                                       |
| `rebuildHoldings`     | Scope to `portfolioId`                                     |


**"Combined view" = omit portfolioId filter** — query returns data from all portfolios.

### 3.3 Portfolio deletion

When a portfolio is deleted:

1. All its holdings, transactions, cash entries, and snapshots move to the default portfolio
2. The default portfolio cannot be deleted
3. Confirmation required in the UI

---

## 4. API Routes

### 4.1 New `/api/portfolios` route

```
GET    /api/portfolios            → list user's portfolios
POST   /api/portfolios            → create (name), enforces plan limit
PUT    /api/portfolios/:id        → rename
DELETE /api/portfolios/:id        → delete (moves data to default)
PUT    /api/portfolios/:id/default → set as default
```

### 4.2 Updated routes

All portfolio-scoped routes accept an optional `portfolioId` query param or body field:


| Route                                  | Change                                |
| -------------------------------------- | ------------------------------------- |
| `GET /api/holdings`                    | `?portfolioId=X` or omit for combined |
| `POST /api/holdings`                   | `portfolioId` in body                 |
| `GET /api/transactions`                | `?portfolioId=X`                      |
| `POST /api/transactions`               | `portfolioId` in body                 |
| `POST /api/transactions/bulk`          | `portfolioId` in body                 |
| `POST /api/transactions/import-broker` | `portfolioId` in body                 |
| `POST /api/import-portfolio`           | `portfolioId` in body                 |
| `GET /api/cash`                        | `?portfolioId=X`                      |
| `POST /api/cash`                       | `portfolioId` in body                 |
| `GET /api/portfolio/summary`           | `?portfolioId=X` (widget/device use)  |
| `POST /api/portfolio/snapshot`         | `portfolioId` in body                 |
| `GET /api/portfolio/history`           | `?portfolioId=X`                      |
| `POST /api/portfolio/share`            | `portfolioId` in body                 |


---

## 5. Frontend Changes

### 5.1 Portfolio Context (`src/lib/portfolio-context.tsx`)

```typescript
interface PortfolioContextValue {
  // existing fields...
  portfolios: Portfolio[];
  activePortfolioId: string | null; // null = combined view
  setActivePortfolio: (id: string | null) => void;
}
```

- `activePortfolioId` persisted to `localStorage` per user
- All data fetches pass `portfolioId` as query param when set
- `null` = combined view (all portfolios merged)

### 5.2 Portfolio Switcher (Dashboard Header)

A dropdown in the dashboard toolbar showing:

```
📊 All Portfolios (combined)    ← default
───────────────────────
📁 My Portfolio
📁 Retirement Fund
📁 Crypto & Growth              ← Pro users only
───────────────────────
+ New Portfolio                  ← Pro only, gated
```

- Pro users see all portfolios + create button
- Free/Starter users see only "My Portfolio" (no switcher shown if only 1)
- Combined view is always the first option

### 5.3 Profile Page — Portfolio Management Section

New section between "Subscription" and "Change Password":

```
── Portfolios ──
My Portfolio         [Default] [Rename]
Retirement Fund               [Rename] [Delete] [Set Default]
+ Create New Portfolio (1 of 3 used)
```

- Default portfolio is labeled with a badge and can be changed
- "Set Default" controls which portfolio the widget/device shows by default
- Delete confirmation warns that data moves to default portfolio

### 5.4 Import Flow

When importing (CSV, AI, IBKR API), a portfolio selector appears if the user has > 1 portfolio:

```
Import to: [My Portfolio ▼]
```

Defaults to the active portfolio from context.

---

## 6. Widget & Device Support

### 6.1 Default behavior: Combined total

Both the PWA widget and the trefolio Leaf device show **combined portfolio totals** by default.
This means:

- `/api/portfolio/summary` with no `portfolioId` → returns aggregated data from all portfolios
- Top holdings list shows the top N across all portfolios
- Sparklines use the combined portfolio value

### 6.2 Per-portfolio selection

In the Profile page, under the portfolio management section:

```
── Device & Widget Portfolio ──
Show on device/widget: [All Portfolios (combined) ▼]
                       [My Portfolio]
                       [Retirement Fund]
```

This saves to `users.device_portfolio_id`:

- Empty string = combined view (default)
- A specific `portfolio_id` = show only that portfolio

### 6.3 API changes

`/api/portfolio/summary` and `/api/device/config`:

- Read `user.device_portfolio_id`
- If set, scope queries to that portfolio
- If empty, return combined data (current behavior)
- Response includes `portfolioName` field so device can display it

### 6.4 Device display

The device shows the portfolio name in a small label:

- "All Portfolios" when combined
- "Retirement Fund" when a specific portfolio is selected

No firmware change needed for this — the device already displays a configurable label.

---

## 7. Device Grant → Pro (Most Expensive Plan)

The existing device grant flow already gives 1 year of Pro. The current implementation:

1. Checkout route (`/api/billing/checkout`) with `deviceGrant: true` forces `plan: "pro"` and `interval: "annual"`
2. Uses `STRIPE_COUPON_DEVICE_FREE_YEAR` (100% off, 12 months)
3. `markDeviceProRedeemed` prevents double-claiming

**No changes needed** — the device grant already targets Pro specifically and bypasses the
plan selection. The code already has:

```typescript
const targetPlan = deviceGrant ? "pro" as const : result.data.plan;
const interval = deviceGrant ? "annual" : result.data.interval;
```

This ensures device buyers always get Pro (the most expensive plan) regardless of what they
had before. The only update is to the `deviceProEligible` check, which was already updated
in the 3-tier redesign to include Starter users:

```typescript
deviceProEligible: !!user.device_linked_at && !user.device_pro_redeemed_at
  && (user.plan === "free" || user.plan === "starter")
```

---

## 8. Subscription Gating

### 8.1 Platform config addition

```typescript
// src/lib/platform-config.ts
FREE_PORTFOLIO_LIMIT: 1,
STARTER_PORTFOLIO_LIMIT: 1,
PRO_PORTFOLIO_LIMIT: 3,
```

### 8.2 Subscription helper

```typescript
// src/lib/subscription.ts
export function getPortfolioLimit(plan: SubscriptionPlan): number {
  if (plan === "pro") return PLATFORM_LIMITS.PRO_PORTFOLIO_LIMIT;
  return PLATFORM_LIMITS.FREE_PORTFOLIO_LIMIT; // 1 for both Free and Starter
}
```

### 8.3 Enforcement points


| Location                     | Enforcement                                                |
| ---------------------------- | ---------------------------------------------------------- |
| `POST /api/portfolios`       | `countPortfolios(userId) >= getPortfolioLimit(plan)` → 403 |
| Dashboard portfolio switcher | Hide "New Portfolio" if at limit                           |
| Profile portfolio section    | Show "X of Y used" and lock creation at limit              |


### 8.4 Downgrade handling

When a Pro user downgrades to Free/Starter:

- Existing portfolios are **not deleted** — they remain read-only
- All data appears in the combined view
- The user cannot create new portfolios
- If they re-upgrade, portfolios become writable again
- Upsell shown: "Upgrade to Pro to manage multiple portfolios"

---

## 9. Edge Cases & Design Decisions

### 9.1 Combined view is always available

Even Pro users with 3 portfolios can always switch to "All Portfolios" to see everything merged.

### 9.2 Holdings limit is per-user, not per-portfolio

The 15/50/unlimited holdings limit applies to the total across all portfolios, not per portfolio.

### 9.3 Portfolio snapshots are per-portfolio + combined

- Snapshot cron records one snapshot per portfolio + one combined snapshot
- History chart can show per-portfolio or combined growth

### 9.4 Alerts are per-user

Price alerts are not scoped to portfolios — they track tickers globally.

### 9.5 Public sharing is per-portfolio

Each portfolio can have its own share link. The existing single share becomes the default portfolio's share.

### 9.6 Watchlist is per-user

The watchlist remains global, not portfolio-scoped.

### 9.7 Moving holdings between portfolios

Pro users can move holdings (and their transactions) between portfolios via a "Move to..." context menu.

---

## 10. Files Changed (Estimated)


| Category          | Files                                                                                                                               | Effort |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------ |
| **Schema/DB**     | `migrations.ts`, new `portfolios.ts`, `holdings.ts`, `transactions.ts`, `cash.ts`, `helpers.ts`                                     | High   |
| **API routes**    | All routes listed in §4.2 + new `/api/portfolios`                                                                                   | High   |
| **Frontend**      | `portfolio-context.tsx`, `Dashboard.tsx`, `DashboardToolbar.tsx`, `ProfilePage.tsx`, `ImportPortfolioModal.tsx`, `BrokerImport.tsx` | High   |
| **Widget/Device** | `portfolio/summary/route.ts`, `device/config/route.ts`, `ProfilePage.tsx`                                                           | Medium |
| **Subscription**  | `platform-config.ts`, `subscription.ts`, `upsell.ts`                                                                                | Low    |
| **i18n**          | `en.ts`, `es.ts` + all other locale files                                                                                           | Low    |
| **Tests**         | New test file for portfolio CRUD, updated existing                                                                                  | Medium |


**Estimated total: 30–40 files, ~2000–3000 lines of new/modified code**

---

## 11. Recommended Rollout Phases

### Phase 1: Foundation (Backend)

1. Schema + migration + `portfolios.ts` CRUD
2. Backfill default portfolio for all existing users
3. Add `portfolio_id` column to holdings/transactions/cash/snapshots/shares
4. Update DB query functions with optional `portfolioId`

### Phase 2: API Layer

1. New `/api/portfolios` CRUD route
2. Update all scoped API routes to accept `portfolioId`
3. Enforce plan-based portfolio limits

### Phase 3: Frontend — Portfolio Switcher

1. Portfolio context update with `activePortfolioId`
2. Dashboard toolbar portfolio switcher
3. Import flow portfolio selector

### Phase 4: Profile & Management

1. Profile page portfolio management section
2. Device/widget portfolio selector in profile
3. Downgrade handling and upsell messaging

### Phase 5: Polish

1. "Move holdings" between portfolios
2. Per-portfolio sharing links
3. Landing page update with multi-portfolio feature
4. Release notes + social media announcement

---

## 12. Comparison with Snowball Analytics


| Feature                    | Snowball           | trefolio (proposed) |
| -------------------------- | ------------------ | ------------------- |
| Portfolio count (top tier) | Unlimited (Expert) | 3 (Pro)             |
| Combined view              | Yes                | Yes (default)       |
| Per-portfolio sharing      | Yes                | Yes                 |
| Portfolio on mobile widget | Unknown            | Yes (configurable)  |
| Portfolio on hardware      | N/A                | Yes (trefolio Leaf) |
| Move holdings              | Unknown            | Yes                 |
| Per-portfolio snapshots    | Unknown            | Yes                 |


trefolio differentiates with the hardware device integration and combined-view-first approach.
The 3-portfolio Pro limit keeps things simple while covering 90%+ of retail investor needs
(e.g. long-term, retirement, speculative).