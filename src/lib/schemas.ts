import { z } from "zod";

/* ── Auth ──────────────────────────────────────────────────── */

export const loginSchema = z.object({
  identifier: z.string().min(1, "Email or username is required"),
  password: z.string().min(1, "Password is required"),
  turnstileToken: z.string().optional(),
});

export const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  displayName: z.string().max(100).optional(),
  seedWithData: z.boolean().optional(),
  turnstileToken: z.string().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(4, "New password must be at least 4 characters"),
});

export const deleteAccountSchema = z.object({
  password: z.string().min(1, "Password is required"),
});

export const profileUpdateSchema = z.object({
  email: z.string().email("Invalid email address").optional(),
  displayName: z.string().max(100).optional(),
  avatarUrl: z.string().max(500).optional(),
});

/* ── Holdings ──────────────────────────────────────────────── */

export const createHoldingSchema = z.object({
  ticker: z.string().min(1, "Ticker is required"),
  name: z.string().min(1, "Name is required"),
  shares: z.number().optional().default(0),
  purchasePrice: z.number().optional().default(0),
  displayCurrency: z.string().optional().default("EUR"),
  exchange: z.string().optional().default(""),
  isin: z.string().optional().default(""),
  assetType: z.enum(["stock", "etf"]).optional().default("stock"),
  accountId: z.string().optional().default(""),
});

export const updateHoldingSchema = z.object({
  id: z.string().min(1, "Holding ID is required"),
  updates: z.object({
    ticker: z.string().optional(),
    name: z.string().optional(),
    isin: z.string().optional(),
    assetType: z.enum(["stock", "etf"]).optional(),
    shares: z.number().optional(),
    purchasePrice: z.number().optional(),
    displayCurrency: z.string().optional(),
    exchange: z.string().optional(),
    accountId: z.string().optional(),
    sector: z.string().optional(),
    region: z.string().optional(),
    assetClass: z.string().optional(),
  }),
});

/* ── Transactions ──────────────────────────────────────────── */

export const createTransactionSchema = z.object({
  ticker: z.string().min(1, "Ticker is required"),
  type: z.enum(["buy", "sell", "dividend", "fee"], { message: "Invalid transaction type" }),
  date: z.string().min(1, "Date is required"),
  holdingId: z.string().optional().default(""),
  name: z.string().optional().default(""),
  exchange: z.string().optional().default(""),
  isin: z.string().optional().default(""),
  assetType: z.enum(["stock", "etf"]).optional().default("stock"),
  accountId: z.string().optional().default(""),
  shares: z.number().optional().default(0),
  pricePerShare: z.number().optional().default(0),
  totalAmount: z.number().optional().default(0),
  fees: z.number().optional().default(0),
  taxes: z.number().optional().default(0),
  currency: z.string().optional().default("EUR"),
  displayCurrency: z.string().optional(),
  exchangeRateEur: z.number().optional(),
  notes: z.string().optional().default(""),
  sourceRef: z.string().optional().default(""),
});

/* ── Cash ──────────────────────────────────────────────────── */

export const createCashSchema = z.object({
  name: z.string().min(1, "Name is required"),
  amountEUR: z.number().min(0, "Amount must be non-negative"),
});

export const updateCashSchema = z.object({
  id: z.string().min(1, "Cash entry ID is required"),
  updates: z.object({
    name: z.string().min(1).optional(),
    amountEUR: z.number().min(0).optional(),
  }),
});

/* ── User Settings ─────────────────────────────────────────── */

export const userSettingsSchema = z.object({
  provider: z.enum(["yahoo", "alphavantage"]).optional(),
  language: z.enum([
    "en", "es", "fr", "de", "it", "pt", "nl", "pl",
    "cs", "sk", "hu", "ro", "bg", "hr", "sl", "el",
    "sv", "da", "fi", "et", "lv", "lt", "ga", "mt",
    "nb", "uk", "tr", "sr", "is", "sq", "bs", "mk",
    "be", "ca", "cy",
  ]).optional(),
  refreshInterval: z.union([z.literal(15), z.literal(30), z.literal(60)]).optional(),
});

/* ── Alerts ────────────────────────────────────────────────── */

export const createAlertSchema = z.object({
  ticker: z.string().min(1, "Ticker is required"),
  name: z.string().optional().default(""),
  condition: z.enum(["above", "below"], { message: "Condition must be 'above' or 'below'" }),
  threshold: z.number().positive("Threshold must be positive"),
  currency: z.string().optional().default("USD"),
});

export const toggleAlertSchema = z.object({
  id: z.string().min(1, "Alert ID is required"),
  active: z.boolean(),
});

/* ── Accounts ──────────────────────────────────────────────── */

export const createAccountSchema = z.object({
  name: z.string().min(1, "Account name is required"),
  broker: z.string().optional().default(""),
  currency: z.string().optional().default("EUR"),
});

/* ── Watchlist ─────────────────────────────────────────────── */

export const addWatchlistSchema = z.object({
  ticker: z.string().min(1, "Ticker is required"),
  name: z.string().optional().default(""),
  exchange: z.string().optional().default(""),
});

/* ── Rebalance ─────────────────────────────────────────────── */

export const rebalanceTargetSchema = z.object({
  label: z.string().min(1, "Label is required"),
  targetPercent: z.number().min(0).max(100),
  category: z.string().optional().default("assetClass"),
});

/* ── Feedback ──────────────────────────────────────────────── */

export const createFeedbackSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  message: z.string().min(1, "Message is required"),
});

export const replyFeedbackSchema = z.object({
  id: z.string().min(1, "Feedback ID is required"),
  reply: z.string().optional().default(""),
  status: z.enum(["open", "answered", "closed"]),
});

/* ── Admin ─────────────────────────────────────────────────── */

export const adminUserActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("setRole"),
    userId: z.string().min(1),
    role: z.enum(["admin", "user"]),
  }),
  z.object({
    action: z.literal("setPlan"),
    userId: z.string().min(1),
    plan: z.enum(["free", "pro"]),
  }),
  z.object({
    action: z.literal("setPassword").optional().default("setPassword"),
    userId: z.string().min(1),
    newPassword: z.string().min(4, "Password must be at least 4 characters"),
  }),
]);

export const adminResetDataSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  mode: z.enum(["seed", "empty"]),
});

export const featureFlagSchema = z.object({
  flag: z.enum(["alerts_enabled", "csv_export_enabled"]),
  enabled: z.boolean(),
});

export const apiKeySchema = z.object({
  apiKey: z.string(),
});

/* ── Billing ───────────────────────────────────────────────── */

export const checkoutSchema = z.object({
  interval: z.enum(["monthly", "annual"]).optional().default("monthly"),
});

/* ── Reset Portfolio ───────────────────────────────────────── */

export const resetPortfolioSchema = z.object({
  mode: z.enum(["empty", "seed"]).optional().default("empty"),
});

/* ── Analytics ─────────────────────────────────────────────── */

const ALLOWED_EVENTS = [
  "stock_view", "ai_analysis", "page_view", "settings_changed",
  "theme_toggled", "billing_checkout_started", "billing_checkout_completed",
  "billing_portal_opened", "paywall_shown", "upgrade_compare_shown",
  "upgrade_compare_clicked", "portfolio_period_returns_viewed",
  "alert_created", "alert_triggered", "alert_limit_reached",
  "alert_email_sent", "csv_exported",
] as const;

export const trackEventSchema = z.object({
  event: z.enum(ALLOWED_EVENTS, { message: "Unknown event type" }),
  metadata: z.record(z.string(), z.string()).optional(),
});

const LANDING_EVENTS = [
  "landing_page_view", "landing_feature_tab", "landing_cta_click",
  "landing_section_view", "landing_pricing_view", "landing_faq_open",
] as const;

export const landingEventSchema = z.object({
  event: z.enum(LANDING_EVENTS, { message: "Unknown landing event" }),
  metadata: z.record(z.string(), z.string().max(128)).optional(),
});

/* ── Import Portfolio (JSON path) ──────────────────────────── */

export const importPortfolioJsonSchema = z.object({
  csvText: z.string().min(1, "CSV text is required"),
});
