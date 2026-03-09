/**
 * Centralized platform limits for rate limiting and capacity management.
 * Tune these values as the subscriber base and provider plans change.
 */
export const PLATFORM_LIMITS = {
  /** Hard cap on concurrent Pro subscribers. Block checkout when reached. */
  MAX_PRO_SUBSCRIBERS: 500,

  /** Alpha Vantage plan: 75 requests/minute (shared across all users). */
  AV_GLOBAL_PER_MINUTE: 75,

  /** Per-user AV budget per minute. Prevents a single user hogging the pool. */
  AV_PER_USER_PER_MINUTE: 15,

  /** Max AI analysis calls per day for Pro users. */
  AI_PRO_DAILY_LIMIT: 30,

  /** Max AI analysis calls per month for Free users (mirrors FREE_AI_MONTHLY_LIMIT). */
  AI_FREE_MONTHLY_LIMIT: 5,

  /** Max AI analysis calls per month for Starter users. */
  AI_STARTER_MONTHLY_LIMIT: 20,

  /** Max AI-powered portfolio imports per day (any tier). */
  AI_IMPORT_DAILY_LIMIT: 5,

  /** Max active price alerts for Free users. Starter: 10. Pro is unlimited. */
  FREE_ALERT_LIMIT: 2,

  /** Max active price alerts for Starter users. Pro is unlimited. */
  STARTER_ALERT_LIMIT: 10,

  /** Max holdings (stocks + ETFs) for Free users. Starter: 50. Pro is unlimited. */
  FREE_HOLDINGS_LIMIT: 15,

  /** Max holdings (stocks + ETFs) for Starter users. Pro is unlimited. */
  STARTER_HOLDINGS_LIMIT: 50,

  /** Max AI portfolio reviews per month for Pro users. */
  PORTFOLIO_REVIEW_MONTHLY_LIMIT: 5,

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
   * WhatsApp alert messaging caps.
   * Budget target ≈ $65/month at $0.0221/msg ($0.0171 Meta + $0.005 Twilio).
   */
  WA_PER_USER_DAILY: 5,
  WA_PER_USER_MONTHLY: 30,
  WA_GLOBAL_MONTHLY: 3_000,

  /** Days to retain analytics_events rows before automatic purge. */
  ANALYTICS_RETENTION_DAYS: 90,

  /** Max portfolios for Free and Starter users. */
  FREE_PORTFOLIO_LIMIT: 1,

  /** Max portfolios for Starter users (same as Free). */
  STARTER_PORTFOLIO_LIMIT: 1,

  /** Max portfolios for Pro users. */
  PRO_PORTFOLIO_LIMIT: 3,
} as const;

export type RateLimitProvider = "alphavantage" | "openai" | "openai_import";
