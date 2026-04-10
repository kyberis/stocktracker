export type FeatureStatus = "stable" | "beta" | "experimental";

export interface ApiRoute {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  auth: "public" | "session" | "admin";
  description: string;
}

export interface FeatureDomain {
  id: string;
  name: string;
  description: string;
  status: FeatureStatus;
  version: string;
  components: { path: string; description: string }[];
  apiRoutes: ApiRoute[];
  libs: { path: string; description: string }[];
  patterns: string[];
  tech: string[];
  skillFile?: string;
}

export const featureDomains: FeatureDomain[] = [
  {
    id: "dashboard",
    name: "Portfolio Dashboard",
    description:
      "Main portfolio view with real-time holdings, summary header, benchmark charts, growth periods, performance metrics, and market/cash overview.",
    status: "stable",
    version: "0.5.0",
    components: [
      { path: "src/components/Dashboard.tsx", description: "Root dashboard layout composing all portfolio widgets" },
      { path: "src/components/PortfolioSummary.tsx", description: "Compact header with total value, per-stock EUR values, daily changes" },
      { path: "src/components/PortfolioTable.tsx", description: "Holdings table with live quotes and inline editing" },
      { path: "src/components/PortfolioBenchmarkChart.tsx", description: "Portfolio vs S&P 500, Nasdaq, Dow Jones, Euro Stoxx 50" },
      { path: "src/components/PortfolioGrowthPeriods.tsx", description: "YTD, 1M, 1Y growth period cards" },
      { path: "src/components/PerformanceMetrics.tsx", description: "TTWROR and IRR calculations with methodology notes" },
      { path: "src/components/MarketAndCash.tsx", description: "Holdings + cash balance summary with quotes" },
      { path: "src/components/StockChart.tsx", description: "Historical price chart (1W to All periods)" },
      { path: "src/components/StockRow.tsx", description: "Single holding row with expandable chart" },
      { path: "src/components/DashboardToolbar.tsx", description: "Add stock, settings, import, reset controls" },
    ],
    apiRoutes: [
      { method: "GET", path: "/api/holdings", auth: "session", description: "Fetch user holdings" },
      { method: "POST", path: "/api/holdings", auth: "session", description: "Add a holding" },
      { method: "PUT", path: "/api/holdings", auth: "session", description: "Update holding details" },
      { method: "DELETE", path: "/api/holdings", auth: "session", description: "Remove a holding" },
      { method: "GET", path: "/api/quotes", auth: "session", description: "Fetch live quotes for tickers" },
      { method: "GET", path: "/api/historical", auth: "session", description: "Fetch historical price data" },
      { method: "GET", path: "/api/exchange-rates", auth: "session", description: "Currency exchange rates" },
    ],
    libs: [
      { path: "src/lib/portfolio-context.tsx", description: "React context providing portfolio state to all components" },
      { path: "src/lib/portfolio-summary.ts", description: "Portfolio aggregation calculations" },
      { path: "src/lib/performance.ts", description: "TTWROR and IRR calculation engines" },
      { path: "src/lib/market-hours.ts", description: "Market open/closed detection" },
      { path: "src/lib/utils.ts", description: "Formatting, currency conversion, helpers" },
    ],
    patterns: [
      "PortfolioContext provides holdings, quotes, and cash to all dashboard children",
      "Auto-refresh via configurable interval (15m / 30m / 1h)",
      "Lazy-loaded charts and modals for reduced initial bundle",
      "EUR-normalized values via exchange-rate API",
    ],
    tech: ["React 18", "Recharts", "Tailwind CSS", "Context API"],
    skillFile: ".cursor/skills/engineer-dashboard/SKILL.md",
  },
  {
    id: "data-imports",
    name: "Data & Imports",
    description:
      "Database schema, seed data, CSV import (DEGIRO and Simple CSV), AI-powered import from screenshots/CSV, and data normalization.",
    status: "stable",
    version: "0.10.0",
    components: [
      { path: "src/components/BrokerImport.tsx", description: "DEGIRO and Simple CSV import wizard" },
      { path: "src/components/ImportPortfolioModal.tsx", description: "AI import from screenshots or CSV" },
      { path: "src/components/ResetPortfolioModal.tsx", description: "Reset portfolio to seed or empty" },
    ],
    apiRoutes: [
      { method: "POST", path: "/api/transactions/import-broker", auth: "session", description: "Parse and import broker CSV" },
      { method: "POST", path: "/api/transactions/import", auth: "session", description: "AI-powered import extraction" },
      { method: "POST", path: "/api/holdings/batch", auth: "session", description: "Batch-import holdings" },
      { method: "GET", path: "/api/transactions", auth: "session", description: "List transaction history" },
      { method: "POST", path: "/api/transactions", auth: "session", description: "Record a transaction" },
    ],
    libs: [
      { path: "src/lib/db/index.ts", description: "Turso/libSQL database access layer" },
      { path: "src/lib/db/seed.ts", description: "Seed data for new accounts" },
      { path: "src/lib/degiro-parser.ts", description: "DEGIRO Account.csv parser" },
      { path: "src/lib/types.ts", description: "Shared TypeScript types" },
      { path: "src/lib/initial-data.ts", description: "Default portfolio data" },
    ],
    patterns: [
      "DEGIRO parser extracts buys, sells, dividends, fees, and cash balances",
      "Simple CSV format: ticker, type, price, amount, currency (+ optional date, name)",
      "AI import uses OpenAI to extract structured data from unstructured inputs",
      "ISIN-to-ticker mapping via Yahoo Finance search API",
      "Batch import with progress callback for UI updates",
    ],
    tech: ["Turso (libSQL)", "OpenAI API", "CSV parsing", "ISIN resolution"],
    skillFile: ".cursor/skills/engineer-data/SKILL.md",
  },
  {
    id: "integrations",
    name: "Market Data Integrations",
    description:
      "Yahoo Finance (free quotes, search, historical) and Alpha Vantage (fundamentals, intelligence, economic indicators) provider integrations.",
    status: "stable",
    version: "0.7.0",
    components: [
      { path: "src/components/SettingsModal.tsx", description: "Provider selection and API key configuration" },
    ],
    apiRoutes: [
      { method: "GET", path: "/api/quotes", auth: "session", description: "Quote fetching (Yahoo or AV)" },
      { method: "GET", path: "/api/search", auth: "session", description: "Stock search (Yahoo)" },
      { method: "GET", path: "/api/historical", auth: "session", description: "Historical prices" },
      { method: "GET", path: "/api/fundamentals", auth: "session", description: "Company fundamentals (AV, Pro)" },
      { method: "GET", path: "/api/intelligence", auth: "session", description: "News, insider, institutional (AV, Pro)" },
      { method: "GET", path: "/api/economic-indicators", auth: "session", description: "US economic data (AV, Pro)" },
    ],
    libs: [
      { path: "src/lib/api-providers/yahoo.ts", description: "Yahoo Finance API client" },
      { path: "src/lib/api-providers/alphavantage.ts", description: "Alpha Vantage API client" },
      { path: "src/lib/api-providers/fmp-market-data.ts", description: "Financial Modeling Prep market data client" },
      { path: "src/lib/market-data/resolve-provider.ts", description: "FMP vs Alpha Vantage resolution + rollout flags" },
    ],
    patterns: [
      "Provider abstraction — Yahoo is default; premium routes use FMP or Alpha Vantage per feature flags",
      "Server env keys (FMP_API_KEY, STOCKTRACKER_ALPHAVANTAGE_API_KEY)",
      "Automatic fallback to Alpha Vantage when FMP flag is on but key missing",
      "Rate limiting: per-user buckets for AV and FMP",
    ],
    tech: ["Yahoo Finance API", "Alpha Vantage API", "Financial Modeling Prep", "Server-side fetch"],
    skillFile: ".cursor/skills/engineer-integrations/SKILL.md",
  },
  {
    id: "auth",
    name: "Authentication & Users",
    description:
      "JWT session auth with httpOnly cookies, user registration, login, password management, email verification, and role-based access control.",
    status: "stable",
    version: "0.6.0",
    components: [
      { path: "src/app/login/page.tsx", description: "Login page" },
      { path: "src/app/signup/page.tsx", description: "Registration page" },
      { path: "src/app/(app)/profile/page.tsx", description: "Profile settings page" },
      { path: "src/app/(app)/change-password/page.tsx", description: "Password change page" },
      { path: "src/components/UserDropdown.tsx", description: "User menu with profile, admin, logout" },
    ],
    apiRoutes: [
      { method: "POST", path: "/api/auth/login", auth: "public", description: "Authenticate and set session cookie" },
      { method: "POST", path: "/api/auth/signup", auth: "public", description: "Create new account" },
      { method: "POST", path: "/api/auth/logout", auth: "public", description: "Clear session cookie" },
      { method: "GET", path: "/api/auth/me", auth: "session", description: "Get current user info" },
      { method: "PUT", path: "/api/auth/profile", auth: "session", description: "Update profile fields" },
      { method: "PUT", path: "/api/auth/change-password", auth: "session", description: "Change password" },
      { method: "POST", path: "/api/auth/verify-email", auth: "session", description: "Send verification email" },
      { method: "DELETE", path: "/api/auth/delete-account", auth: "session", description: "Delete user account" },
    ],
    libs: [
      { path: "src/lib/auth/session.ts", description: "JWT creation, verification, cookie handling" },
      { path: "src/lib/auth/guards.ts", description: "requireSession and requireAdmin middleware" },
      { path: "src/lib/auth/password.ts", description: "bcrypt hashing and verification" },
      { path: "src/lib/auth-context.tsx", description: "Client-side auth state (useAuth hook)" },
      { path: "src/middleware.ts", description: "Next.js middleware for route protection" },
    ],
    patterns: [
      "JWT stored in httpOnly cookie (trefolio_session, 7-day expiry)",
      "requireSession guard for authenticated routes, requireAdmin for admin routes",
      "Middleware redirects unauthenticated users to /login, returns 401 for API",
      "Client-side useAuth() context provides user, isLoading, refreshUser, logout",
      "Roles: admin | user — stored in DB, encoded in JWT",
    ],
    tech: ["JWT (jose)", "bcryptjs", "Next.js middleware", "httpOnly cookies"],
    skillFile: ".cursor/skills/engineer-user-auth/SKILL.md",
  },
  {
    id: "payments",
    name: "Subscriptions & Billing",
    description:
      "Stripe-based subscriptions with Free and Pro tiers, checkout flow, billing portal, webhook synchronization, and feature gating.",
    status: "stable",
    version: "0.11.0",
    components: [
      { path: "src/app/(app)/profile/page.tsx", description: "Plan badge, upgrade button, manage subscription" },
      { path: "src/components/ProCompareCard.tsx", description: "Free vs Pro comparison upsell card" },
    ],
    apiRoutes: [
      { method: "POST", path: "/api/billing/checkout", auth: "session", description: "Create Stripe Checkout session" },
      { method: "POST", path: "/api/billing/portal", auth: "session", description: "Create Stripe Billing Portal session" },
      { method: "POST", path: "/api/billing/webhook", auth: "public", description: "Stripe webhook handler" },
    ],
    libs: [
      { path: "src/lib/stripe.ts", description: "Stripe client initialization" },
      { path: "src/lib/subscription.ts", description: "Plan storage, capacity checks, entitlement logic" },
    ],
    patterns: [
      "Stripe Checkout for new subscriptions (monthly or annual)",
      "Stripe Billing Portal for plan management and cancellation",
      "Webhook syncs subscription status to DB on checkout.session.completed, invoice.paid, customer.subscription.deleted",
      "Pro gating: server-side plan check in API routes, client-side ProCompareCard upsell",
      "Capacity cap: configurable max Pro spots stored as feature flag",
    ],
    tech: ["Stripe Checkout", "Stripe Webhooks", "Stripe Billing Portal"],
    skillFile: ".cursor/skills/engineer-payments-subscriptions/SKILL.md",
  },
  {
    id: "tools",
    name: "Portfolio Tools",
    description:
      "Tools page with performance metrics, portfolio projection, dividend tracking, taxonomy/classification, rebalancing, accounts, and watchlist.",
    status: "stable",
    version: "0.9.3",
    components: [
      { path: "src/app/(app)/tools/page.tsx", description: "Tools page with lazy-loaded tab panels" },
      { path: "src/components/PortfolioProjection.tsx", description: "Growth projection with interactive chart" },
      { path: "src/components/DividendSummary.tsx", description: "Dividend income, yield, projections" },
      { path: "src/components/TaxonomyView.tsx", description: "Sector/region/asset class classification" },
      { path: "src/components/RebalancingView.tsx", description: "Rebalancing targets and drift analysis" },
      { path: "src/components/AccountsManager.tsx", description: "Multi-account management" },
      { path: "src/components/Watchlist.tsx", description: "Watchlist with live quotes" },
      { path: "src/components/TransactionHistory.tsx", description: "Transaction history table" },
      { path: "src/components/CashBalances.tsx", description: "Cash balance CRUD" },
    ],
    apiRoutes: [
      { method: "GET", path: "/api/transactions", auth: "session", description: "Transaction history" },
      { method: "GET", path: "/api/watchlist", auth: "session", description: "Get watchlist" },
      { method: "POST", path: "/api/watchlist", auth: "session", description: "Add to watchlist" },
      { method: "DELETE", path: "/api/watchlist", auth: "session", description: "Remove from watchlist" },
      { method: "GET", path: "/api/accounts", auth: "session", description: "List accounts" },
      { method: "POST", path: "/api/accounts", auth: "session", description: "Create account" },
      { method: "GET", path: "/api/rebalance-targets", auth: "session", description: "Get rebalancing targets" },
      { method: "PUT", path: "/api/rebalance-targets", auth: "session", description: "Update rebalancing targets" },
    ],
    libs: [
      { path: "src/lib/performance.ts", description: "TTWROR (Modified Dietz) and IRR (XIRR) engines" },
      { path: "src/lib/portfolio-summary.ts", description: "Portfolio value aggregation" },
      { path: "src/lib/utils.ts", description: "Currency formatting, number helpers" },
      { path: "src/lib/crypto.ts", description: "Crypto-specific utilities" },
    ],
    patterns: [
      "Lazy-loaded tool tabs reduce initial bundle size",
      "TTWROR uses Modified Dietz method for time-weighted return",
      "IRR uses XIRR (Newton-Raphson) for internal rate of return",
      "Classification supports auto-classify via Yahoo Finance metadata + OpenAI fallback",
    ],
    tech: ["Recharts", "Newton-Raphson (XIRR)", "Modified Dietz"],
    skillFile: ".cursor/skills/engineer-tools/SKILL.md",
  },
  {
    id: "stock-detail",
    name: "Stock Detail & Fundamentals",
    description:
      "Individual stock pages with price charts, company overview, key metrics, financial statements (income, balance sheet, cash flow), and earnings.",
    status: "stable",
    version: "0.7.0",
    components: [
      { path: "src/app/(app)/stock/[ticker]/page.tsx", description: "Stock detail page with tabs" },
    ],
    apiRoutes: [
      { method: "GET", path: "/api/fundamentals", auth: "session", description: "Company fundamentals (Pro, AV)" },
      { method: "POST", path: "/api/ai/analyze", auth: "session", description: "AI analysis of financials" },
    ],
    libs: [
      { path: "src/lib/api-providers/alphavantage.ts", description: "Fundamentals data fetching" },
    ],
    patterns: [
      "Dynamic route: /stock/[ticker] with Next.js App Router",
      "Tabs: Overview, Income Statement, Balance Sheet, Cash Flow, Earnings",
      "Pro-gated: fundamentals require Alpha Vantage + Pro plan",
      "AI analysis sends financial data to OpenAI for plain-language summary",
    ],
    tech: ["Next.js dynamic routes", "Alpha Vantage API", "OpenAI API"],
    skillFile: ".cursor/skills/engineer-integrations/SKILL.md",
  },
  {
    id: "intelligence",
    name: "Alpha Intelligence",
    description:
      "Market intelligence hub with news sentiment analysis, insider transactions, institutional holdings, and earnings transcripts.",
    status: "stable",
    version: "0.8.0",
    components: [
      { path: "src/app/(app)/stock/[ticker]/intelligence/page.tsx", description: "Intelligence dashboard" },
    ],
    apiRoutes: [
      { method: "GET", path: "/api/intelligence", auth: "session", description: "News, insiders, institutions (Pro, AV)" },
      { method: "POST", path: "/api/ai/analyze", auth: "session", description: "AI insights on intelligence data" },
    ],
    libs: [
      { path: "src/lib/api-providers/alphavantage.ts", description: "Intelligence data endpoints" },
    ],
    patterns: [
      "Sub-tabs: News & Sentiment, Insider Transactions, Institutional Holdings, Earnings Transcript",
      "Sentiment scoring: Bullish / Somewhat Bullish / Neutral / Somewhat Bearish / Bearish",
      "Pro-gated: requires Alpha Vantage + Pro plan",
    ],
    tech: ["Alpha Vantage News Sentiment API", "OpenAI API"],
    skillFile: ".cursor/skills/engineer-integrations/SKILL.md",
  },
  {
    id: "alerts",
    name: "Price Alerts",
    description:
      "Price alert system with above/below thresholds, email notifications (Pro), and alert management with pause/resume/reactivate.",
    status: "stable",
    version: "0.20.0",
    components: [
      { path: "src/components/PriceAlerts.tsx", description: "Alert creation and management UI" },
    ],
    apiRoutes: [
      { method: "GET", path: "/api/alerts", auth: "session", description: "List user alerts" },
      { method: "POST", path: "/api/alerts", auth: "session", description: "Create alert" },
      { method: "PUT", path: "/api/alerts", auth: "session", description: "Update alert (pause/resume)" },
      { method: "DELETE", path: "/api/alerts", auth: "session", description: "Delete alert" },
      { method: "POST", path: "/api/alerts/check", auth: "session", description: "Check alerts against current prices" },
    ],
    libs: [],
    patterns: [
      "Free: 2 alerts max; Pro: unlimited + email notifications",
      "Alert states: active, paused, triggered",
      "Email notifications via Resend when alert triggers (Pro only)",
      "Checked against live quotes on portfolio refresh",
    ],
    tech: ["Resend (email)", "Turso DB"],
  },
  {
    id: "economic-indicators",
    name: "Economic Indicators",
    description:
      "US economic data dashboard with GDP, inflation, treasury yields, employment, CPI, retail sales, and more from Alpha Vantage.",
    status: "stable",
    version: "0.9.0",
    components: [
      { path: "src/app/(app)/economic-indicators/page.tsx", description: "Economic indicators page" },
      { path: "src/components/EconomicIndicators.tsx", description: "Indicator cards with charts and AI analysis" },
    ],
    apiRoutes: [
      { method: "GET", path: "/api/economic-indicators", auth: "session", description: "Fetch economic data (Pro, AV)" },
    ],
    libs: [
      { path: "src/lib/api-providers/alphavantage.ts", description: "Economic indicator endpoints" },
    ],
    patterns: [
      "Pro-gated: requires Alpha Vantage + Pro plan",
      "Multiple indicators with interval/maturity selectors",
      "AI explanation button for each indicator",
    ],
    tech: ["Alpha Vantage Economic API", "Recharts", "OpenAI API"],
  },
  {
    id: "admin",
    name: "Admin Panel",
    description:
      "Admin dashboard with user management, external service configuration, feature flags, analytics, and feedback management.",
    status: "stable",
    version: "0.6.0",
    components: [
      { path: "src/app/(app)/admin/page.tsx", description: "Admin page with Users, Settings, Analytics, Feedback tabs" },
    ],
    apiRoutes: [
      { method: "GET", path: "/api/admin/users", auth: "admin", description: "List all users" },
      { method: "POST", path: "/api/admin/users", auth: "admin", description: "Update user role/plan, reset password" },
      { method: "DELETE", path: "/api/admin/users", auth: "admin", description: "Delete user" },
      { method: "GET", path: "/api/admin/analytics", auth: "admin", description: "Usage analytics" },
      { method: "GET", path: "/api/admin/feature-flags", auth: "admin", description: "Get feature flags" },
      { method: "PUT", path: "/api/admin/feature-flags", auth: "admin", description: "Update feature flags" },
      { method: "GET", path: "/api/admin/api-key", auth: "admin", description: "Get Alpha Vantage key" },
      { method: "PUT", path: "/api/admin/api-key", auth: "admin", description: "Set Alpha Vantage key" },
      { method: "GET", path: "/api/admin/openai-key", auth: "admin", description: "Get OpenAI key" },
      { method: "PUT", path: "/api/admin/openai-key", auth: "admin", description: "Set OpenAI key" },
      { method: "GET", path: "/api/admin/resend-key", auth: "admin", description: "Get Resend key" },
      { method: "PUT", path: "/api/admin/resend-key", auth: "admin", description: "Set Resend key" },
      { method: "GET", path: "/api/admin/grafana-url", auth: "admin", description: "Get Grafana push URL" },
      { method: "GET", path: "/api/admin/rate-limits", auth: "admin", description: "View rate limit status" },
      { method: "POST", path: "/api/admin/reset-data", auth: "admin", description: "Reset user data (seed/empty)" },
      { method: "POST", path: "/api/admin/impersonate", auth: "admin", description: "Sign in as a non-admin user (support)" },
      { method: "POST", path: "/api/auth/exit-impersonation", auth: "session", description: "Restore admin session after impersonation" },
      { method: "POST", path: "/api/admin/feedback/send-completion", auth: "admin", description: "Send feedback completion email to user" },
    ],
    libs: [
      { path: "src/lib/auth/guards.ts", description: "requireAdmin guard" },
    ],
    patterns: [
      "Client-side admin check via /api/auth/me — redirects non-admins",
      "Tab-based layout: Users, Settings, Analytics, Feedback",
      "API keys stored in DB settings table, managed by admin only",
      "Feature flags for toggling capabilities without deploy",
    ],
    tech: ["Recharts (analytics charts)", "Turso DB"],
    skillFile: ".cursor/skills/engineer-user-auth/SKILL.md",
  },
  {
    id: "analytics",
    name: "Analytics & Observability",
    description:
      "Event tracking, user analytics, Vercel Analytics, Prometheus metrics endpoint, and Grafana Cloud push-based monitoring.",
    status: "stable",
    version: "0.9.1",
    components: [],
    apiRoutes: [
      { method: "GET", path: "/api/admin/analytics", auth: "admin", description: "Analytics summary dashboard" },
      { method: "POST", path: "/api/events", auth: "session", description: "Track client-side events" },
      { method: "GET", path: "/api/metrics", auth: "public", description: "Prometheus metrics endpoint" },
      { method: "POST", path: "/api/cron/push-metrics", auth: "public", description: "Push metrics to Grafana Cloud" },
      { method: "POST", path: "/api/cron/feedback-pipeline", auth: "public", description: "Feedback auto-ack + Linear issue (cron secret)" },
      { method: "POST", path: "/api/webhooks/linear", auth: "public", description: "Linear webhook — completion email draft (HMAC signature)" },
    ],
    libs: [],
    patterns: [
      "Client events tracked via POST /api/events (page views, CTA clicks, feature usage)",
      "Prometheus /api/metrics endpoint for scraping",
      "Grafana Cloud push via cron job (DB gauges: users, holdings, events)",
      "Landing page analytics: page views, CTA clicks, daily views",
    ],
    tech: ["Vercel Analytics", "Prometheus", "Grafana Cloud"],
    skillFile: ".cursor/skills/analytics-instrumentation/SKILL.md",
  },
  {
    id: "landing",
    name: "Landing Page",
    description:
      "Public marketing page with feature showcase, pricing tiers, FAQ, video tutorial, competitor comparison, and CTA buttons.",
    status: "stable",
    version: "0.11.0",
    components: [
      { path: "src/app/landing/page.tsx", description: "Landing page with features, pricing, FAQ" },
      { path: "src/app/landing/layout.tsx", description: "Landing-specific layout (no app nav)" },
    ],
    apiRoutes: [
      { method: "POST", path: "/api/events", auth: "session", description: "Track landing page analytics" },
    ],
    libs: [],
    patterns: [
      "Separate layout from app — no AppNav, no auth required",
      "FEATURES array drives the feature tab showcase",
      "PRICING tiers define Free vs Pro feature lists",
      "Screenshot-driven feature demos from /public/screenshots/",
    ],
    tech: ["Next.js App Router", "Tailwind CSS", "Framer-like animations"],
  },
];

export const codePatterns = [
  {
    id: "auth-guards",
    name: "Auth Guards",
    description: "Server-side route protection using requireSession and requireAdmin.",
    code: `// In API route handler:
import { requireSession } from "@/lib/auth/guards";

export async function GET(req: NextRequest) {
  const { session, error } = await requireSession(req);
  if (error) return error;
  // session.userId, session.role available
}`,
    usedIn: ["All /api/* routes (except public ones)"],
  },
  {
    id: "client-auth",
    name: "Client Auth Context",
    description: "Access user state in React components via useAuth hook.",
    code: `const { user, isLoading, refreshUser, logout } = useAuth();
// user.role === "admin" for admin checks
// user.plan === "pro" for tier gating`,
    usedIn: ["UserDropdown", "ProCompareCard", "Dashboard", "ProfilePage"],
  },
  {
    id: "portfolio-context",
    name: "Portfolio Context",
    description: "Shared portfolio state providing holdings, quotes, cash, and refresh controls.",
    code: `const { holdings, quotes, cash, refreshAll, isLoading } = usePortfolio();
// All dashboard children consume this context`,
    usedIn: ["Dashboard", "PortfolioTable", "PortfolioSummary", "MarketAndCash"],
  },
  {
    id: "i18n",
    name: "Internationalization",
    description: "Bilingual support (EN/ES) via useI18n hook with typed translation keys.",
    code: `const { t, language, setLanguage } = useI18n();
// t("totalValue") => "Total Value" | "Valor Total"`,
    usedIn: ["All user-facing components"],
  },
  {
    id: "pro-gating",
    name: "Pro Feature Gating",
    description: "Server-side plan check + client-side upsell card for Pro features.",
    code: `// Server: check plan in API route
if (session.plan !== "pro") return NextResponse.json({ error: "Pro required" }, { status: 403 });

// Client: show upsell
if (user.plan !== "pro") return <ProCompareCard reason="..." />;`,
    usedIn: ["Fundamentals", "Intelligence", "Economic Indicators", "Projection", "Unlimited Alerts"],
  },
  {
    id: "lazy-loading",
    name: "Lazy-Loaded Components",
    description: "Dynamic imports for heavy components to reduce initial bundle size.",
    code: `const StockChart = dynamic(() => import("@/components/StockChart"), {
  loading: () => <ChartSkeleton />,
  ssr: false,
});`,
    usedIn: ["Charts", "Modals", "Tool tabs", "Intelligence page"],
  },
  {
    id: "card-ui",
    name: "Card UI Pattern",
    description: "Standard card styling using the global .card class.",
    code: `<div className="card p-4">
  <p className="text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wide">{label}</p>
  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
</div>`,
    usedIn: ["Dashboard stats", "Admin analytics", "Tool summaries"],
  },
  {
    id: "release-notes",
    name: "Release Notes",
    description: "Versioned changelog with EN/ES support displayed at /releasenotes and linked from the app footer.",
    code: `// src/lib/release-notes.ts
{
  version: "0.23.0",
  date: "2026-03-05",
  title: "Simplified Portfolio View",
  titleEs: "Vista de Cartera Simplificada",
  changes: [{ type: "feature", text: "...", textEs: "..." }],
}`,
    usedIn: ["/releasenotes page", "App footer", "Landing page"],
  },
];

export const techStack = [
  { category: "Framework", items: [{ name: "Next.js", version: "^14.2.35", notes: "App Router, Server Components, API Routes" }] },
  { category: "UI", items: [
    { name: "React", version: "^18.3.1", notes: "Client components with hooks" },
    { name: "Tailwind CSS", version: "^3.4.19", notes: "Utility-first styling with dark mode" },
    { name: "Recharts", version: "^3.7.0", notes: "Charts and data visualization" },
  ]},
  { category: "Database", items: [{ name: "Turso (libSQL)", version: "@libsql/client", notes: "SQLite-compatible serverless DB" }] },
  { category: "Auth", items: [
    { name: "jose", version: "JWT", notes: "JWT creation and verification" },
    { name: "bcryptjs", version: "", notes: "Password hashing" },
  ]},
  { category: "Payments", items: [{ name: "Stripe", version: "", notes: "Checkout, Portal, Webhooks" }] },
  { category: "Email", items: [{ name: "Resend", version: "", notes: "Transactional emails (verification, alerts)" }] },
  { category: "AI", items: [{ name: "OpenAI", version: "", notes: "GPT-4 for financial analysis and import extraction" }] },
  { category: "Market Data", items: [
    { name: "Yahoo Finance", version: "", notes: "Free quotes, search, historical data" },
    { name: "Alpha Vantage", version: "", notes: "Fundamentals, intelligence, economic indicators (Pro)" },
  ]},
  { category: "Observability", items: [
    { name: "Vercel Analytics", version: "", notes: "Page-level analytics" },
    { name: "Prometheus", version: "", notes: "Metrics endpoint (/api/metrics)" },
    { name: "Grafana Cloud", version: "", notes: "Push-based metric monitoring" },
  ]},
  { category: "Testing", items: [
    { name: "Vitest", version: "", notes: "Unit and integration tests" },
    { name: "Playwright", version: "", notes: "End-to-end browser tests" },
  ]},
];
