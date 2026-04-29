/**
 * Centralized platform limits for rate limiting and capacity management.
 * Tune these values as the subscriber base and provider plans change.
 *
 * The current model is "universal access with quotas":
 *   - Free users can access EVERY feature.
 *   - What differs between Free and Pro is HOW MANY TIMES per month they
 *     can call cost-bearing features (OpenAI + paid market-data APIs).
 *   - Free also has gentler soft caps for storage-heavy entities (holdings,
 *     portfolios, alerts) to prevent abuse.
 *
 * See `FEATURE_QUOTAS` and `SOFT_CAPS` below.
 */
export const PLATFORM_LIMITS = {
  /** Hard cap on concurrent Pro subscribers. Block checkout when reached. */
  MAX_PRO_SUBSCRIBERS: 500,

  /** Alpha Vantage plan: 75 requests/minute (shared across all users). */
  AV_GLOBAL_PER_MINUTE: 75,

  /** Per-user AV budget per minute. Prevents a single user hogging the pool. */
  AV_PER_USER_PER_MINUTE: 15,

  /** Per-user FMP budget per minute. */
  FMP_PER_USER_PER_MINUTE: 15,

  /**
   * Pro daily AI consultation cap (anti-burst).
   * Used in addition to monthly quota to smooth out usage spikes.
   */
  AI_PRO_DAILY_LIMIT: 50,

  /** Per-call internal token cap (input+output combined). Anti-abuse. */
  AI_PER_CALL_TOKEN_CAP: 6_000,

  /** Max AI-powered portfolio imports per day (legacy global cap). */
  AI_IMPORT_DAILY_LIMIT: 5,

  /** Signup attempts per IP per hour. */
  AUTH_SIGNUP_PER_IP_PER_HOUR: 5,

  /** Login attempts per IP per 15 minutes. */
  AUTH_LOGIN_PER_IP_PER_15MIN: 10,

  /** Device bearer-token auth attempts per IP per 15 minutes. */
  DEVICE_AUTH_PER_IP_PER_15MIN: 10,

  /**
   * Global cap on OpenAI API calls per calendar month (all endpoints combined).
   * Prevents runaway costs from ad-driven traffic spikes.
   */
  OPENAI_MONTHLY_CALL_CAP: 10_000,

  /**
   * Global cap on OpenAI tokens per calendar month (all endpoints combined).
   * ~$10 at gpt-4o-mini rates.
   */
  OPENAI_MONTHLY_TOKEN_CAP: 50_000_000,

  /**
   * WhatsApp alert messaging caps.
   * Budget target ≈ $65/month at $0.0221/msg ($0.0171 Meta + $0.005 Twilio).
   */
  WA_PER_USER_DAILY: 5,
  WA_PER_USER_MONTHLY: 30,
  WA_GLOBAL_MONTHLY: 3_000,

  /** Days to retain analytics_events rows before automatic purge. */
  ANALYTICS_RETENTION_DAYS: 90,

  /** Default support chat message limits per day (overridable by admin). */
  SUPPORT_CHAT_FREE_DAILY_DEFAULT: 5,
  SUPPORT_CHAT_PRO_DAILY_DEFAULT: 50,

  /** Max total reward days a single referrer can accumulate (12 months). */
  REFERRAL_MAX_REWARD_DAYS: 365,

  /** Max successful referrals per referrer in a rolling 30-day window. */
  REFERRAL_VELOCITY_PER_30D: 5,

  /** Days of Pro access granted per successful referral. */
  REFERRAL_REWARD_DAYS: 30,

  /** Legacy AI token monthly limits — retained for analytics/exposure only. */
  AI_FREE_MONTHLY_TOKEN_LIMIT: 90_000,
  AI_PRO_MONTHLY_TOKEN_LIMIT: 3_000_000,
} as const;

export type RateLimitProvider = "alphavantage" | "fmp" | "openai" | "openai_import" | "support_chat";

/**
 * Reset window for a feature quota.
 *  - "month": resets at the start of each calendar month (UTC)
 *  - "day":   resets at midnight UTC
 *  - "year":  resets at the start of each calendar year (UTC)
 */
export type QuotaWindow = "month" | "day" | "year";

/**
 * Every cost-bearing capability that has a per-user quota.
 *
 * The id MUST be stable: it's used as the `provider` column in the
 * `rate_limits` table. Renaming an id resets users' counters silently.
 */
export type FeatureQuotaKey =
  // AI-powered features (OpenAI cost)
  | "ai_consult"
  | "ai_portfolio_review"
  | "ai_import"
  | "support_chat"
  // Premium market-data features (FMP / AV / Finnhub cost)
  | "fundamentals"
  | "etf_holdings"
  | "intelligence"
  | "economic_indicators"
  | "screener"
  | "stock_evaluation"
  | "crypto_pro"
  | "tax_report"
  | "portfolio_score"
  | "csv_export";

export interface FeatureQuotaConfig {
  /** Free-tier monthly (or daily/yearly) cap. */
  free: number;
  /** Pro-tier monthly (or daily/yearly) cap. */
  pro: number;
  /** Reset window. */
  window: QuotaWindow;
  /** Human-readable label for UI / paywall messages. */
  label: string;
}

/**
 * Per-feature quotas. Free users keep access to every feature in the app —
 * the quota dictates how often they can call the cost-bearing endpoint.
 *
 * To tune: bump these constants. No schema or migration required.
 */
export const FEATURE_QUOTAS: Record<FeatureQuotaKey, FeatureQuotaConfig> = {
  // ── AI features ───────────────────────────────────────────
  ai_consult: { free: 15, pro: 500, window: "month", label: "AI consultations" },
  ai_portfolio_review: { free: 1, pro: 15, window: "month", label: "AI portfolio reviews" },
  ai_import: { free: 3, pro: 20, window: "day", label: "AI imports" },
  support_chat: { free: 5, pro: 50, window: "day", label: "Support chat messages" },

  // ── Premium market-data features ──────────────────────────
  fundamentals: { free: 20, pro: 500, window: "month", label: "Fundamentals lookups" },
  etf_holdings: { free: 10, pro: 200, window: "month", label: "ETF holdings lookups" },
  intelligence: { free: 30, pro: 1_000, window: "month", label: "Stock intelligence lookups" },
  economic_indicators: { free: 20, pro: 500, window: "month", label: "Economic indicator lookups" },
  screener: { free: 10, pro: 200, window: "month", label: "Screener queries" },
  stock_evaluation: { free: 15, pro: 300, window: "month", label: "Stock evaluations" },
  crypto_pro: { free: 50, pro: 1_000, window: "month", label: "Crypto premium lookups" },
  tax_report: { free: 1, pro: 12, window: "year", label: "Tax reports" },
  portfolio_score: { free: 2, pro: 20, window: "month", label: "Portfolio scores" },
  csv_export: { free: 3, pro: 100, window: "month", label: "Portfolio exports" },
};

/**
 * Soft caps for storage-heavy entities. These are NOT cost-bearing API quotas;
 * they prevent storage abuse on the Free tier. Free is intentionally generous.
 */
export const SOFT_CAPS = {
  holdings: { free: 100, pro: 5_000 },
  portfolios: { free: 3, pro: 20 },
  alerts: { free: 25, pro: 500 },
  manualAssets: { free: 10, pro: 500 },
  snaptradeConnections: { free: 1, pro: 20 },
  shareLinks: { free: 1, pro: 50 },
} as const;
