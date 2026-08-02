import type { Row } from "@libsql/client";
import type {
  AlertCondition,
  AlertType,
  ExperienceLevel,
  HoldingAssetType,
  Language,
  NotificationChannel,
  PercentBasis,
  RefreshInterval,
  TransactionType,
} from "@/lib/types";
import type { ToolTabId } from "@/lib/tools-registry";

export type UserRole = "admin" | "user";
export type UserPlan = "free" | "pro";

export type AuthProvider = "credentials" | "google" | "apple";

export interface DbUser {
  id: string;
  username: string;
  password_hash: string;
  role: UserRole;
  must_change_password: number;
  created_at: string;
  email: string;
  display_name: string;
  avatar_url: string;
  plan: UserPlan;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  plan_expires_at: string;
  ai_calls_this_month: number;
  ai_calls_reset_at: string;
  ai_calls_today: number;
  ai_daily_reset_at: string;
  ai_tokens_this_month: number;
  ai_tokens_today: number;
  email_verified: number;
  auth_provider: AuthProvider;
  google_id: string;
  apple_id: string;
  /** OIDC subject claim from user.trefolio.com when the user has been linked to the IdP. */
  idp_sub: string;
  portfolio_review_count: number;
  portfolio_review_reset_at: string;
  widget_token_hash: string;
  device_passkey_hash: string;
  device_template_id: string;
  device_linked_at: string;
  device_pro_redeemed_at: string;
  device_portfolio_id: string;
  last_active_at: string;
  tax_residency: string;
  onboarding_completed: number;
  experience_level: ExperienceLevel;
  referral_code: string;
  referred_by: string;
  referral_reward_days: number;
  trial_invited_at: string;
  trial_activated_at: string;
  trial_token: string;
  trial_expired_notified: number;
  membership_grant_token: string;
  membership_grant_plan: string;
  membership_grant_days: number;
  membership_grant_created_at: string;
  /** Set when the user received complimentary Pro while commerce_enabled is off. */
  commerce_complimentary_at: string;
  checklist_dismissed_at: string;
  weekly_digest_enabled: number;
  profile_slug: string;
  bio: string;
  social_visibility: string;
  headline: string;
  share_portfolio_value: number;
  share_holdings: number;
  allow_comments: number;
}

export type PortfolioCurrency =
  | "EUR" | "USD" | "GBP" | "CHF" | "SEK" | "NOK" | "DKK" | "CAD"
  | "AUD" | "NZD" | "JPY" | "PLN" | "CZK" | "HUF" | "RON"
  | "SGD" | "HKD" | "ZAR" | "TRY" | "BRL" | "MXN";

export const SUPPORTED_PORTFOLIO_CURRENCIES: PortfolioCurrency[] = [
  "EUR", "USD", "GBP", "CHF", "SEK", "NOK", "DKK", "CAD",
  "AUD", "NZD", "JPY", "PLN", "CZK", "HUF", "RON",
  "SGD", "HKD", "ZAR", "TRY", "BRL", "MXN",
];

export interface DbPortfolio {
  id: string;
  user_id: string;
  name: string;
  is_default: number;
  sort_order: number;
  currency: string;
  created_at: string;
}

export interface Portfolio {
  id: string;
  userId: string;
  name: string;
  isDefault: boolean;
  sortOrder: number;
  currency: PortfolioCurrency;
  createdAt: string;
}

export interface PublicUser {
  id: string;
  username: string;
  role: UserRole;
  mustChangePassword: boolean;
  createdAt: string;
  email: string;
  displayName: string;
  avatarUrl: string;
  plan: UserPlan;
  planExpiresAt: string;
  aiCallsThisMonth: number;
  aiCallsResetAt: string;
  aiCallsToday: number;
  aiDailyResetAt: string;
  aiTokensThisMonth: number;
  aiTokensToday: number;
  emailVerified: boolean;
  authProvider: AuthProvider;
  portfolioReviewCount: number;
  portfolioReviewResetAt: string;
  hasWidgetToken: boolean;
  hasDevicePasskey: boolean;
  deviceProEligible: boolean;
  devicePortfolioId: string;
  lastActiveAt: string;
  experienceLevel: ExperienceLevel;
  referralCode: string;
    referralRewardDays: number;
  profileSlug: string;
  bio: string;
  socialVisibility: string;
  headline: string;
  sharePortfolioValue: boolean;
  shareHoldings: boolean;
  allowComments: boolean;
}

export interface UserSettings {
  language: Language;
  refreshInterval: RefreshInterval;
  alertChannels: NotificationChannel[];
  /** Linked Telegram chat id (from Bot API) when the user completed /start with a link token. */
  telegramChatId: string;
  telegramLinkToken: string;
  telegramLinkExpiresAt: string;
  alertDeviceEnabled: boolean;
  dashboardTheme: import("@/lib/types").LayoutTheme;
  defaultCurrency: PortfolioCurrency;
  emailNotificationsEnabled: boolean;
  /** Tool hub favorites; persisted in `user_settings.favorite_tool_ids` as JSON. */
  favoriteToolIds: ToolTabId[];
}

export const ADMIN_DEFAULT_USERNAME = "admin";
export const ADMIN_DEFAULT_PASSWORD = "admin";
export const BCRYPT_ROUNDS = 10;

export const EXCHANGE_SUFFIX_MAP: Record<string, string> = {
  XET: ".DE",
  TGD: ".DE",
  TDG: ".DE",
  FRA: ".F",
  MAD: ".MC",
  BME: ".MC",
  LSE: ".L",
  OMK: ".CO",
  CPH: ".CO",
  PAR: ".PA",
  AMS: ".AS",
  BRU: ".BR",
  MIL: ".MI",
  HEL: ".HE",
  VIE: ".VI",
  SWX: ".SW",
  TSE: ".TO",
  TOR: ".TO",
  HKG: ".HK",
  XHKG: ".HK",
};

export function str(val: unknown): string {
  return val == null ? "" : String(val);
}

export function num(val: unknown): number {
  if (val == null) return 0;
  const n = Number(val);
  return isNaN(n) ? 0 : n;
}

export function holdingAssetType(val: unknown): HoldingAssetType {
  if (val === "etf") return "etf";
  if (val === "crypto") return "crypto";
  if (val === "fund") return "fund";
  return "stock";
}

/** Parse JSON array from `holdings.tags`; invalid input yields []. */
export function parseHoldingTagsJson(raw: unknown): string[] {
  if (raw == null || raw === "") return [];
  try {
    const parsed = JSON.parse(String(raw));
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((x): x is string => typeof x === "string")
      .map((x) => x.trim())
      .filter(Boolean)
      .slice(0, 20);
  } catch {
    return [];
  }
}

export function serializeHoldingTags(tags: string[] | undefined): string {
  const arr = (tags ?? [])
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 20);
  return JSON.stringify(arr);
}

/** Union tags from duplicate ticker rows; dedupe case-insensitively, keep first spelling. */
export function mergeHoldingTags(a: string[] | undefined, b: string[] | undefined): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of [...(a ?? []), ...(b ?? [])]) {
    const trimmed = t.trim();
    if (!trimmed) continue;
    const k = trimmed.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(trimmed);
  }
  return out;
}

export function txType(val: unknown): TransactionType {
  const v = String(val);
  if (v === "sell" || v === "dividend" || v === "fee") return v;
  return "buy";
}

export function alertCondition(val: unknown): AlertCondition {
  return val === "below" ? "below" : "above";
}

export function alertType(val: unknown): AlertType {
  return val === "percent_change" ? "percent_change" : "threshold";
}

export function percentBasis(val: unknown): PercentBasis | "" {
  const v = String(val);
  if (v === "daily" || v === "purchase") return v;
  return "";
}

export function parseExperienceLevel(val: unknown): ExperienceLevel {
  const v = String(val || "");
  if (v === "beginner" || v === "intermediate" || v === "experienced" || v === "professional") return v;
  return "";
}

export function parseAlertChannels(val: unknown): NotificationChannel[] {
  const raw = String(val || "email").replace(/whatsapp/g, "telegram");
  return raw.split(",").filter((c): c is NotificationChannel =>
    ["email", "push", "telegram", "device"].includes(c)
  );
}

export function feedbackStatus(val: unknown): "open" | "answered" | "closed" {
  const v = String(val);
  if (v === "answered" || v === "closed") return v;
  return "open";
}

export function feedbackType(val: unknown): "feedback" | "bug" {
  const v = String(val);
  if (v === "bug") return "bug";
  return "feedback";
}

export function parseRefreshInterval(val: unknown): RefreshInterval {
  const n = Number(val);
  if (n === 30 || n === 60) return n;
  return 15;
}

/**
 * Ensures the ticker carries the correct exchange suffix for Yahoo/AV lookups.
 * Only appends the suffix when the ticker doesn't already contain a dot
 * and the exchange is one we know needs a suffix.
 */
const YAHOO_EXCHANGE_MAP: Record<string, string> = {
  NMS: "NASDAQ",
  NGM: "NASDAQ",
  NCM: "NASDAQ",
  NYQ: "NYSE",
  PCX: "NYSE",
  BTS: "NYSE",
  GER: "XET",
  MCE: "MAD",
  EBS: "SWX",
};

export function normalizeYahooExchange(yahooExchange: string): string {
  const upper = yahooExchange.toUpperCase();
  return YAHOO_EXCHANGE_MAP[upper] || upper;
}

export function normalizeTickerForExchange(ticker: string, exchange: string): string {
  if (ticker.includes(".")) return ticker;
  const suffix = EXCHANGE_SUFFIX_MAP[exchange.toUpperCase()];
  return suffix ? `${ticker}${suffix}` : ticker;
}

const KNOWN_SUFFIXES = new Set(Object.values(EXCHANGE_SUFFIX_MAP));

/**
 * Normalize a crypto ticker for Yahoo Finance: replace spaces with hyphens.
 * "BTC USD" → "BTC-USD", "ETH EUR" → "ETH-EUR". Non-crypto tickers pass through unchanged.
 */
export function normalizeCryptoTicker(ticker: string): string {
  return ticker.includes(" ") ? ticker.replace(/\s+/g, "-") : ticker;
}

const CRYPTO_PAIR_CCY = /-(USD|EUR|GBP|USDT|USDC)$/i;

/**
 * Quote currency encoded in a Yahoo-style crypto pair ticker (`BTC-EUR` → `EUR`).
 * Returns null when the ticker is not a recognized *-CCY pair.
 */
export function currencyFromCryptoTicker(ticker: string): string | null {
  const m = normalizeCryptoTicker(ticker.trim().toUpperCase()).match(CRYPTO_PAIR_CCY);
  if (!m) return null;
  const ccy = m[1].toUpperCase();
  if (ccy === "USDT" || ccy === "USDC") return "USD";
  return ccy;
}

/** Strip known exchange suffixes (.L, .DE, .TO, …) to get the base ticker. */
export function baseTickerName(ticker: string): string {
  for (const sfx of KNOWN_SUFFIXES) {
    if (ticker.endsWith(sfx)) return ticker.slice(0, -sfx.length);
  }
  return ticker;
}

export function rowToDbUser(row: Row): DbUser {
  return {
    id: str(row.id),
    username: str(row.username),
    password_hash: str(row.password_hash),
    role: row.role === "admin" ? "admin" : "user",
    must_change_password: num(row.must_change_password),
    created_at: str(row.created_at),
    email: str(row.email),
    display_name: str(row.display_name),
    avatar_url: str(row.avatar_url),
    plan: row.plan === "pro" || row.plan === "starter" ? "pro" : "free",
    stripe_customer_id: str(row.stripe_customer_id),
    stripe_subscription_id: str(row.stripe_subscription_id),
    plan_expires_at: str(row.plan_expires_at),
    ai_calls_this_month: num(row.ai_calls_this_month),
    ai_calls_reset_at: str(row.ai_calls_reset_at),
    ai_calls_today: num(row.ai_calls_today),
    ai_daily_reset_at: str(row.ai_daily_reset_at),
    ai_tokens_this_month: num(row.ai_tokens_this_month),
    ai_tokens_today: num(row.ai_tokens_today),
    email_verified: num(row.email_verified),
    auth_provider: (["google", "apple"] as const).includes(str(row.auth_provider) as "google" | "apple")
      ? (str(row.auth_provider) as "google" | "apple")
      : "credentials",
    google_id: str(row.google_id),
    apple_id: str(row.apple_id),
    idp_sub: str(row.idp_sub),
    portfolio_review_count: num(row.portfolio_review_count),
    portfolio_review_reset_at: str(row.portfolio_review_reset_at),
    widget_token_hash: str(row.widget_token_hash),
    device_passkey_hash: str(row.device_passkey_hash),
    device_template_id: str(row.device_template_id) || "classic-dark",
    device_linked_at: str(row.device_linked_at),
    device_pro_redeemed_at: str(row.device_pro_redeemed_at),
    device_portfolio_id: str(row.device_portfolio_id),
    last_active_at: str(row.last_active_at),
    tax_residency: str(row.tax_residency),
    onboarding_completed: num(row.onboarding_completed),
    experience_level: parseExperienceLevel(row.experience_level),
    referral_code: str(row.referral_code),
    referred_by: str(row.referred_by),
    referral_reward_days: num(row.referral_reward_days),
    trial_invited_at: str(row.trial_invited_at),
    trial_activated_at: str(row.trial_activated_at),
    trial_token: str(row.trial_token),
    trial_expired_notified: num(row.trial_expired_notified),
    membership_grant_token: str(row.membership_grant_token),
    membership_grant_plan: str(row.membership_grant_plan),
    membership_grant_days: num(row.membership_grant_days),
    membership_grant_created_at: str(row.membership_grant_created_at),
    commerce_complimentary_at: str(row.commerce_complimentary_at),
    checklist_dismissed_at: str(row.checklist_dismissed_at),
    weekly_digest_enabled: num(row.weekly_digest_enabled ?? 1),
    profile_slug: str(row.profile_slug),
    bio: str(row.bio),
    social_visibility: str(row.social_visibility) || "private",
    headline: str(row.headline),
    share_portfolio_value: num(row.share_portfolio_value),
    share_holdings: num(row.share_holdings),
    allow_comments: num(row.allow_comments ?? 1),
  };
}

export function rowToPortfolio(row: Row): Portfolio {
  const raw = str(row.currency).toUpperCase() as PortfolioCurrency;
  const currency: PortfolioCurrency = SUPPORTED_PORTFOLIO_CURRENCIES.includes(raw) ? raw : "EUR";
  return {
    id: str(row.id),
    userId: str(row.user_id),
    name: str(row.name),
    isDefault: num(row.is_default) === 1,
    sortOrder: num(row.sort_order),
    currency,
    createdAt: str(row.created_at),
  };
}

export function mapUser(user: DbUser): PublicUser {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    mustChangePassword: user.must_change_password === 1,
    createdAt: user.created_at,
    email: user.email,
    displayName: user.display_name,
    avatarUrl: user.avatar_url,
    plan: user.plan,
    planExpiresAt: user.plan_expires_at,
    aiCallsThisMonth: user.ai_calls_this_month,
    aiCallsResetAt: user.ai_calls_reset_at,
    aiCallsToday: user.ai_calls_today,
    aiDailyResetAt: user.ai_daily_reset_at,
    aiTokensThisMonth: user.ai_tokens_this_month,
    aiTokensToday: user.ai_tokens_today,
    emailVerified: user.email_verified === 1,
    authProvider: user.auth_provider,
    portfolioReviewCount: user.portfolio_review_count,
    portfolioReviewResetAt: user.portfolio_review_reset_at,
    hasWidgetToken: !!user.widget_token_hash,
    hasDevicePasskey: !!user.device_passkey_hash,
    deviceProEligible: !!user.device_linked_at && !user.device_pro_redeemed_at && user.plan === "free",
    devicePortfolioId: user.device_portfolio_id,
    lastActiveAt: user.last_active_at,
    experienceLevel: user.experience_level,
    referralCode: user.referral_code,
    referralRewardDays: user.referral_reward_days,
    profileSlug: user.profile_slug,
    bio: user.bio,
    socialVisibility: user.social_visibility,
    headline: user.headline,
    sharePortfolioValue: user.share_portfolio_value === 1,
    shareHoldings: user.share_holdings === 1,
    allowComments: user.allow_comments === 1,
  };
}

export function monthWindowKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function shouldResetAiWindow(lastResetAt: string): boolean {
  if (!lastResetAt) return true;
  const parsed = new Date(lastResetAt);
  if (isNaN(parsed.getTime())) return true;
  return monthWindowKey(parsed) !== monthWindowKey(new Date());
}

export function shouldResetDailyAiWindow(resetAt: string): boolean {
  if (!resetAt) return true;
  const d = new Date(resetAt);
  const now = new Date();
  return d.getUTCFullYear() !== now.getUTCFullYear() ||
    d.getUTCMonth() !== now.getUTCMonth() ||
    d.getUTCDate() !== now.getUTCDate();
}
