import type { Row } from "@libsql/client";
import type {
  AlertCondition,
  HoldingAssetType,
  Language,
  RefreshInterval,
  TransactionType,
} from "@/lib/types";

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
  email_verified: number;
  auth_provider: AuthProvider;
  google_id: string;
  apple_id: string;
  portfolio_review_count: number;
  portfolio_review_reset_at: string;
  widget_token_hash: string;
  device_passkey_hash: string;
  device_template_id: string;
  device_linked_at: string;
  device_pro_redeemed_at: string;
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
  emailVerified: boolean;
  authProvider: AuthProvider;
  portfolioReviewCount: number;
  portfolioReviewResetAt: string;
  hasWidgetToken: boolean;
  hasDevicePasskey: boolean;
  deviceProEligible: boolean;
}

export interface UserSettings {
  provider: "yahoo" | "alphavantage";
  alphaVantageApiKey: string;
  language: Language;
  refreshInterval: RefreshInterval;
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
  return val === "etf" ? "etf" : "stock";
}

export function txType(val: unknown): TransactionType {
  const v = String(val);
  if (v === "sell" || v === "dividend" || v === "fee") return v;
  return "buy";
}

export function alertCondition(val: unknown): AlertCondition {
  return val === "below" ? "below" : "above";
}

export function feedbackStatus(val: unknown): "open" | "answered" | "closed" {
  const v = String(val);
  if (v === "answered" || v === "closed") return v;
  return "open";
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
export function normalizeTickerForExchange(ticker: string, exchange: string): string {
  if (ticker.includes(".")) return ticker;
  const suffix = EXCHANGE_SUFFIX_MAP[exchange.toUpperCase()];
  return suffix ? `${ticker}${suffix}` : ticker;
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
    plan: row.plan === "pro" ? "pro" : "free",
    stripe_customer_id: str(row.stripe_customer_id),
    stripe_subscription_id: str(row.stripe_subscription_id),
    plan_expires_at: str(row.plan_expires_at),
    ai_calls_this_month: num(row.ai_calls_this_month),
    ai_calls_reset_at: str(row.ai_calls_reset_at),
    ai_calls_today: num(row.ai_calls_today),
    ai_daily_reset_at: str(row.ai_daily_reset_at),
    email_verified: num(row.email_verified),
    auth_provider: (["google", "apple"] as const).includes(str(row.auth_provider) as "google" | "apple")
      ? (str(row.auth_provider) as "google" | "apple")
      : "credentials",
    google_id: str(row.google_id),
    apple_id: str(row.apple_id),
    portfolio_review_count: num(row.portfolio_review_count),
    portfolio_review_reset_at: str(row.portfolio_review_reset_at),
    widget_token_hash: str(row.widget_token_hash),
    device_passkey_hash: str(row.device_passkey_hash),
    device_template_id: str(row.device_template_id) || "classic-dark",
    device_linked_at: str(row.device_linked_at),
    device_pro_redeemed_at: str(row.device_pro_redeemed_at),
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
    emailVerified: user.email_verified === 1,
    authProvider: user.auth_provider,
    portfolioReviewCount: user.portfolio_review_count,
    portfolioReviewResetAt: user.portfolio_review_reset_at,
    hasWidgetToken: !!user.widget_token_hash,
    hasDevicePasskey: !!user.device_passkey_hash,
    deviceProEligible: !!user.device_linked_at && !user.device_pro_redeemed_at && user.plan === "free",
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
