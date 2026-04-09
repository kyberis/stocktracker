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

  /** Per-user FMP budget per minute (mirrors AV until tuned for plan tier). */
  FMP_PER_USER_PER_MINUTE: 15,

  /** Max AI analysis calls per day for Pro users (legacy call-count, kept for metrics). */
  AI_PRO_DAILY_LIMIT: 30,

  /** Max AI analysis calls per month for Free users (legacy call-count, kept for metrics). */
  AI_FREE_MONTHLY_LIMIT: 5,

  /** Max AI analysis calls per month for Starter users (legacy call-count, kept for metrics). */
  AI_STARTER_MONTHLY_LIMIT: 20,

  /** Monthly AI token budget for Free users. ~7-10 analyses. */
  AI_FREE_MONTHLY_TOKEN_LIMIT: 25_000,

  /** Monthly AI token budget for Starter users. ~25-40 analyses. */
  AI_STARTER_MONTHLY_TOKEN_LIMIT: 100_000,

  /** Monthly AI token budget for Pro users. ~125-200 analyses. */
  AI_PRO_MONTHLY_TOKEN_LIMIT: 500_000,

  /** Max AI-powered portfolio imports per day (any tier). */
  AI_IMPORT_DAILY_LIMIT: 5,

  /** Max active price alerts for Free users. Starter: 10. Pro is unlimited. */
  FREE_ALERT_LIMIT: 5,

  /** Max active price alerts for Starter users. Pro is unlimited. */
  STARTER_ALERT_LIMIT: 10,

  /** Max holdings (stocks + ETFs) for Free users. Starter: 50. Pro is unlimited. */
  FREE_HOLDINGS_LIMIT: 20,

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

  /** Max portfolios for Free and Starter users. */
  FREE_PORTFOLIO_LIMIT: 1,

  /** Max portfolios for Starter users (same as Free). */
  STARTER_PORTFOLIO_LIMIT: 1,

  /** Max portfolios for Pro users. */
  PRO_PORTFOLIO_LIMIT: 5,

  /** Max SnapTrade broker connections per tier. Free: 0 (no access). */
  FREE_SNAPTRADE_LIMIT: 0,
  STARTER_SNAPTRADE_LIMIT: 1,
  PRO_SNAPTRADE_LIMIT: 999,

  /** Max manual assets (non-cash: real_estate, savings, pension) per tier. */
  FREE_MANUAL_ASSET_LIMIT: 0,
  STARTER_MANUAL_ASSET_LIMIT: 10,
  PRO_MANUAL_ASSET_LIMIT: 999,

  /** Default support chat message limits per day (overridable by admin). */
  SUPPORT_CHAT_STARTER_DAILY_DEFAULT: 10,
  SUPPORT_CHAT_PRO_DAILY_DEFAULT: 50,

  /** Max total reward days a single referrer can accumulate (12 months). */
  REFERRAL_MAX_REWARD_DAYS: 365,

  /** Max successful referrals per referrer in a rolling 30-day window. */
  REFERRAL_VELOCITY_PER_30D: 5,

  /** Days of Pro access granted per successful referral. */
  REFERRAL_REWARD_DAYS: 30,
} as const;

export type RateLimitProvider = "alphavantage" | "fmp" | "openai" | "openai_import" | "support_chat";
