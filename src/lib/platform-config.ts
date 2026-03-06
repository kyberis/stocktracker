/**
 * Centralized platform limits for rate limiting and capacity management.
 * Tune these values as the subscriber base and provider plans change.
 */
export const PLATFORM_LIMITS = {
  /** Hard cap on concurrent Pro subscribers. Block checkout when reached. */
  MAX_PRO_SUBSCRIBERS: 10,

  /** Alpha Vantage plan: 75 requests/minute (shared across all users). */
  AV_GLOBAL_PER_MINUTE: 75,

  /** Per-user AV budget per minute. Prevents a single user hogging the pool. */
  AV_PER_USER_PER_MINUTE: 15,

  /** Max AI analysis calls per day for Pro users. */
  AI_PRO_DAILY_LIMIT: 30,

  /** Max AI analysis calls per month for Free users (mirrors FREE_AI_MONTHLY_LIMIT). */
  AI_FREE_MONTHLY_LIMIT: 5,

  /** Max AI-powered portfolio imports per day (any tier). */
  AI_IMPORT_DAILY_LIMIT: 5,

  /** Max active price alerts for Free users. Pro is unlimited. */
  FREE_ALERT_LIMIT: 2,

  /** Max holdings (stocks + ETFs) for Free users. Pro is unlimited. */
  FREE_HOLDINGS_LIMIT: 15,

  /** Max AI portfolio reviews per month for Pro users. */
  PORTFOLIO_REVIEW_MONTHLY_LIMIT: 5,
} as const;

export type RateLimitProvider = "alphavantage" | "openai" | "openai_import";
