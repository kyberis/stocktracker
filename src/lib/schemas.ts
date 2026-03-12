import { z } from "zod";

/* ── Disposable / fake-email domain blocklist ─────────────── */

const BLOCKED_EMAIL_DOMAINS = new Set([
  "mailinator.com",
  "guerrillamail.com",
  "guerrillamail.de",
  "grr.la",
  "guerrillamailblock.com",
  "tempmail.com",
  "temp-mail.org",
  "throwaway.email",
  "throwaway.com",
  "yopmail.com",
  "yopmail.fr",
  "sharklasers.com",
  "guerrillamail.info",
  "guerrillamail.net",
  "dispostable.com",
  "mailnesia.com",
  "maildrop.cc",
  "discard.email",
  "trashmail.com",
  "trashmail.me",
  "trashmail.net",
  "trashmail.org",
  "10minutemail.com",
  "10minutemail.net",
  "minutemail.com",
  "tempail.com",
  "tempr.email",
  "temp-mail.io",
  "mohmal.com",
  "fakeinbox.com",
  "mailcatch.com",
  "nada.email",
  "getnada.com",
  "emailondeck.com",
  "spamgourmet.com",
  "mytemp.email",
  "burnermail.io",
  "inboxkitten.com",
  "harakirimail.com",
  "mailsac.com",
  "crazymailing.com",
  "tmail.ws",
  "tmpmail.org",
  "tmpmail.net",
  "moakt.com",
  "mail7.io",
  "emailfake.com",
  "generator.email",
  "guerrillamail.org",
]);

export function isBlockedEmailDomain(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  return !!domain && BLOCKED_EMAIL_DOMAINS.has(domain);
}

const BLOCKED_DOMAIN_MSG = "Disposable email addresses are not allowed. Please use a real email.";

const safeEmail = z
  .string()
  .email("Invalid email address")
  .refine((e) => !isBlockedEmailDomain(e), { message: BLOCKED_DOMAIN_MSG });

/* ── Auth ──────────────────────────────────────────────────── */

export const loginSchema = z.object({
  identifier: z.string().min(1, "Email or username is required"),
  password: z.string().min(1, "Password is required"),
  turnstileToken: z.string().optional(),
});

export const signupSchema = z.object({
  email: safeEmail,
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
  email: safeEmail.optional(),
  displayName: z.string().max(100).optional(),
  avatarUrl: z.string().max(500).optional(),
  devicePortfolioId: z.string().optional(),
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
  assetType: z.enum(["stock", "etf", "crypto"]).optional().default("stock"),
  accountId: z.string().optional().default(""),
});

export const updateHoldingSchema = z.object({
  id: z.string().min(1, "Holding ID is required"),
  updates: z.object({
    ticker: z.string().optional(),
    name: z.string().optional(),
    isin: z.string().optional(),
    assetType: z.enum(["stock", "etf", "crypto"]).optional(),
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
  assetType: z.enum(["stock", "etf", "crypto"]).optional().default("stock"),
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

export const updateTransactionSchema = z.object({
  id: z.string().min(1, "Transaction ID is required"),
  updates: z.object({
    type: z.enum(["buy", "sell", "dividend", "fee"]).optional(),
    date: z.string().min(1).optional(),
    shares: z.number().optional(),
    pricePerShare: z.number().optional(),
    totalAmount: z.number().optional(),
    fees: z.number().optional(),
    taxes: z.number().optional(),
    notes: z.string().optional(),
  }),
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
  language: z.enum([
    "en", "es", "fr", "de", "it", "pt", "nl", "pl",
    "cs", "sk", "hu", "ro", "bg", "hr", "sl", "el",
    "sv", "da", "fi", "et", "lv", "lt", "ga", "mt",
    "nb", "uk", "tr", "sr", "is", "sq", "bs", "mk",
    "be", "ca", "cy",
  ]).optional(),
  refreshInterval: z.union([z.literal(15), z.literal(30), z.literal(60)]).optional(),
  dashboardTheme: z.enum(["default", "terminal", "canvas", "studio"]).optional(),
  defaultCurrency: z.enum([
    "EUR", "USD", "GBP", "CHF", "SEK", "NOK", "DKK", "CAD",
    "AUD", "NZD", "JPY", "PLN", "CZK", "HUF", "RON",
    "SGD", "HKD", "ZAR", "TRY", "BRL", "MXN",
  ]).optional(),
});

/* ── Alerts ────────────────────────────────────────────────── */

export const createAlertSchema = z.object({
  ticker: z.string().optional().default(""),
  name: z.string().optional().default(""),
  condition: z.enum(["above", "below"], { message: "Condition must be 'above' or 'below'" }),
  threshold: z.number().nonnegative("Threshold must be non-negative").optional().default(0),
  currency: z.string().optional().default("USD"),
  alertType: z.enum(["threshold", "percent_change"]).optional().default("threshold"),
  percentBasis: z.enum(["daily", "purchase", ""]).optional().default(""),
  percentValue: z.number().nonnegative("Percent value must be non-negative").optional().default(0),
  isPortfolioWide: z.boolean().optional().default(false),
  portfolioId: z.string().optional().default(""),
  source: z.enum(["alerts-tab", "watchlist", "stock-row", "stock-drawer", "profile"]).optional().default("alerts-tab"),
}).refine(
  (data) => {
    if (data.alertType === "threshold") return data.ticker.length > 0 && data.threshold > 0;
    if (data.alertType === "percent_change") return data.percentValue > 0 && (data.percentBasis === "daily" || data.percentBasis === "purchase");
    return true;
  },
  { message: "Invalid alert configuration" }
);

export const toggleAlertSchema = z.object({
  id: z.string().min(1, "Alert ID is required"),
  active: z.boolean(),
});

/* ── Notification Preferences ──────────────────────────────── */

export const updateNotificationPrefsSchema = z.object({
  alertChannels: z.string().optional(),
  whatsappPhone: z.string().optional(),
  alertDeviceEnabled: z.boolean().optional(),
});

export const whatsappVerifySchema = z.object({
  phone: z.string().min(10, "Phone number must be at least 10 characters"),
});

export const whatsappConfirmSchema = z.object({
  code: z.string().min(4, "Verification code required"),
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
  type: z.enum(["feedback", "bug"]).optional().default("feedback"),
  userContext: z.string().optional().default(""),
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
    plan: z.enum(["free", "starter", "pro"]),
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
  flag: z.enum([
    "alerts_enabled", "csv_export_enabled", "apple_signin_enabled", "device_enabled",
    "whatsapp_enabled",
    "tool_transactions_enabled", "tool_dividends_enabled", "tool_performance_enabled",
    "tool_taxonomy_enabled", "tool_rebalancing_enabled", "tool_accounts_enabled",
    "tool_watchlist_enabled",
  ]),
  enabled: z.boolean(),
});

export const apiKeySchema = z.object({
  apiKey: z.string(),
});

/* ── Billing ───────────────────────────────────────────────── */

export const checkoutSchema = z.object({
  plan: z.enum(["starter", "pro"]).optional().default("pro"),
  interval: z.enum(["monthly", "annual"]).optional().default("monthly"),
  deviceGrant: z.boolean().optional(),
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
  "diversification_tab_viewed", "dividends_tab_viewed",
  "stealth_mode_enabled", "stealth_mode_disabled",
  "exdiv_calendar_viewed", "exdiv_ticker_expanded",
  "metrics_tab_viewed", "metrics_lock_clicked",
  "growth_tab_viewed", "growth_range_changed",
  "portfolio_share_created", "portfolio_share_revoked",
  "portfolio_share_viewed", "share_signup_cta_clicked",
  "transaction_pl_viewed",
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
