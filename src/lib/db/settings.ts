import { ensureInitialized } from "./client";
import { str, num, parseRefreshInterval, parseAlertChannels, monthWindowKey, shouldResetDailyAiWindow, SUPPORTED_PORTFOLIO_CURRENCIES } from "./helpers";
import type { UserSettings, PortfolioCurrency } from "./helpers";
import type {
  Language,
  NotificationChannel,
  ProdOpsConfig,
  ProdOpsEventType,
  ProdOpsPendingLink,
  ProdOpsRecipient,
} from "@/lib/types";
import type { ToolTabId } from "@/lib/tools-registry";
import { TOOLS_CATALOG } from "@/lib/tools-registry";
import { isValidLanguage } from "@/lib/languages";
import { encrypt, tryDecryptOrPlaintext } from "@/lib/crypto";
import { PLATFORM_LIMITS } from "@/lib/platform-config";
import { randomUUID, randomBytes } from "crypto";
import {
  PRODOPS_TELEGRAM_LINK_TTL_MINUTES,
  buildProdOpsTelegramDeepLink,
  generateProdOpsLinkToken,
  hashProdOpsLinkToken,
  normalizeProdOpsBotUsername,
} from "@/lib/prodops-link";

export type PlatformFeature =
  | "alerts_enabled" | "csv_export_enabled" | "apple_signin_enabled" | "device_enabled"
  | "mobile_app_enabled" | "telegram_enabled"
  | "tool_transactions_enabled" | "tool_dividends_enabled" | "tool_performance_enabled"
  | "tool_taxonomy_enabled" | "tool_rebalancing_enabled" | "tool_accounts_enabled"
  | "tool_watchlist_enabled"
  | "support_chat_enabled"
  | "pro_trial_enabled"
  | "ai_report_enabled"
  | "portfolio_v2_chart_enabled"
  | "social_network_enabled"
  | "market_data_fmp_search"
  | "market_data_fmp_fundamentals"
  | "market_data_fmp_intelligence"
  | "market_data_fmp_portfolio_news"
  | "market_data_fmp_economic_indicators"
  | "market_data_fmp_crypto"
  | "market_data_fmp_dividends"
  | "market_data_fmp_event_sync"
  | "market_data_alpha_vantage"
  | "mcp_fmp_proxy"
  | "weekly_digest_enabled"
  | "daily_digests_enabled"
  | "telegram_bot_enabled"
  | "aid_beta"
  | "home_v2"
  | "classic_home"
  | "commerce_enabled"
  | "tool_tax_reports_enabled"
  | "tool_simulator_enabled"
  | "tool_planning_enabled"
  | "investment_screening_enabled"
  | "screening_dev_lab_enabled";

const DEFAULT_ENABLED_FLAGS: Set<PlatformFeature> = new Set([
  "telegram_enabled",
  "tool_transactions_enabled",
  "tool_dividends_enabled",
  "tool_performance_enabled",
  "tool_taxonomy_enabled",
  "tool_accounts_enabled",
  "tool_watchlist_enabled",
  "ai_report_enabled",
  "market_data_alpha_vantage",
  "mcp_fmp_proxy",
  "weekly_digest_enabled",
  "telegram_bot_enabled",
  // Default authenticated home (morning brief / day-highlights APIs). Classic is opt-in via classic_home.
  "home_v2",
]);

const VALID_THEMES = new Set(["default", "terminal", "canvas", "studio"]);

function parseTheme(val: unknown): import("@/lib/types").LayoutTheme {
  const s = String(val || "default");
  return VALID_THEMES.has(s) ? (s as import("@/lib/types").LayoutTheme) : "default";
}

function parseCurrency(val: unknown): PortfolioCurrency {
  const s = String(val || "EUR").toUpperCase() as PortfolioCurrency;
  return SUPPORTED_PORTFOLIO_CURRENCIES.includes(s) ? s : "EUR";
}

const VALID_FAVORITE_TOOL_IDS = new Set<ToolTabId>(TOOLS_CATALOG.map((e) => e.id));

function parseFavoriteToolIdsColumn(raw: unknown): ToolTabId[] {
  if (raw == null || raw === "") return [];
  try {
    const parsed = JSON.parse(String(raw)) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (id): id is ToolTabId => typeof id === "string" && VALID_FAVORITE_TOOL_IDS.has(id as ToolTabId)
    );
  } catch {
    return [];
  }
}

const DEFAULT_SETTINGS: UserSettings = {
  language: "en",
  refreshInterval: 15,
  alertChannels: ["email"],
  telegramChatId: "",
  telegramLinkToken: "",
  telegramLinkExpiresAt: "",
  alertDeviceEnabled: false,
  dashboardTheme: "default",
  defaultCurrency: "EUR",
  emailNotificationsEnabled: true,
  favoriteToolIds: [],
};

export async function getUserSettings(userId: string): Promise<UserSettings> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "SELECT language, refresh_interval, alert_channels, telegram_chat_id, telegram_link_token, telegram_link_expires_at, alert_device_enabled, dashboard_theme, default_currency, email_notifications_enabled, favorite_tool_ids FROM user_settings WHERE user_id = ?",
    args: [userId],
  });

  if (result.rows.length === 0) {
    await client.execute({
      sql: `INSERT INTO user_settings (user_id, language, refresh_interval)
            VALUES (?, 'en', 15)`,
      args: [userId],
    });
    return { ...DEFAULT_SETTINGS };
  }

  const row = result.rows[0];
  return {
    language: (isValidLanguage(String(row.language)) ? String(row.language) : "en") as Language,
    refreshInterval: parseRefreshInterval(row.refresh_interval),
    alertChannels: parseAlertChannels(row.alert_channels),
    telegramChatId: str(row.telegram_chat_id),
    telegramLinkToken: str(row.telegram_link_token),
    telegramLinkExpiresAt: str(row.telegram_link_expires_at),
    alertDeviceEnabled: num(row.alert_device_enabled) === 1,
    dashboardTheme: parseTheme(row.dashboard_theme),
    defaultCurrency: parseCurrency(row.default_currency),
    emailNotificationsEnabled: row.email_notifications_enabled === undefined ? true : num(row.email_notifications_enabled) !== 0,
    favoriteToolIds: parseFavoriteToolIdsColumn(row.favorite_tool_ids),
  };
}

export async function updateUserSettings(
  userId: string,
  updates: Partial<UserSettings>
): Promise<UserSettings> {
  const current = await getUserSettings(userId);
  const next: UserSettings = {
    language: updates.language ?? current.language,
    refreshInterval: updates.refreshInterval ?? current.refreshInterval,
    alertChannels: updates.alertChannels ?? current.alertChannels,
    telegramChatId: updates.telegramChatId ?? current.telegramChatId,
    telegramLinkToken: updates.telegramLinkToken ?? current.telegramLinkToken,
    telegramLinkExpiresAt: updates.telegramLinkExpiresAt ?? current.telegramLinkExpiresAt,
    alertDeviceEnabled: updates.alertDeviceEnabled ?? current.alertDeviceEnabled,
    dashboardTheme: updates.dashboardTheme ?? current.dashboardTheme,
    defaultCurrency: updates.defaultCurrency ?? current.defaultCurrency,
    emailNotificationsEnabled: updates.emailNotificationsEnabled ?? current.emailNotificationsEnabled,
    favoriteToolIds: updates.favoriteToolIds ?? current.favoriteToolIds,
  };

  const client = await ensureInitialized();
  await client.execute({
    sql: `UPDATE user_settings SET language = ?, refresh_interval = ?,
          alert_channels = ?, telegram_chat_id = ?, telegram_link_token = ?, telegram_link_expires_at = ?, alert_device_enabled = ?,
          dashboard_theme = ?, default_currency = ?, email_notifications_enabled = ?,
          favorite_tool_ids = ?
          WHERE user_id = ?`,
    args: [
      next.language, next.refreshInterval,
      next.alertChannels.join(","), next.telegramChatId, next.telegramLinkToken, next.telegramLinkExpiresAt,
      next.alertDeviceEnabled ? 1 : 0, next.dashboardTheme, next.defaultCurrency,
      next.emailNotificationsEnabled ? 1 : 0,
      JSON.stringify(next.favoriteToolIds),
      userId,
    ],
  });

  return next;
}

export async function setTelegramLinkToken(userId: string): Promise<{ token: string; deepLink: string }> {
  const bot = process.env.TELEGRAM_BOT_USERNAME?.replace(/^@/, "");
  if (!bot) throw new Error("TELEGRAM_BOT_USERNAME not configured");
  const token = randomBytes(18).toString("hex");
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  const client = await ensureInitialized();
  await client.execute({
    sql: `UPDATE user_settings SET telegram_link_token = ?, telegram_link_expires_at = ? WHERE user_id = ?`,
    args: [token, expiresAt, userId],
  });
  return { token, deepLink: `https://t.me/${bot}?start=${token}` };
}

export async function completeTelegramLink(
  token: string,
  chatId: string
): Promise<{ userId: string; language: Language } | null> {
  const client = await ensureInitialized();
  const now = new Date().toISOString();
  const match = await client.execute({
    sql: `SELECT user_id, language FROM user_settings WHERE telegram_link_token = ? AND telegram_link_expires_at > ?`,
    args: [token, now],
  });
  if (match.rows.length === 0) return null;
  const userId = str(match.rows[0].user_id);
  const language = (isValidLanguage(String(match.rows[0].language)) ? String(match.rows[0].language) : "en") as Language;

  await client.execute({
    sql: `UPDATE user_settings SET telegram_chat_id = '', telegram_link_token = '', telegram_link_expires_at = '' WHERE telegram_chat_id = ? AND user_id != ?`,
    args: [chatId, userId],
  });
  await client.execute({
    sql: `UPDATE user_settings SET telegram_chat_id = ?, telegram_link_token = '', telegram_link_expires_at = '' WHERE user_id = ?`,
    args: [chatId, userId],
  });
  return { userId, language };
}

export async function disconnectTelegram(userId: string): Promise<void> {
  const current = await getUserSettings(userId);
  const nextChannels = current.alertChannels.filter((c) => c !== "telegram");
  const client = await ensureInitialized();
  await client.execute({
    sql: `UPDATE user_settings SET telegram_chat_id = '', telegram_link_token = '', telegram_link_expires_at = '', alert_channels = ? WHERE user_id = ?`,
    args: [nextChannels.join(","), userId],
  });
}

export interface TelegramQuota {
  allowed: boolean;
  reason?: string;
  userToday: number;
  userMonth: number;
  globalMonth: number;
  userDailyLimit: number;
  userMonthlyLimit: number;
  globalMonthlyLimit: number;
}

function shouldResetMonth(resetAt: string): boolean {
  if (!resetAt) return true;
  const d = new Date(resetAt);
  if (isNaN(d.getTime())) return true;
  return monthWindowKey(d) !== monthWindowKey(new Date());
}

function shouldResetDay(resetAt: string): boolean {
  return shouldResetDailyAiWindow(resetAt);
}

export async function getTelegramQuota(userId: string): Promise<TelegramQuota> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "SELECT wa_msgs_today, wa_daily_reset_at, wa_msgs_month, wa_monthly_reset_at FROM user_settings WHERE user_id = ?",
    args: [userId],
  });

  let userToday = 0;
  let userMonth = 0;
  if (result.rows.length > 0) {
    const row = result.rows[0];
    const dailyReset = str(row.wa_daily_reset_at);
    const monthlyReset = str(row.wa_monthly_reset_at);
    userToday = shouldResetDay(dailyReset) ? 0 : num(row.wa_msgs_today);
    userMonth = shouldResetMonth(monthlyReset) ? 0 : num(row.wa_msgs_month);
  }

  const globalRaw = await client.execute({
    sql: "SELECT value FROM platform_settings WHERE key = 'wa_global_msgs_month'",
  });
  const globalResetRaw = await client.execute({
    sql: "SELECT value FROM platform_settings WHERE key = 'wa_global_monthly_reset_at'",
  });
  const globalResetAt = globalResetRaw.rows.length > 0 ? str(globalResetRaw.rows[0].value) : "";
  let globalMonth = globalRaw.rows.length > 0 ? Number(str(globalRaw.rows[0].value)) || 0 : 0;
  if (shouldResetMonth(globalResetAt)) globalMonth = 0;

  const { WA_PER_USER_DAILY, WA_PER_USER_MONTHLY, WA_GLOBAL_MONTHLY } = PLATFORM_LIMITS;

  let allowed = true;
  let reason: string | undefined;
  if (userToday >= WA_PER_USER_DAILY) {
    allowed = false;
    reason = "daily_limit";
  } else if (userMonth >= WA_PER_USER_MONTHLY) {
    allowed = false;
    reason = "monthly_limit";
  } else if (globalMonth >= WA_GLOBAL_MONTHLY) {
    allowed = false;
    reason = "global_limit";
  }

  return {
    allowed,
    reason,
    userToday,
    userMonth,
    globalMonth,
    userDailyLimit: WA_PER_USER_DAILY,
    userMonthlyLimit: WA_PER_USER_MONTHLY,
    globalMonthlyLimit: WA_GLOBAL_MONTHLY,
  };
}

export async function incrementTelegramCounter(userId: string): Promise<void> {
  const client = await ensureInitialized();
  const now = new Date().toISOString();

  const result = await client.execute({
    sql: "SELECT wa_daily_reset_at, wa_monthly_reset_at FROM user_settings WHERE user_id = ?",
    args: [userId],
  });

  if (result.rows.length === 0) return;

  const row = result.rows[0];
  const dailyReset = str(row.wa_daily_reset_at);
  const monthlyReset = str(row.wa_monthly_reset_at);
  const resetDaily = shouldResetDay(dailyReset);
  const resetMonthly = shouldResetMonth(monthlyReset);

  await client.execute({
    sql: `UPDATE user_settings SET
      wa_msgs_today = CASE WHEN ? THEN 1 ELSE wa_msgs_today + 1 END,
      wa_daily_reset_at = CASE WHEN ? THEN ? ELSE wa_daily_reset_at END,
      wa_msgs_month = CASE WHEN ? THEN 1 ELSE wa_msgs_month + 1 END,
      wa_monthly_reset_at = CASE WHEN ? THEN ? ELSE wa_monthly_reset_at END
      WHERE user_id = ?`,
    args: [
      resetDaily ? 1 : 0,
      resetDaily ? 1 : 0, now,
      resetMonthly ? 1 : 0,
      resetMonthly ? 1 : 0, now,
      userId,
    ],
  });

  const globalResetRaw = await client.execute({
    sql: "SELECT value FROM platform_settings WHERE key = 'wa_global_monthly_reset_at'",
  });
  const globalResetAt = globalResetRaw.rows.length > 0 ? str(globalResetRaw.rows[0].value) : "";
  const resetGlobal = shouldResetMonth(globalResetAt);

  if (resetGlobal) {
    await client.execute({
      sql: `INSERT INTO platform_settings (key, value) VALUES ('wa_global_msgs_month', '1')
            ON CONFLICT(key) DO UPDATE SET value = '1'`,
    });
    await client.execute({
      sql: `INSERT INTO platform_settings (key, value) VALUES ('wa_global_monthly_reset_at', ?)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      args: [now],
    });
  } else {
    await client.execute({
      sql: `INSERT INTO platform_settings (key, value) VALUES ('wa_global_msgs_month', '1')
            ON CONFLICT(key) DO UPDATE SET value = CAST(CAST(value AS INTEGER) + 1 AS TEXT)`,
    });
  }
}

export function getGlobalAlphaVantageApiKey(): string {
  return process.env.STOCKTRACKER_ALPHAVANTAGE_API_KEY || "";
}

/** Financial Modeling Prep API key (server-side). Used when FMP rollout flags are on. */
export function getGlobalFmpApiKey(): string {
  return process.env.FMP_API_KEY || "";
}

/**
 * True when FMP is configured for premium market data routes.
 */
export async function hasPremiumMarketDataConfigured(): Promise<boolean> {
  return getGlobalFmpApiKey().length > 0;
}

/** Env keys only (ignores AV kill-switch). For metrics/cron pre-checks. */
export function hasPremiumMarketDataKeysInEnv(): boolean {
  return getGlobalAlphaVantageApiKey().length > 0 || getGlobalFmpApiKey().length > 0;
}

/**
 * Sync env-only chain for legacy callers and tests. Omits admin platform_settings key.
 * Prefer {@link resolveGatewayApiKey} from `@/lib/ai/gateway` for runtime LLM calls.
 */
export function getGlobalOpenAIApiKey(): string {
  return (
    process.env.AI_GATEWAY_API_KEY?.trim() ||
    process.env.VERCEL_OIDC_TOKEN?.trim() ||
    process.env.STOCKTRACKER_OPENAI_API_KEY?.trim() ||
    ""
  );
}

export async function getPlatformSetting(key: string): Promise<string> {
  try {
    const client = await ensureInitialized();
    const result = await client.execute({
      sql: "SELECT value FROM platform_settings WHERE key = ?",
      args: [key],
    });
    if (result.rows.length === 0) return "";
    return str(result.rows[0].value);
  } catch {
    /* During `next build` static generation, many pages load the root layout in parallel and
     * can overwhelm or drop the Turso connection (ECONNRESET). Fall back to env defaults
     * via empty string so prerender can complete; runtime requests retry on the next request. */
    return "";
  }
}

export async function setPlatformSetting(key: string, value: string): Promise<void> {
  const client = await ensureInitialized();
  await client.execute({
    sql: `INSERT INTO platform_settings (key, value) VALUES (?, ?)
          ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    args: [key, value],
  });
}

export async function isFeatureEnabled(feature: PlatformFeature): Promise<boolean> {
  const val = await getPlatformSetting(feature);
  if (!val) return DEFAULT_ENABLED_FLAGS.has(feature);
  return val === "true";
}

export async function setFeatureEnabled(feature: PlatformFeature, enabled: boolean): Promise<void> {
  await setPlatformSetting(feature, enabled ? "true" : "false");
}

/* ─── Per-User Feature Flag Overrides ─── */

const ALL_PLATFORM_FEATURES: PlatformFeature[] = [
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
  "telegram_bot_enabled",
  "aid_beta",
  "home_v2",
  "classic_home",
  "commerce_enabled",
  "tool_tax_reports_enabled",
  "tool_simulator_enabled",
  "tool_planning_enabled",
  "investment_screening_enabled",
  "screening_dev_lab_enabled",
];

export async function isFeatureEnabledForUser(feature: PlatformFeature, userId: string): Promise<boolean> {
  const client = await ensureInitialized();
  const override = await client.execute({
    sql: "SELECT enabled FROM feature_flag_overrides WHERE flag = ? AND user_id = ?",
    args: [feature, userId],
  });
  if (override.rows.length > 0) return num(override.rows[0].enabled) === 1;
  return isFeatureEnabled(feature);
}

export async function resolveAllFlagsForUser(userId: string): Promise<Record<PlatformFeature, boolean>> {
  const client = await ensureInitialized();
  const [allSettings, userOverrides] = await Promise.all([
    client.execute("SELECT key, value FROM platform_settings"),
    client.execute({ sql: "SELECT flag, enabled FROM feature_flag_overrides WHERE user_id = ?", args: [userId] }),
  ]);

  const globalMap: Record<string, string> = {};
  for (const row of allSettings.rows) globalMap[str(row.key)] = str(row.value);

  const overrideMap: Record<string, boolean> = {};
  for (const row of userOverrides.rows) overrideMap[str(row.flag)] = num(row.enabled) === 1;

  const result = {} as Record<PlatformFeature, boolean>;
  for (const feature of ALL_PLATFORM_FEATURES) {
    if (feature in overrideMap) {
      result[feature] = overrideMap[feature];
    } else if (feature in globalMap) {
      result[feature] = globalMap[feature] === "true";
    } else {
      result[feature] = DEFAULT_ENABLED_FLAGS.has(feature);
    }
  }
  return result;
}

export interface FeatureFlagOverride {
  id: string;
  flag: string;
  userId: string;
  username: string;
  enabled: boolean;
  createdAt: string;
}

export async function getFeatureFlagOverrides(flag: PlatformFeature): Promise<FeatureFlagOverride[]> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT o.id, o.flag, o.user_id, o.enabled, o.created_at, u.username
          FROM feature_flag_overrides o
          LEFT JOIN users u ON u.id = o.user_id
          WHERE o.flag = ?
          ORDER BY o.created_at DESC`,
    args: [flag],
  });
  return result.rows.map((row) => ({
    id: str(row.id),
    flag: str(row.flag),
    userId: str(row.user_id),
    username: str(row.username),
    enabled: num(row.enabled) === 1,
    createdAt: str(row.created_at),
  }));
}

export async function getFeatureFlagOverrideCounts(): Promise<Record<string, number>> {
  const client = await ensureInitialized();
  const result = await client.execute("SELECT flag, COUNT(*) as cnt FROM feature_flag_overrides GROUP BY flag");
  const counts: Record<string, number> = {};
  for (const row of result.rows) counts[str(row.flag)] = num(row.cnt);
  return counts;
}

export async function setFeatureFlagOverride(flag: PlatformFeature, userId: string, enabled: boolean): Promise<void> {
  const client = await ensureInitialized();
  await client.execute({
    sql: `INSERT INTO feature_flag_overrides (id, flag, user_id, enabled)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(flag, user_id) DO UPDATE SET enabled = excluded.enabled`,
    args: [randomUUID(), flag, userId, enabled ? 1 : 0],
  });
}

export async function removeFeatureFlagOverride(flag: PlatformFeature, userId: string): Promise<void> {
  const client = await ensureInitialized();
  await client.execute({
    sql: "DELETE FROM feature_flag_overrides WHERE flag = ? AND user_id = ?",
    args: [flag, userId],
  });
}

export async function getGlobalResendApiKey(): Promise<string> {
  const val = await getPlatformSetting("resend_api_key");
  if (!val) return "";
  return tryDecryptOrPlaintext(val);
}

export async function setGlobalResendApiKey(key: string): Promise<void> {
  await setPlatformSetting("resend_api_key", key ? encrypt(key) : "");
}

/* ─── X / Twitter API Keys ─── */

export type XKeyName = "x_api_key" | "x_api_secret" | "x_access_token" | "x_access_token_secret";

const X_KEY_NAMES: XKeyName[] = ["x_api_key", "x_api_secret", "x_access_token", "x_access_token_secret"];

export async function getXKeys(): Promise<Record<XKeyName, { hasKey: boolean; maskedKey: string }>> {
  const result = {} as Record<XKeyName, { hasKey: boolean; maskedKey: string }>;
  for (const name of X_KEY_NAMES) {
    const raw = await getPlatformSetting(name);
    const val = raw ? tryDecryptOrPlaintext(raw) : "";
    result[name] = {
      hasKey: val.length > 0,
      maskedKey: val ? `${val.slice(0, 4)}...${val.slice(-4)}` : "",
    };
  }
  return result;
}

export async function setXKey(name: XKeyName, value: string): Promise<void> {
  await setPlatformSetting(name, value ? encrypt(value) : "");
}

export type StripePriceKey =
  | "stripe_price_pro_monthly"
  | "stripe_price_pro_annual"
  | "stripe_coupon_device_free_year";

const STRIPE_ENV_MAP: Record<StripePriceKey, string> = {
  stripe_price_pro_monthly: "STRIPE_PRICE_PRO_MONTHLY",
  stripe_price_pro_annual: "STRIPE_PRICE_PRO_ANNUAL",
  stripe_coupon_device_free_year: "STRIPE_COUPON_DEVICE_FREE_YEAR",
};

export async function getStripePriceConfig(key: StripePriceKey): Promise<string> {
  const dbVal = await getPlatformSetting(key);
  if (dbVal) return dbVal;
  return process.env[STRIPE_ENV_MAP[key]] || "";
}

export async function getAllStripePriceConfig(): Promise<Record<StripePriceKey, string>> {
  const result: Record<string, string> = {} as Record<StripePriceKey, string>;
  for (const key of Object.keys(STRIPE_ENV_MAP) as StripePriceKey[]) {
    result[key] = await getStripePriceConfig(key);
  }
  return result as Record<StripePriceKey, string>;
}

export async function setStripePriceConfig(key: StripePriceKey, value: string): Promise<void> {
  await setPlatformSetting(key, value);
}

export interface PromoBannerConfig {
  enabled: boolean;
  title: string;
  badge: string;
  description: string;
  ctaText: string;
  ctaLink: string;
}

const DEFAULT_PROMO_BANNER: PromoBannerConfig = {
  enabled: false,
  title: "trefolio Leaf — Limited Edition",
  badge: "Only 10 units",
  description: "Your portfolio on a vivid AMOLED desk display. Join the waitlist before they're gone.",
  ctaText: "Learn more",
  ctaLink: "/leaf",
};

const PROMO_BANNER_KEY = "promo_banner_config";

export async function getPromoBannerConfig(): Promise<PromoBannerConfig> {
  const raw = await getPlatformSetting(PROMO_BANNER_KEY);
  if (!raw) return { ...DEFAULT_PROMO_BANNER };
  try {
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_PROMO_BANNER, ...parsed };
  } catch {
    return { ...DEFAULT_PROMO_BANNER };
  }
}

export async function setPromoBannerConfig(config: Partial<PromoBannerConfig>): Promise<PromoBannerConfig> {
  const current = await getPromoBannerConfig();
  const next = { ...current, ...config };
  await setPlatformSetting(PROMO_BANNER_KEY, JSON.stringify(next));
  return next;
}

const GA_SETTING_KEY = "ga_measurement_id";

export async function getGaMeasurementId(): Promise<string> {
  const dbVal = await getPlatformSetting(GA_SETTING_KEY);
  if (dbVal) return dbVal;
  return process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "";
}

export async function setGaMeasurementId(id: string): Promise<void> {
  await setPlatformSetting(GA_SETTING_KEY, id.trim());
}

const GOOGLE_ADS_SETTING_KEY = "google_ads_id";

export async function getGoogleAdsId(): Promise<string> {
  const dbVal = await getPlatformSetting(GOOGLE_ADS_SETTING_KEY);
  if (dbVal) return dbVal;
  return process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || "";
}

export async function setGoogleAdsId(id: string): Promise<void> {
  await setPlatformSetting(GOOGLE_ADS_SETTING_KEY, id.trim());
}

/* ─── UTM Taxonomy Config ─── */

export interface UtmTaxonomyConfig {
  sources: string[];
  mediums: string[];
  campaigns: string[];
  notes: string;
}

const UTM_TAXONOMY_KEY = "utm_taxonomy_config";

const DEFAULT_UTM_TAXONOMY_CONFIG: UtmTaxonomyConfig = {
  sources: ["google", "meta", "linkedin", "newsletter", "referral"],
  mediums: ["cpc", "paid_social", "email", "affiliate"],
  campaigns: ["launch_q2_2026", "retargeting_q2_2026", "onboarding_nurture_q2_2026"],
  notes: "Use lowercase tokens and snake_case. Recommended campaign format: objective_audience_offer_yyyymm. Keep source/medium fixed and only vary campaign/content intentionally.",
};

function normalizeUtmToken(value: string, maxLength: number): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9._-]/g, "")
    .slice(0, maxLength);
}

function normalizeUtmList(values: unknown, maxItems: number, maxLength: number): string[] {
  if (!Array.isArray(values)) return [];
  const next: string[] = [];
  const seen = new Set<string>();
  for (const raw of values) {
    const normalized = normalizeUtmToken(String(raw || ""), maxLength);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    next.push(normalized);
    if (next.length >= maxItems) break;
  }
  return next;
}

export async function getUtmTaxonomyConfig(): Promise<UtmTaxonomyConfig> {
  const raw = await getPlatformSetting(UTM_TAXONOMY_KEY);
  if (!raw) return { ...DEFAULT_UTM_TAXONOMY_CONFIG };
  try {
    const parsed = JSON.parse(raw) as Partial<UtmTaxonomyConfig>;
    return {
      sources: normalizeUtmList(parsed.sources, 30, 64).length > 0
        ? normalizeUtmList(parsed.sources, 30, 64)
        : [...DEFAULT_UTM_TAXONOMY_CONFIG.sources],
      mediums: normalizeUtmList(parsed.mediums, 30, 64).length > 0
        ? normalizeUtmList(parsed.mediums, 30, 64)
        : [...DEFAULT_UTM_TAXONOMY_CONFIG.mediums],
      campaigns: normalizeUtmList(parsed.campaigns, 50, 96).length > 0
        ? normalizeUtmList(parsed.campaigns, 50, 96)
        : [...DEFAULT_UTM_TAXONOMY_CONFIG.campaigns],
      notes: String(parsed.notes || DEFAULT_UTM_TAXONOMY_CONFIG.notes).slice(0, 800),
    };
  } catch {
    return { ...DEFAULT_UTM_TAXONOMY_CONFIG };
  }
}

export async function setUtmTaxonomyConfig(config: Partial<UtmTaxonomyConfig>): Promise<UtmTaxonomyConfig> {
  const current = await getUtmTaxonomyConfig();
  const next: UtmTaxonomyConfig = {
    sources: config.sources ? normalizeUtmList(config.sources, 30, 64) : current.sources,
    mediums: config.mediums ? normalizeUtmList(config.mediums, 30, 64) : current.mediums,
    campaigns: config.campaigns ? normalizeUtmList(config.campaigns, 50, 96) : current.campaigns,
    notes: config.notes !== undefined ? String(config.notes).slice(0, 800).trim() : current.notes,
  };

  if (next.sources.length === 0) next.sources = [...DEFAULT_UTM_TAXONOMY_CONFIG.sources];
  if (next.mediums.length === 0) next.mediums = [...DEFAULT_UTM_TAXONOMY_CONFIG.mediums];
  if (next.campaigns.length === 0) next.campaigns = [...DEFAULT_UTM_TAXONOMY_CONFIG.campaigns];
  if (!next.notes) next.notes = DEFAULT_UTM_TAXONOMY_CONFIG.notes;

  await setPlatformSetting(UTM_TAXONOMY_KEY, JSON.stringify(next));
  return next;
}

export async function resetUtmTaxonomyConfig(): Promise<UtmTaxonomyConfig> {
  await setPlatformSetting(UTM_TAXONOMY_KEY, JSON.stringify(DEFAULT_UTM_TAXONOMY_CONFIG));
  return { ...DEFAULT_UTM_TAXONOMY_CONFIG };
}

/* ─── Ad Config ─── */

export interface AdSlotConfig {
  enabled: boolean;
  slotId: string;
}

export interface AdConfig {
  clientId: string;
  globalEnabled: boolean;
  slots: Record<string, AdSlotConfig>;
}

const AD_CONFIG_KEY = "ad_config";

const AD_SLOT_DEFAULTS: Record<string, AdSlotConfig> = {
  "dashboard-summary": { enabled: true, slotId: "" },
  "dashboard-bottom":  { enabled: true, slotId: "" },
  "tools-bottom":      { enabled: true, slotId: "" },
  "stock-detail":      { enabled: true, slotId: "" },
  "import-done":       { enabled: true, slotId: "" },
};

const DEFAULT_AD_CONFIG: AdConfig = {
  clientId: "",
  globalEnabled: false,
  slots: { ...AD_SLOT_DEFAULTS },
};

export async function getAdConfig(): Promise<AdConfig> {
  const raw = await getPlatformSetting(AD_CONFIG_KEY);
  const envClientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || "";

  if (!raw) {
    return { ...DEFAULT_AD_CONFIG, clientId: envClientId };
  }
  try {
    const parsed = JSON.parse(raw);
    const slots = { ...AD_SLOT_DEFAULTS };
    if (parsed.slots) {
      for (const [key, val] of Object.entries(parsed.slots)) {
        if (key in slots) {
          slots[key] = { ...slots[key], ...(val as Partial<AdSlotConfig>) };
        }
      }
    }
    return {
      clientId: parsed.clientId || envClientId,
      globalEnabled: parsed.globalEnabled ?? false,
      slots,
    };
  } catch {
    return { ...DEFAULT_AD_CONFIG, clientId: envClientId };
  }
}

export async function setAdConfig(config: Partial<AdConfig>): Promise<AdConfig> {
  const current = await getAdConfig();
  const next: AdConfig = {
    clientId: config.clientId ?? current.clientId,
    globalEnabled: config.globalEnabled ?? current.globalEnabled,
    slots: current.slots,
  };
  if (config.slots) {
    for (const [key, val] of Object.entries(config.slots)) {
      if (key in next.slots) {
        next.slots[key] = { ...next.slots[key], ...val };
      }
    }
  }
  await setPlatformSetting(AD_CONFIG_KEY, JSON.stringify(next));
  return next;
}

/* ─── Digest Sender Domains ─── */

export interface DigestSenderDomain {
  value: string;
  label: string;
  color: string;
}

const DIGEST_SENDERS_KEY = "digest_sender_domains";

const DEFAULT_DIGEST_SENDERS: DigestSenderDomain[] = [
  { value: "diariobitcoin.com", label: "DiarioBitcoin", color: "orange" },
];

export async function getDigestSenderDomains(): Promise<DigestSenderDomain[]> {
  const raw = await getPlatformSetting(DIGEST_SENDERS_KEY);
  if (!raw) return [...DEFAULT_DIGEST_SENDERS];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return [...DEFAULT_DIGEST_SENDERS];
    return parsed.map((d: Record<string, unknown>) => ({
      value: String(d.value || "").trim().toLowerCase(),
      label: String(d.label || d.value || "").trim(),
      color: String(d.color || "purple").trim().toLowerCase(),
    })).filter((d: DigestSenderDomain) => d.value);
  } catch {
    return [...DEFAULT_DIGEST_SENDERS];
  }
}

export async function setDigestSenderDomains(domains: DigestSenderDomain[]): Promise<DigestSenderDomain[]> {
  const cleaned = domains
    .map((d) => ({
      value: d.value.trim().toLowerCase(),
      label: d.label.trim() || d.value.trim(),
      color: d.color.trim().toLowerCase() || "purple",
    }))
    .filter((d) => d.value);
  const deduped: DigestSenderDomain[] = [];
  const seen = new Set<string>();
  for (const d of cleaned) {
    if (seen.has(d.value)) continue;
    seen.add(d.value);
    deduped.push(d);
  }
  await setPlatformSetting(DIGEST_SENDERS_KEY, JSON.stringify(deduped));
  return deduped;
}

export function buildDigestGmailQuery(domains: DigestSenderDomain[]): string {
  if (domains.length === 0) return "to:digest@trefolio.com is:unread";
  const fromClauses = domains.map((d) => `from:${d.value}`).join(" OR ");
  return `to:digest@trefolio.com (${fromClauses}) is:unread`;
}

/* ─── ProdOps Config ─── */

export const PRODOPS_EVENT_TYPES: ProdOpsEventType[] = [
  "user_registered",
  "membership_paid",
  "feedback_received",
  "broker_request_created",
  "trial_activated",
  "test_notification",
];

const PRODOPS_EVENT_TYPE_SET = new Set<ProdOpsEventType>(PRODOPS_EVENT_TYPES);
const PRODOPS_CONFIG_KEY = "prodops_config";
const PRODOPS_SECRET_KEY = "prodops_shared_secret";

const DEFAULT_PRODOPS_CONFIG: ProdOpsConfig = {
  enabled: false,
  baseUrl: "",
  botUsername: "",
  enabledEventTypes: [
    "user_registered",
    "membership_paid",
    "feedback_received",
    "broker_request_created",
    "trial_activated",
  ],
  recipient: null,
  pendingLink: null,
};

function normalizeProdOpsEventTypes(value: unknown): ProdOpsEventType[] {
  if (!Array.isArray(value)) return [...DEFAULT_PRODOPS_CONFIG.enabledEventTypes];
  const next: ProdOpsEventType[] = [];
  const seen = new Set<ProdOpsEventType>();
  for (const raw of value) {
    const candidate = String(raw || "") as ProdOpsEventType;
    if (!PRODOPS_EVENT_TYPE_SET.has(candidate) || seen.has(candidate)) continue;
    seen.add(candidate);
    next.push(candidate);
  }
  return next.length > 0 ? next : [...DEFAULT_PRODOPS_CONFIG.enabledEventTypes];
}

function normalizeProdOpsRecipient(value: unknown): ProdOpsRecipient | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const chatId = String(raw.chatId || "").trim().slice(0, 120);
  if (!chatId) return null;

  const threadValue = String(raw.messageThreadId || "").trim();
  const parsedThread = threadValue ? Number.parseInt(threadValue, 10) : undefined;
  const telegramUsername = String(raw.telegramUsername || "").trim().replace(/^@+/, "").slice(0, 120);
  const telegramDisplayName = String(raw.telegramDisplayName || "").trim().slice(0, 120);
  const linkedAt = String(raw.linkedAt || "").trim().slice(0, 80);
  const label =
    String(raw.label || "").trim().slice(0, 80) ||
    (telegramUsername ? `@${telegramUsername}` : telegramDisplayName || "Primary recipient");
  const source =
    raw.source === "telegram_link" || raw.source === "legacy_manual"
      ? raw.source
      : linkedAt || String(raw.telegramUserId || "").trim()
        ? "telegram_link"
        : "legacy_manual";

  return {
    id: String(raw.id || randomUUID()).trim() || randomUUID(),
    label,
    type: "telegram_dm",
    source,
    chatId,
    messageThreadId:
      parsedThread !== undefined && Number.isFinite(parsedThread) && parsedThread > 0
        ? parsedThread
        : undefined,
    enabled: raw.enabled !== false,
    enabledEventTypes: normalizeProdOpsEventTypes(raw.enabledEventTypes),
    telegramUserId: String(raw.telegramUserId || "").trim().slice(0, 120) || undefined,
    telegramUsername: telegramUsername || undefined,
    telegramDisplayName: telegramDisplayName || undefined,
    linkedAt: linkedAt || undefined,
  };
}

function normalizeProdOpsLegacyRecipient(value: unknown): ProdOpsRecipient | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const first = normalizeProdOpsRecipient({
    ...(value[0] as Record<string, unknown>),
    source: "legacy_manual",
  });
  if (!first) return null;
  return {
    ...first,
    source: "legacy_manual",
  };
}

function normalizeProdOpsPendingLink(value: unknown): ProdOpsPendingLink | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const tokenHash = String(raw.tokenHash || "").trim().slice(0, 128);
  const tokenIssuedAt = String(raw.tokenIssuedAt || "").trim().slice(0, 80);
  const tokenExpiresAt = String(raw.tokenExpiresAt || "").trim().slice(0, 80);
  if (!tokenHash || !tokenExpiresAt) return null;
  return {
    tokenHash,
    tokenIssuedAt,
    tokenExpiresAt,
  };
}

function normalizeProdOpsBaseUrl(value: unknown): string {
  return String(value || "").trim().replace(/\/+$/, "").slice(0, 200);
}

export async function getProdOpsConfig(): Promise<ProdOpsConfig> {
  const raw = await getPlatformSetting(PRODOPS_CONFIG_KEY);
  const envBaseUrl = process.env.PRODOPS_BASE_URL?.trim() || "";
  const envBotUsername = normalizeProdOpsBotUsername(
    process.env.PRODOPS_TELEGRAM_BOT_USERNAME?.trim() || "",
  );
  if (!raw) {
    return {
      ...DEFAULT_PRODOPS_CONFIG,
      baseUrl: envBaseUrl,
      botUsername: envBotUsername,
    };
  }
  try {
    const parsed = JSON.parse(raw) as Partial<ProdOpsConfig> & {
      destinations?: unknown[];
    };
    return {
      enabled: parsed.enabled === true,
      baseUrl: normalizeProdOpsBaseUrl(parsed.baseUrl) || envBaseUrl,
      botUsername: normalizeProdOpsBotUsername(String(parsed.botUsername || "")) || envBotUsername,
      enabledEventTypes: normalizeProdOpsEventTypes(parsed.enabledEventTypes),
      recipient:
        normalizeProdOpsRecipient(parsed.recipient) ??
        normalizeProdOpsLegacyRecipient(parsed.destinations),
      pendingLink: normalizeProdOpsPendingLink(parsed.pendingLink),
    };
  } catch {
    return {
      ...DEFAULT_PRODOPS_CONFIG,
      baseUrl: envBaseUrl,
      botUsername: envBotUsername,
    };
  }
}

export async function setProdOpsConfig(config: Partial<ProdOpsConfig>): Promise<ProdOpsConfig> {
  const current = await getProdOpsConfig();
  const next: ProdOpsConfig = {
    enabled: config.enabled ?? current.enabled,
    baseUrl: config.baseUrl !== undefined ? normalizeProdOpsBaseUrl(config.baseUrl) : current.baseUrl,
    botUsername:
      config.botUsername !== undefined
        ? normalizeProdOpsBotUsername(String(config.botUsername || ""))
        : current.botUsername,
    enabledEventTypes:
      config.enabledEventTypes !== undefined
        ? normalizeProdOpsEventTypes(config.enabledEventTypes)
        : current.enabledEventTypes,
    recipient:
      config.recipient !== undefined
        ? normalizeProdOpsRecipient(config.recipient)
        : current.recipient,
    pendingLink:
      config.pendingLink !== undefined
        ? normalizeProdOpsPendingLink(config.pendingLink)
        : current.pendingLink,
  };
  await setPlatformSetting(PRODOPS_CONFIG_KEY, JSON.stringify(next));
  return next;
}

export async function getProdOpsSharedSecret(): Promise<string> {
  const fromEnv = process.env.PRODOPS_SHARED_SECRET?.trim() || "";
  if (fromEnv) return fromEnv;
  const raw = await getPlatformSetting(PRODOPS_SECRET_KEY);
  return raw ? tryDecryptOrPlaintext(raw) : "";
}

export async function getProdOpsSharedSecretMeta(): Promise<{
  hasSecret: boolean;
  maskedSecret: string;
  source: "env" | "database" | "none";
}> {
  const fromEnv = process.env.PRODOPS_SHARED_SECRET?.trim() || "";
  if (fromEnv) {
    return {
      hasSecret: true,
      maskedSecret: `${fromEnv.slice(0, 4)}...${fromEnv.slice(-4)}`,
      source: "env",
    };
  }
  const raw = await getPlatformSetting(PRODOPS_SECRET_KEY);
  const value = raw ? tryDecryptOrPlaintext(raw) : "";
  return {
    hasSecret: value.length > 0,
    maskedSecret: value ? `${value.slice(0, 4)}...${value.slice(-4)}` : "",
    source: value ? "database" : "none",
  };
}

export async function setProdOpsSharedSecret(secret: string): Promise<void> {
  await setPlatformSetting(PRODOPS_SECRET_KEY, secret.trim() ? encrypt(secret.trim()) : "");
}

export async function createProdOpsRecipientLink(): Promise<{
  deepLink: string;
  expiresAt: string;
}> {
  const current = await getProdOpsConfig();
  if (!current.botUsername) {
    throw new Error("ProdOps Telegram bot username is missing");
  }

  const token = generateProdOpsLinkToken();
  const expiresAt = new Date(
    Date.now() + PRODOPS_TELEGRAM_LINK_TTL_MINUTES * 60 * 1000,
  ).toISOString();

  await setProdOpsConfig({
    pendingLink: {
      tokenHash: hashProdOpsLinkToken(token),
      tokenIssuedAt: new Date().toISOString(),
      tokenExpiresAt: expiresAt,
    },
  });

  return {
    deepLink: buildProdOpsTelegramDeepLink(current.botUsername, token),
    expiresAt,
  };
}

export async function completeProdOpsRecipientLink(input: {
  token: string;
  chatId: string;
  telegramUserId?: string;
  telegramUsername?: string;
  telegramDisplayName?: string;
}): Promise<ProdOpsRecipient | null> {
  const current = await getProdOpsConfig();
  const pending = current.pendingLink;
  if (!pending?.tokenHash || !pending.tokenExpiresAt) return null;
  if (!input.token.trim() || !input.chatId.trim()) return null;
  if (new Date(pending.tokenExpiresAt).getTime() <= Date.now()) return null;
  if (hashProdOpsLinkToken(input.token.trim()) !== pending.tokenHash) return null;

  const nextRecipient = normalizeProdOpsRecipient({
    id: current.recipient?.id || randomUUID(),
    label:
      current.recipient?.label ||
      (input.telegramUsername ? `@${input.telegramUsername.replace(/^@+/, "")}` : "") ||
      input.telegramDisplayName ||
      "Primary recipient",
    type: "telegram_dm",
    source: "telegram_link",
    chatId: input.chatId.trim(),
    enabled: current.recipient?.enabled ?? true,
    enabledEventTypes: current.recipient?.enabledEventTypes ?? current.enabledEventTypes,
    telegramUserId: input.telegramUserId?.trim() || "",
    telegramUsername: input.telegramUsername?.trim().replace(/^@+/, "") || "",
    telegramDisplayName: input.telegramDisplayName?.trim() || "",
    linkedAt: new Date().toISOString(),
  });

  if (!nextRecipient) return null;

  const next = await setProdOpsConfig({
    recipient: nextRecipient,
    pendingLink: null,
  });
  return next.recipient;
}

export async function unlinkProdOpsRecipient(): Promise<ProdOpsConfig> {
  return setProdOpsConfig({
    recipient: null,
    pendingLink: null,
  });
}

/* ─── AI Model Config ─── */

import {
  AI_FLOW_KEYS,
  ALLOWED_AI_MODELS,
  DEFAULT_AI_MODEL,
  getDefaultAiModelConfig,
  normalizeAiModelConfigRecord,
  resolveAiModelForPlan,
  type AiFlowKey,
  type AllowedAiModel,
} from "@/lib/ai-models";
import type { SubscriptionPlan } from "@/lib/types";
import { fetchAiModelConfigFromIdp, isIdpAiModelConfigFetchEnabled, putAiModelConfigToIdp } from "@/lib/idp/ai-model-config-fetch";

let _aiModelCache: { config: Record<AiFlowKey, AllowedAiModel>; ts: number } | null = null;
const AI_MODEL_CACHE_TTL_MS = 5 * 60 * 1000;

const AI_MODEL_CONFIG_KEY = "ai_model_config";

export async function getAiModelConfig(): Promise<Record<AiFlowKey, AllowedAiModel>> {
  if (_aiModelCache && Date.now() - _aiModelCache.ts < AI_MODEL_CACHE_TTL_MS) {
    return _aiModelCache.config;
  }

  const defaults = getDefaultAiModelConfig();

  if (isIdpAiModelConfigFetchEnabled()) {
    const fromIdp = await fetchAiModelConfigFromIdp();
    if (fromIdp) {
      _aiModelCache = { config: fromIdp, ts: Date.now() };
      return fromIdp;
    }
  }

  const raw = await getPlatformSetting(AI_MODEL_CONFIG_KEY);

  if (!raw) {
    _aiModelCache = { config: defaults, ts: Date.now() };
    return defaults;
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, string>;
    const config = normalizeAiModelConfigRecord(parsed);
    _aiModelCache = { config, ts: Date.now() };
    return config;
  } catch {
    _aiModelCache = { config: defaults, ts: Date.now() };
    return defaults;
  }
}

export async function setAiModelConfig(config: Record<string, string>): Promise<
  { ok: true } | { ok: false; status: number; message: string }
> {
  const defaults = getDefaultAiModelConfig();
  const allowedSet = new Set<string>(ALLOWED_AI_MODELS);
  const flowSet = new Set<string>(AI_FLOW_KEYS);
  const next: Record<string, string> = {};
  for (const [key, model] of Object.entries(config)) {
    if (flowSet.has(key) && allowedSet.has(model)) {
      next[key] = model;
    }
  }
  for (const key of AI_FLOW_KEYS) {
    if (!next[key]) next[key] = defaults[key];
  }

  if (isIdpAiModelConfigFetchEnabled()) {
    const idp = await putAiModelConfigToIdp(next);
    if (!idp.ok) {
      return idp;
    }
  }

  await setPlatformSetting(AI_MODEL_CONFIG_KEY, JSON.stringify(next));
  _aiModelCache = null;
  return { ok: true };
}

export async function getAiModelForFlow(flow: AiFlowKey): Promise<string> {
  const config = await getAiModelConfig();
  return config[flow] || DEFAULT_AI_MODEL;
}

/** Model for a user tier: Folio uses a cheap conversational model; Pro uses IdP config; quality-critical flows always use platform config. */
export async function resolveAiModelForUserPlan(
  flow: AiFlowKey,
  plan: SubscriptionPlan,
): Promise<string> {
  const cfg = await getAiModelConfig();
  return resolveAiModelForPlan(flow, plan, cfg);
}

export async function getAllPlatformSettings(): Promise<Record<string, string>> {
  const client = await ensureInitialized();
  const result = await client.execute("SELECT key, value FROM platform_settings");
  const settings: Record<string, string> = {};
  for (const row of result.rows) {
    settings[str(row.key)] = str(row.value);
  }
  return settings;
}
