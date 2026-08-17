# Dashboard Theme Parity Verification

Ensures every dashboard feature is present and functional in all four themes (Default, Terminal, Canvas, Studio). Use when adding, modifying, or removing any dashboard component, or when creating/updating a theme.

## Theme Architecture

All themes render the **same components** with the same data. Themes only change visual presentation (CSS custom properties on `<html>`, layout mode, typography, spacing, border radii). The HTML/JSX structure is shared — themes NEVER remove features, they only restyle them.

Default theme now uses the glass visual system described in `knowledge/design-docs/glass-visual-system.md`. Parity does not mean every theme must look equally glassy; it means every theme must preserve structure, readability, and interaction quality.

### Theme Registry

| Theme | CSS class | Tier | Layout | Fonts | Mode | Key Trait |
|-------|-----------|------|--------|-------|------|-----------|
| **Default** | (none / `theme-default`) | All tiers | Top nav | Geist Sans / Mono | Dark/Light toggle | Primary glass system |
| **Canvas** | `theme-canvas` | Bifolio (Starter)+ | Top nav (pill-style) | DM Sans | Forced light | Warm, spacious, rounded cards |
| **Terminal** | `theme-terminal` | Trefolio (Pro) | Top nav | IBM Plex Mono | Forced dark | Dense monospace, compact, hacker aesthetic |
| **Studio** | `theme-studio` | Trefolio (Pro) | Sidebar nav | Plus Jakarta Sans + Space Mono | Forced dark | Premium dark glass with sidebar shell |

### Tier Gating Rules

- **Folio (Free):** Default only. Canvas, Terminal, and Studio show locked overlays in ThemeSelector.
- **Bifolio (Starter):** Default + Canvas. Terminal and Studio show locked overlays.
- **Trefolio (Pro):** All four themes available.
- Theme selection is stored in `user_settings.dashboard_theme` and persists across sessions.
- If a user downgrades and their active theme is no longer available, the system defaults to "default".
- Theme is selected in SettingsModal via the ThemeSelector component.

### Key Files

- `src/lib/theme-context.tsx` — ThemeProvider applies `theme-X` class on `<html>`, forces dark/light per theme
- `src/lib/settings-context.tsx` — `dashboardTheme` state, `setDashboardTheme` callback
- `src/lib/subscription.ts` — `canAccessTheme()`, `getAvailableThemes()`, `getThemeUpgradeTarget()`
- `src/components/LayoutThemeBridge.tsx` — Syncs settings → theme context
- `src/components/ThemeSelector.tsx` — UI for picking themes in settings
- `src/components/SidebarNav.tsx` — Sidebar navigation for Studio theme
- `src/app/(app)/layout.tsx` — AppShell conditionally renders sidebar for Studio
- `src/app/globals.css` — CSS variable blocks for each theme

## Complete Feature Checklist

Every item below MUST be present in ALL four themes. When modifying the dashboard, verify every item renders correctly in each theme.

### App Shell (from `layout.tsx`)

- [ ] **MarketTickerBar** — EUR/USD, BTC, Gold, Silver, S&P 500, Oil; market open/closed status
- [ ] **AppNav / Sidebar** — Logo, brand name; Portfolio, Import, Tools, Crypto (Pro badge), Indicators (Pro badge); What's New button, Stealth toggle, Theme toggle, Language picker, User avatar/menu
- [ ] **MobileTabBar** — Portfolio, Import, Tools, Crypto, Profile (mobile only)
- [ ] **InstallPrompt** — PWA install prompt
- [ ] **MarketMoveToast** — Toast for >4% index moves
- [ ] **CapacitorBridge** — Native bridge (invisible)
- [ ] **NativePushBridge** — Push notification bridge (invisible)
- [ ] **DeviceInterestEnroller** — Device interest tracking (invisible)

### Dashboard Toolbar

- [ ] **Portfolio switcher** — Dropdown with portfolio list, create new, set default
- [ ] **Quotes as of / Holdings synced** — Freshness cluster with green/amber dots; "Quotes as of [HH:MM:SS]" and "Holdings synced [X ago]"; hidden on mobile (xs screens); turns amber when data is >30 min old
- [ ] **Last updated** — Timestamp of last quote refresh
- [ ] **Refresh button** — Manual quote refresh
- [ ] **Settings button** — Opens SettingsModal
- [ ] **Import button** — Opens ImportPortfolioModal
- [ ] **Reset button** — Opens ResetPortfolioModal
- [ ] **Add Asset button** — Stock (all tiers) + Crypto (Pro only)

### Dashboard Tab Bar

- [ ] **Portfolio** tab (default)
- [ ] **Crypto** tab (Pro, or if user has crypto holdings)
- [ ] **Diversification** tab
- [ ] **Dividends** tab
- [ ] **Metrics** tab (Starter+ badge)
- [ ] **Growth** tab (Starter+ badge)
- [ ] **Events** tab
- [ ] **News** tab

### Banners (conditional)

- [ ] **SnapTradeReconnectBanner** — When broker connection needs reauthorization; shows broker names, reconnect CTA, dismiss
- [ ] **LeafPromoBanner** — When promo enabled via API; title, badge, description, CTA, dismiss
- [ ] **Holdings usage warning** — When `holdingsCount >= limit - 2`; shows "{used} of {limit}" with upgrade link

### Portfolio Tab Content

- [ ] **BrokerFilter** — Pills: All, per broker account, Manual (shown when 2+ sources)
- [ ] **PortfolioSummary** card:
  - [ ] Total portfolio value (EUR, stealth-mode aware)
  - [ ] Cost basis
  - [ ] Day gain/loss (amount + percentage, colored) with last-market-update timestamp (`day-move-as-of`; weekday + time when the session is not today)
  - [ ] Total gain/loss percentage
  - [ ] Holdings count (used / limit)
  - [ ] Asset allocation (donut/bar + legend by type: stocks, ETFs, crypto, cash, other)
  - [ ] AI Review button (Pro: opens PortfolioReviewCard with usage count; Free: link to billing)
  - [ ] BrokerSyncDot (Pro: green dot + last synced + broker names; others: hidden or link to billing)
- [ ] **AdSlot (dashboard-summary)** — Horizontal; Free tier + ad consent only
- [ ] **PortfolioTable** (or card-based holdings list):
  - [ ] Search input
  - [ ] Sort controls (Name, Value, Gain/Loss)
  - [ ] Per-holding row: name, AlertBadge, exchange, ticker, price, shares, total value (EUR), day change (amount + %), market status dot
  - [ ] Row click → StockDetailDrawer (desktop) or `/stock/[ticker]` (mobile)
- [ ] **UpcomingEarnings** — Next 14 days; symbol, name, date, time (bmo/amc); "View all" link to Events tab; hidden when no events
- [ ] **PortfolioGrowthPeriods** — YTD, 1M, 1Y returns (Starter/Pro; Free: BlurredProSection with upgrade CTA)
- [ ] **PerformanceMetrics** — TTWROR, IRR (Starter/Pro; Free: BlurredProSection with upgrade CTA); "How is this calculated?" link → PerformanceExplainerModal
- [ ] **MarketAndCash**:
  - [ ] Markets Today table: Portfolio row, S&P 500, Nasdaq, Dow Jones, Euro Stoxx 50 (price, day change %)
  - [ ] Refresh indices button
  - [ ] "View benchmark chart" toggle → PortfolioBenchmarkChart (period selector: 1w/1m/3m/6m/1y/all; benchmark toggles)
  - [ ] Cash balances list with add/edit/remove controls
  - [ ] Total cash
- [ ] **PortfolioProjection**:
  - [ ] Growth rate slider (1–15%)
  - [ ] Reinvest dividends toggle
  - [ ] Yearly contribution input (EUR)
  - [ ] Horizon buttons (10, 20, 30 years)
  - [ ] Minimize/expand toggle
  - [ ] Area chart (base, dividends, contributions series)
  - [ ] Summary cards: current value, final projected value, total contributed, total return %
- [ ] **AdSlot (dashboard-bottom)** — Auto format; Free tier + ad consent only
- [ ] **ProCompareCard** — When at holdings limit; tier comparison table with pricing, features, upgrade CTAs, monthly/annual toggle

### Persistent UI

- [ ] **Floating feedback button** — Fixed bottom-right; opens FeedbackModal

## Verification Process

When this skill is invoked, follow these steps:

### Step 1: Enumerate Components

Search for every component imported in `Dashboard.tsx` and `src/app/(app)/layout.tsx`. Cross-reference with the checklist above.

### Step 2: Check Theme CSS Coverage

For each theme class (`theme-terminal`, `theme-canvas`, `theme-studio`):
1. Verify CSS custom properties are defined (colors, fonts, radii, layout mode)
2. Verify layout-specific overrides exist (e.g., sidebar visibility for Studio, nav pill style for Canvas)
3. Verify no component is hidden via `display: none` except layout-mode switches (top-nav vs sidebar)

### Step 3: Verify Tier Gating

1. Theme selector component shows correct lock state per user tier
2. Attempting to select a locked theme shows upgrade prompt
3. Downgraded users fall back to Terminal

### Step 4: Visual Spot-Check

For each theme, confirm:
- [ ] All text is readable (contrast meets WCAG AA)
- [ ] Gain/loss colors are distinguishable
- [ ] Interactive elements have visible hover/focus states
- [ ] Cards, buttons, inputs use the theme's border-radius variables
- [ ] Monospace font is used for all numerical values
- [ ] Chart colors use theme accent variables
- [ ] Overlays are more opaque than standard cards
- [ ] Default-theme glass does not reduce chart or table legibility
- [ ] Mobile and tablet layouts remain calmer than the desktop hero treatment

### Step 5: New Feature Gate

When adding a new dashboard component:
1. Add it to the shared HTML/JSX (not per-theme)
2. Style it using CSS custom properties only (never hard-coded colors)
3. Add it to the checklist in this file
4. Test rendering in all four themes
5. If the component has tier-gated content, use `BlurredProSection` consistently

## Files to Check

| File | What to verify |
|------|---------------|
| `src/components/Dashboard.tsx` | Component render order, feature completeness |
| `src/app/(app)/layout.tsx` | App shell components |
| `src/app/globals.css` | Theme CSS variables for all four themes |
| `src/lib/settings-context.tsx` | Theme selection storage and fallback logic |
| `src/components/ThemeSelector.tsx` | Tier gating UI in theme picker |
| `src/components/PortfolioSummary.tsx` | AI Review, BrokerSyncDot, allocation |
| `src/components/PortfolioTable.tsx` | Search, sort, columns, row interactions |
| `src/components/PortfolioProjection.tsx` | Controls, chart, summary cards |
| `src/components/PerformanceMetrics.tsx` | TTWROR, IRR, BlurredProSection |
| `src/components/PortfolioGrowthPeriods.tsx` | YTD/1M/1Y, BlurredProSection |
| `src/components/MarketAndCash.tsx` | Indices, cash, benchmark chart |
| `src/components/UpcomingEarnings.tsx` | Earnings list, "View all" link |
| `src/components/ProCompareCard.tsx` | Tier comparison, pricing |
| `src/components/BrokerFilter.tsx` | Broker pills |
| `src/components/AdSlot.tsx` | Both ad slots |
