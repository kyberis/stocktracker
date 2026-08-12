import { z } from "zod";
import {
  AI_FLOW_KEYS,
  ALLOWED_AI_MODELS,
  type AiFlowKey,
  type AllowedAiModel,
} from "@/lib/ai-models";
import type { ToolTabId } from "@/lib/tools-registry";
import { TOOLS_CATALOG } from "@/lib/tools-registry";

const VALID_FAVORITE_TOOL_ID = new Set<ToolTabId>(TOOLS_CATALOG.map((e) => e.id));

/* ── Disposable / fake-email domain blocklist ─────────────── */

const BLOCKED_EMAIL_DOMAINS = new Set([
  // Guerrilla Mail family
  "guerrillamail.com",
  "guerrillamail.de",
  "guerrillamail.info",
  "guerrillamail.net",
  "guerrillamail.org",
  "guerrillamailblock.com",
  "grr.la",
  "sharklasers.com",

  // Mailinator family
  "mailinator.com",
  "mailinator.net",
  "mailinator2.com",

  // Temp / disposable mail services
  "tempmail.com",
  "temp-mail.org",
  "temp-mail.io",
  "tempail.com",
  "tempr.email",
  "tmpmail.org",
  "tmpmail.net",
  "tmail.ws",
  "10minutemail.com",
  "10minutemail.net",
  "minutemail.com",
  "throwaway.email",
  "throwaway.com",
  "yopmail.com",
  "yopmail.fr",
  "dispostable.com",
  "mailnesia.com",
  "maildrop.cc",
  "discard.email",
  "trashmail.com",
  "trashmail.me",
  "trashmail.net",
  "trashmail.org",
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
  "moakt.com",
  "mail7.io",
  "emailfake.com",
  "generator.email",

  // User-reported spam / fake-email domains
  "email.com",
  "sharebot.net",
  "ymail.com",

  // Additional disposable providers
  "guerrillamail.biz",
  "tempinbox.com",
  "tempmailaddress.com",
  "tempmails.net",
  "disposableemailaddresses.emailmiser.com",
  "mailtemp.info",
  "mt2015.com",
  "thankyou2010.com",
  "trash-mail.com",
  "trashymail.com",
  "trashymail.net",
  "bugmenot.com",
  "binkmail.com",
  "safetymail.info",
  "filzmail.com",
  "mailexpire.com",
  "tempmailo.com",
  "tempomail.fr",
  "spambox.us",
  "spamfree24.org",
  "getairmail.com",
  "meltmail.com",
  "throwam.com",
  "mailnull.com",
  "jetable.org",
  "incognitomail.org",
  "anonymbox.com",
  "mintemail.com",
  "armyspy.com",
  "cuvox.de",
  "dayrep.com",
  "einrot.com",
  "fleckens.hu",
  "gustr.com",
  "jourrapide.com",
  "rhyta.com",
  "superrito.com",
  "teleworm.us",
  "courrieltemporaire.com",
  "nomail.xl.cx",
  "mailforspam.com",
  "safetypost.de",
  "despammed.com",
  "devnullmail.com",
  "spamcero.com",
  "spamcorptastic.com",
  "spamherelots.com",
  "spamhereplease.com",
  "spamthisplease.com",
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

export const adminImpersonateSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
});

export const signupSchema = z.object({
  email: safeEmail,
  password: z.string().min(6, "Password must be at least 6 characters"),
  displayName: z.string().max(100).optional(),
  turnstileToken: z.string().optional(),
  referralCode: z.string().max(16).optional(),
  attribution: z.object({
    source: z.string().max(64).optional(),
    medium: z.string().max(64).optional(),
    campaign: z.string().max(128).optional(),
    term: z.string().max(128).optional(),
    content: z.string().max(128).optional(),
    landingPath: z.string().max(256).optional(),
    referrer: z.string().max(512).optional(),
    capturedAt: z.string().max(64).optional(),
  }).optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(4, "New password must be at least 4 characters"),
});

export const deleteAccountSchema = z.object({
  password: z.string().min(1, "Password is required").optional(),
});

export const confirmDeleteAccountSchema = z.object({
  token: z.string().min(1, "Token is required"),
});

export const profileUpdateSchema = z.object({
  email: safeEmail.optional(),
  displayName: z.string().max(100).optional(),
  avatarUrl: z.string().max(500).optional(),
  devicePortfolioId: z.string().optional(),
  taxResidency: z.string().max(2).optional(),
});

export const onboardingSchema = z.object({
  displayName: z.string().max(100).optional(),
  defaultCurrency: z.string().max(3).optional(),
  taxResidency: z.string().max(2).optional(),
  experienceLevel: z.enum(["beginner", "intermediate", "experienced", "professional"]).optional(),
  importMethod: z.enum(["broker_sync", "csv", "ai", "skip"]).optional(),
  useCase: z.array(z.enum(["track_portfolio", "dividend_income", "tax_reporting", "research_stocks"])).optional(),
  referralSource: z.enum(["google", "social_media", "twitter", "youtube", "reddit", "friend", "other"]).optional(),
  activateTrial: z.boolean().optional(),
});

/* ── Holdings ──────────────────────────────────────────────── */

export const createHoldingSchema = z.object({
  ticker: z.string().min(1, "Ticker is required"),
  name: z.string().min(1, "Name is required"),
  shares: z.number().positive("Shares must be greater than 0"),
  purchasePrice: z.number().optional().default(0),
  purchaseDate: z.string().optional(),
  displayCurrency: z.string().optional().default("EUR"),
  exchange: z.string().optional().default(""),
  isin: z.string().optional().default(""),
  assetType: z.enum(["stock", "etf", "crypto", "fund"]).optional().default("stock"),
  accountId: z.string().optional().default(""),
});

export const updateHoldingSchema = z.object({
  id: z.string().min(1, "Holding ID is required"),
  updates: z.object({
    ticker: z.string().optional(),
    name: z.string().optional(),
    isin: z.string().optional(),
    assetType: z.enum(["stock", "etf", "crypto", "fund"]).optional(),
    shares: z.number().optional(),
    purchasePrice: z.number().optional(),
    displayCurrency: z.string().optional(),
    exchange: z.string().optional(),
    accountId: z.string().optional(),
    sector: z.string().optional(),
    region: z.string().optional(),
    assetClass: z.string().optional(),
    tags: z.array(z.string().max(40)).max(20).optional(),
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
  assetType: z.enum(["stock", "etf", "crypto", "fund"]).optional().default("stock"),
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

/* ── Cash / Manual Assets ─────────────────────────────────── */

export const manualAssetTypeSchema = z.enum(["cash", "real_estate", "savings", "pension", "fixed_return"]);

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD");

export const createCashSchema = z.object({
  name: z.string().min(1, "Name is required"),
  amountEUR: z.number().min(0, "Amount must be non-negative"),
  type: manualAssetTypeSchema.optional().default("cash"),
  displayCurrency: z.string().optional().default("EUR"),
  displayAmount: z.number().min(0).optional().default(0),
  notes: z.string().optional().default(""),
  valuationDate: z.string().optional().default(""),
  startDate: z.string().optional().default(""),
  termMonths: z.number().int().optional().default(0),
  totalReturnPct: z.number().optional().default(0),
}).superRefine((data, ctx) => {
  if (data.type !== "fixed_return") return;
  if (!isoDateSchema.safeParse(data.startDate).success) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "startDate is required (YYYY-MM-DD)", path: ["startDate"] });
  }
  if (!data.termMonths || data.termMonths <= 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "termMonths must be > 0", path: ["termMonths"] });
  }
  if (data.totalReturnPct == null || data.totalReturnPct < 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "totalReturnPct must be >= 0", path: ["totalReturnPct"] });
  }
});

export const updateCashSchema = z.object({
  id: z.string().min(1, "Cash entry ID is required"),
  updates: z.object({
    name: z.string().min(1).optional(),
    amountEUR: z.number().min(0).optional(),
    type: manualAssetTypeSchema.optional(),
    displayCurrency: z.string().optional(),
    displayAmount: z.number().min(0).optional(),
    notes: z.string().optional(),
    valuationDate: z.string().optional(),
    startDate: z.string().optional(),
    termMonths: z.number().int().optional(),
    totalReturnPct: z.number().optional(),
  }).superRefine((updates, ctx) => {
    if (updates.type !== "fixed_return" && updates.startDate == null && updates.termMonths == null && updates.totalReturnPct == null) {
      return;
    }
    // When patching fixed-return fields, validate any provided values
    if (updates.startDate != null && updates.startDate !== "" && !isoDateSchema.safeParse(updates.startDate).success) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "startDate must be YYYY-MM-DD", path: ["startDate"] });
    }
    if (updates.termMonths != null && updates.termMonths <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "termMonths must be > 0", path: ["termMonths"] });
    }
    if (updates.totalReturnPct != null && updates.totalReturnPct < 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "totalReturnPct must be >= 0", path: ["totalReturnPct"] });
    }
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

export const favoriteToolIdsBodySchema = z.object({
  favoriteToolIds: z.array(z.string()).refine(
    (arr) => arr.every((id) => VALID_FAVORITE_TOOL_ID.has(id as ToolTabId)),
    { message: "Invalid tool id" }
  ),
});

export const aidLayoutBodySchema = z.object({
  main: z.array(z.string()),
  sidebar: z.array(z.string()),
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
  source: z
    .enum(["alerts-tab", "watchlist", "stock-row", "stock-drawer", "profile", "strategies-tool"])
    .optional()
    .default("alerts-tab"),
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

export const upsertInvestmentStrategySchema = z.object({
  ticker: z.string().min(1),
  exchange: z.string(),
  name: z.string().optional().default(""),
  purchasePrice: z.number().nonnegative().optional().default(0),
  currency: z.string().min(1).default("USD"),
  targetPrice: z.number().nonnegative().optional().default(0),
  stopLossPrice: z.number().nonnegative().optional().default(0),
  targetAlertId: z.string().optional().default(""),
  stopAlertId: z.string().optional().default(""),
});

/* ── Notification Preferences ──────────────────────────────── */

export const updateNotificationPrefsSchema = z.object({
  alertChannels: z.string().optional(),
  alertDeviceEnabled: z.boolean().optional(),
  emailNotificationsEnabled: z.boolean().optional(),
  telegramDisconnect: z.boolean().optional(),
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

export const sendFeedbackCompletionSchema = z.object({
  id: z.string().min(1, "Feedback ID is required"),
  /** When omitted, uses stored `completion_email_draft`. */
  html: z.string().max(500_000).optional(),
  subject: z.string().min(1).max(200).optional(),
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
  z.object({
    action: z.literal("resetChecklist"),
    userId: z.string().min(1),
  }),
  z.object({
    action: z.literal("grantMembership"),
    userId: z.string().min(1),
    plan: z.literal("pro"),
    days: z.number().int().min(1).max(730),
  }),
]);

export const adminResetDataSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  mode: z.enum(["seed", "empty"]),
});

const PLATFORM_FEATURE_ENUM = z.enum([
  "alerts_enabled", "csv_export_enabled", "apple_signin_enabled", "device_enabled",
  "mobile_app_enabled", "telegram_enabled",
  "tool_transactions_enabled", "tool_dividends_enabled", "tool_performance_enabled",
  "tool_taxonomy_enabled", "tool_rebalancing_enabled", "tool_accounts_enabled",
  "tool_watchlist_enabled",
  "support_chat_enabled",
  "pro_trial_enabled",
  "ai_report_enabled",
  "portfolio_v2_chart_enabled",
  "social_network_enabled",
  "market_data_fmp_search",
  "market_data_fmp_fundamentals",
  "market_data_fmp_intelligence",
  "market_data_fmp_portfolio_news",
  "market_data_fmp_economic_indicators",
  "market_data_fmp_crypto",
  "market_data_fmp_dividends",
  "market_data_fmp_event_sync",
  "market_data_alpha_vantage",
  "mcp_fmp_proxy",
  "weekly_digest_enabled",
  "daily_digests_enabled",
  "aid_beta",
  "home_v2",
  "classic_home",
  "commerce_enabled",
  "tool_tax_reports_enabled",
  "tool_simulator_enabled",
  "tool_planning_enabled",
  "investment_screening_enabled",
  "screening_dev_lab_enabled",
  "screening_pipeline_real_enabled",
  "screening_ir_agent_enabled",
  "screening_agents_v2_enabled",
  "screening_qa_enabled",
  "screening_tavily_research_enabled",
  "screening_estebaranz_eval_enabled",
  "portfolio_anomaly_agent",
]);

export const featureFlagSchema = z.object({
  flag: PLATFORM_FEATURE_ENUM,
  enabled: z.boolean(),
});

export const featureFlagOverrideSchema = z.object({
  flag: PLATFORM_FEATURE_ENUM,
  userId: z.string().min(1, "User ID is required"),
  enabled: z.boolean(),
});

export const featureFlagOverrideDeleteSchema = z.object({
  flag: PLATFORM_FEATURE_ENUM,
  userId: z.string().min(1, "User ID is required"),
});

export const apiKeySchema = z.object({
  apiKey: z.string(),
});

/* ── Billing ───────────────────────────────────────────────── */

/** @deprecated Legacy checkout body — Pro checkout moved to user.trefolio.com */
export const checkoutSchema = z.object({
  plan: z.literal("pro").optional().default("pro"),
  interval: z.enum(["monthly", "annual"]).optional().default("monthly"),
  deviceGrant: z.boolean().optional(),
});

/* ── Reset Portfolio ───────────────────────────────────────── */

export const resetPortfolioSchema = z.object({
  mode: z.literal("empty").optional().default("empty"),
});

/* ── Analytics ─────────────────────────────────────────────── */

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

/* ── Support Chat Admin Config ─────────────────────────────── */

export const supportChatConfigSchema = z.object({
  starterDailyLimit: z.number().int().min(1).max(100),
  proDailyLimit: z.number().int().min(1).max(200),
  welcomeMessage: z.string().max(500).optional(),
  customInstructions: z.string().max(2000).optional(),
});

export const supportChatMessageSchema = z.object({
  conversationId: z.string().min(1).max(64),
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().min(1).max(4000),
  })).min(1).max(50),
  language: z.string().max(5).optional(),
  portfolioContext: z.object({
    holdingsCount: z.number().int().min(0),
    totalValue: z.number().min(0),
    currency: z.string().max(5),
    plan: z.string().max(10),
  }).optional(),
});

/* ── Satisfaction survey ──────────────────────── */

export const satisfactionDraftSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
});

export const satisfactionSubmitSchema = z.object({
  action: z.literal("submit"),
});

export const satisfactionDismissSchema = z.object({
  action: z.literal("dismiss"),
});

/* ── AI Model Config (Admin) ───────────────────────────────── */

const AI_FLOW_KEY_ENUM = z.enum(
  AI_FLOW_KEYS as unknown as [AiFlowKey, ...AiFlowKey[]],
);

const ALLOWED_MODEL_ENUM = z.enum(
  ALLOWED_AI_MODELS as unknown as [AllowedAiModel, ...AllowedAiModel[]],
);

export const aiModelConfigSchema = z.record(AI_FLOW_KEY_ENUM, ALLOWED_MODEL_ENUM);

export const aiCompareSchema = z.object({
  promptSystem: z.string().min(1).max(50_000),
  promptUser: z.string().min(1).max(50_000),
  flowKey: AI_FLOW_KEY_ENUM,
  models: z.array(ALLOWED_MODEL_ENUM).min(1).max(4),
});

/** Portfolio chart Q&A — context is rebuilt client-side each request; keep samples bounded. */
export const chartChatRequestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string().min(1).max(4000),
    }),
  ).min(1).max(24),
  language: z.string().max(5).optional(),
  context: z.object({
    range: z.string().max(16),
    chartMode: z.enum(["value", "performance"]),
    baseCurrency: z.string().max(8),
    portfolioId: z.string().max(64).optional(),
    displayNoteInterpolated: z.boolean().optional(),
    samples: z
      .array(
        z.object({
          date: z.string().max(40),
          value: z.number(),
          invested: z.number(),
          performancePct: z.number().optional(),
        }),
      )
      .max(96),
    events: z
      .array(
        z.object({
          id: z.string().max(40).optional(),
          date: z.string().max(16),
          type: z.string().max(12),
          ticker: z.string().max(32),
          shares: z.number(),
          totalAmount: z.number().optional(),
          currency: z.string().max(8).optional(),
        }),
      )
      .max(120),
    stats: z.object({
      firstDate: z.string().max(40),
      lastDate: z.string().max(40),
      startValue: z.number(),
      endValue: z.number(),
      startInvested: z.number(),
      endInvested: z.number(),
      periodReturnPct: z.number().optional(),
      investedDeltas: z
        .array(
          z.object({
            fromDate: z.string().max(40),
            toDate: z.string().max(40),
            delta: z.number(),
          }),
        )
        .max(24)
        .optional(),
    }),
  }),
});

/** Performance-matrix cell explainer — client sends deterministic breakdown; server narrates. */
export const matrixCellExplainRequestSchema = z.object({
  language: z.string().max(5).optional(),
  breakdown: z.object({
    assetKey: z.enum(["all", "stock", "etf", "fund", "crypto", "fixed_return"]),
    period: z.enum([
      "today",
      "oneWeek",
      "oneMonth",
      "ytd",
      "oneYear",
      "threeYear",
      "fiveYear",
      "tenYear",
    ]),
    displayMode: z.enum(["percent", "currency"]),
    baseCurrency: z.string().max(8),
    periodStart: z.string().max(16).nullable(),
    periodEnd: z.string().max(16),
    current: z.number(),
    past: z.number().nullable(),
    netCashFlow: z.number(),
    pl: z.number().nullable(),
    pct: z.number().nullable(),
    dayAbs: z.number().nullable(),
    dayPct: z.number().nullable(),
    notCostBasis: z.literal(true),
    costBasis: z.number().nullable(),
    unrealizedVsCost: z.number().nullable(),
    formula: z.string().max(400),
    warnings: z.array(z.string().max(400)).max(12),
    transactions: z
      .array(
        z.object({
          id: z.string().max(64),
          date: z.string().max(16),
          type: z.string().max(12),
          ticker: z.string().max(32),
          assetType: z.string().max(16).nullable(),
          amountBase: z.number(),
          flowBase: z.number(),
        }),
      )
      .max(80),
  }),
});

export const newsArticleSummarySchema = z.object({
  title: z.string().min(1).max(500),
  summary: z.string().max(8000).optional().default(""),
  source: z.string().max(200).optional().default(""),
  url: z.string().url().max(4000),
  publishedAt: z.string().max(80).optional(),
  language: z.string().max(12).optional(),
});

export const aiClassifyHoldingSchema = z.object({
  holdingId: z.string().min(1).max(64),
});
