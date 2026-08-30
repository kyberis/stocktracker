import { randomUUID, randomBytes, createHash } from "crypto";
import { ensureInitialized } from "./client";
import {
  type DbUser,
  type PublicUser,
  type UserRole,
  type UserPlan,
  type AuthProvider,
  str,
  rowToDbUser,
  mapUser,
  shouldResetAiWindow,
  shouldResetDailyAiWindow,
  num,
} from "./helpers";
import { sqlExcludeTestAccountEmail, sqlIsTestAccountEmail } from "@/lib/test-accounts";
import { seedHoldingsForUser, seedCashForUser, seedTransactionsForUser } from "./seed";
import { resolvePortfolioId } from "./portfolios";
import { normalizeAttribution, type FirstTouchAttribution } from "@/lib/attribution";
import { effectivePlan } from "@/lib/subscription";

export async function findUserByUsername(username: string): Promise<DbUser | null> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "SELECT * FROM users WHERE username = ? AND deleted_at = ''",
    args: [username],
  });
  if (result.rows.length === 0) return null;
  return rowToDbUser(result.rows[0]);
}

export async function findUserByEmail(email: string): Promise<DbUser | null> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "SELECT * FROM users WHERE LOWER(email) = LOWER(?) AND deleted_at = ''",
    args: [email],
  });
  if (result.rows.length === 0) return null;
  return rowToDbUser(result.rows[0]);
}

export async function findUserByGoogleId(googleId: string): Promise<DbUser | null> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "SELECT * FROM users WHERE google_id = ? AND deleted_at = ''",
    args: [googleId],
  });
  if (result.rows.length === 0) return null;
  return rowToDbUser(result.rows[0]);
}

export async function findUserByAppleId(appleId: string): Promise<DbUser | null> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "SELECT * FROM users WHERE apple_id = ? AND deleted_at = ''",
    args: [appleId],
  });
  if (result.rows.length === 0) return null;
  return rowToDbUser(result.rows[0]);
}

export async function findUserById(userId: string): Promise<DbUser | null> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "SELECT * FROM users WHERE id = ?",
    args: [userId],
  });
  if (result.rows.length === 0) return null;
  return rowToDbUser(result.rows[0]);
}

/** Resolve local trefolio user id from IdP subject (`idp_sub`). */
export async function findUserIdByIdpSub(idpSub: string): Promise<string | null> {
  const sub = idpSub.trim();
  if (!sub) return null;
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "SELECT id FROM users WHERE idp_sub = ? AND deleted_at = '' LIMIT 1",
    args: [sub],
  });
  if (result.rows.length === 0) return null;
  return str(result.rows[0].id);
}

export async function listUsers(): Promise<PublicUser[]> {
  const client = await ensureInitialized();
  const result = await client.execute("SELECT * FROM users ORDER BY created_at ASC");
  return result.rows.map(rowToDbUser).map(mapUser);
}

export interface ProdOpsLatestCreatedUser {
  id: string;
  username: string;
  email: string;
  displayName: string;
  authProvider: AuthProvider;
  plan: UserPlan;
  createdAt: string;
}

export async function getLatestCreatedUser(): Promise<ProdOpsLatestCreatedUser | null> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT id, username, email, display_name, auth_provider, plan, created_at
          FROM users
          WHERE deleted_at = ''
          ORDER BY created_at DESC
          LIMIT 1`,
  });
  const row = result.rows[0];
  if (!row) return null;
  return {
    id: str(row.id),
    username: str(row.username),
    email: str(row.email),
    displayName: str(row.display_name),
    authProvider: str(row.auth_provider) as AuthProvider,
    plan: str(row.plan) as UserPlan,
    createdAt: str(row.created_at),
  };
}

export async function createUser(params: {
  username: string;
  passwordHash: string;
  email?: string;
  displayName?: string;
  authProvider?: "credentials" | "google" | "apple";
  googleId?: string;
  appleId?: string;
  avatarUrl?: string;
  emailVerified?: boolean;
  seedWithData: boolean;
  attribution?: FirstTouchAttribution;
}): Promise<PublicUser> {
  const client = await ensureInitialized();
  const id = randomUUID();
  const attribution = normalizeAttribution(params.attribution);

  await client.batch(
    [
      {
        sql: `INSERT INTO users (id, username, password_hash, role, must_change_password,
              ai_calls_reset_at, email, display_name, avatar_url, auth_provider, google_id, apple_id, email_verified,
              utm_source, utm_medium, utm_campaign, utm_term, utm_content, attribution_landing_path, attribution_referrer, attribution_captured_at)
              VALUES (?, ?, ?, 'user', 0, datetime('now'), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          id, params.username, params.passwordHash,
          params.email || "", params.displayName || "", params.avatarUrl || "",
          params.authProvider || "credentials", params.googleId || "", params.appleId || "",
          params.emailVerified ? 1 : 0,
          attribution.source,
          attribution.medium,
          attribution.campaign,
          attribution.term,
          attribution.content,
          attribution.landingPath,
          attribution.referrer,
          attribution.capturedAt,
        ],
      },
      {
        sql: `INSERT INTO user_settings (user_id, provider, alpha_vantage_api_key, language)
              VALUES (?, 'yahoo', '', 'en')`,
        args: [id],
      },
    ],
    "write"
  );

  if (params.seedWithData) {
    const portfolioId = await resolvePortfolioId(id);
    await seedHoldingsForUser(client, id, portfolioId);
    await seedCashForUser(client, id, portfolioId);
    await seedTransactionsForUser(client, id, portfolioId);
  }

  const created = await findUserById(id);
  if (!created) throw new Error("Failed to create user");
  return mapUser(created);
}

export async function updateUserPassword(
  userId: string,
  passwordHash: string,
  mustChangePassword: boolean
) {
  const client = await ensureInitialized();
  await client.execute({
    sql: "UPDATE users SET password_hash = ?, must_change_password = ? WHERE id = ?",
    args: [passwordHash, mustChangePassword ? 1 : 0, userId],
  });
}

export async function updateUserProfile(
  userId: string,
  updates: Partial<{ email: string; displayName: string; avatarUrl: string; devicePortfolioId: string; taxResidency: string }>
): Promise<PublicUser | null> {
  const client = await ensureInitialized();
  const user = await findUserById(userId);
  if (!user) return null;

  const email = updates.email ?? user.email;
  const displayName = updates.displayName ?? user.display_name;
  const avatarUrl = updates.avatarUrl ?? user.avatar_url;
  const devicePortfolioId = updates.devicePortfolioId !== undefined ? updates.devicePortfolioId : (user.device_portfolio_id ?? "");
  const taxResidency = updates.taxResidency !== undefined ? updates.taxResidency : (user.tax_residency ?? "");

  await client.execute({
    sql: "UPDATE users SET email = ?, display_name = ?, avatar_url = ?, device_portfolio_id = ?, tax_residency = ? WHERE id = ?",
    args: [email, displayName, avatarUrl, devicePortfolioId, taxResidency, userId],
  });

  const updated = await findUserById(userId);
  return updated ? mapUser(updated) : null;
}

export async function completeOnboarding(
  userId: string,
  data: { displayName?: string; taxResidency?: string; experienceLevel?: string; useCase?: string[]; referralSource?: string }
): Promise<void> {
  const client = await ensureInitialized();
  const sets: string[] = ["onboarding_completed = 1"];
  const args: (string | number)[] = [];

  if (data.displayName !== undefined) {
    sets.push("display_name = ?");
    args.push(data.displayName);
  }
  if (data.taxResidency !== undefined) {
    sets.push("tax_residency = ?");
    args.push(data.taxResidency);
  }
  if (data.experienceLevel !== undefined) {
    sets.push("experience_level = ?");
    args.push(data.experienceLevel);
  }
  if (data.useCase !== undefined && data.useCase.length > 0) {
    sets.push("use_case = ?");
    args.push(JSON.stringify(data.useCase));
  }
  if (data.referralSource !== undefined) {
    sets.push("referral_source = ?");
    args.push(data.referralSource);
  }
  args.push(userId);

  await client.execute({
    sql: `UPDATE users SET ${sets.join(", ")} WHERE id = ?`,
    args,
  });
}

export async function updateUserRole(userId: string, role: UserRole): Promise<void> {
  const client = await ensureInitialized();
  await client.execute({
    sql: "UPDATE users SET role = ? WHERE id = ?",
    args: [role, userId],
  });
}

export async function updateUserSubscription(
  userId: string,
  updates: Partial<{
    plan: UserPlan;
    stripeCustomerId: string;
    stripeSubscriptionId: string;
    planExpiresAt: string;
  }>
): Promise<void> {
  const client = await ensureInitialized();
  const user = await findUserById(userId);
  if (!user) return;
  const nextPlan = updates.plan ?? user.plan;
  const nextStripeCustomerId = updates.stripeCustomerId ?? user.stripe_customer_id;
  const nextStripeSubscriptionId = updates.stripeSubscriptionId ?? user.stripe_subscription_id;
  const nextPlanExpiresAt = updates.planExpiresAt ?? user.plan_expires_at;
  await client.execute({
    sql: `UPDATE users
          SET plan = ?, stripe_customer_id = ?, stripe_subscription_id = ?, plan_expires_at = ?
          WHERE id = ?`,
    args: [nextPlan, nextStripeCustomerId, nextStripeSubscriptionId, nextPlanExpiresAt, userId],
  });
}

export async function findUserByStripeCustomerId(customerId: string): Promise<DbUser | null> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "SELECT * FROM users WHERE stripe_customer_id = ? AND deleted_at = ''",
    args: [customerId],
  });
  if (result.rows.length === 0) return null;
  return rowToDbUser(result.rows[0]);
}

export async function findUserByStripeSubscriptionId(subscriptionId: string): Promise<DbUser | null> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "SELECT * FROM users WHERE stripe_subscription_id = ? AND deleted_at = ''",
    args: [subscriptionId],
  });
  if (result.rows.length === 0) return null;
  return rowToDbUser(result.rows[0]);
}

export async function resetAiUsageWindow(userId: string): Promise<void> {
  const client = await ensureInitialized();
  await client.execute({
    sql: "UPDATE users SET ai_calls_this_month = 0, ai_calls_reset_at = datetime('now') WHERE id = ?",
    args: [userId],
  });
}

export async function getAiUsage(userId: string): Promise<{
  plan: UserPlan;
  aiCallsThisMonth: number;
  aiCallsResetAt: string;
}> {
  const user = await findUserById(userId);
  if (!user) {
    return { plan: "free", aiCallsThisMonth: 0, aiCallsResetAt: new Date().toISOString() };
  }
  if (shouldResetAiWindow(user.ai_calls_reset_at)) {
    await resetAiUsageWindow(userId);
    return { plan: user.plan, aiCallsThisMonth: 0, aiCallsResetAt: new Date().toISOString() };
  }
  return {
    plan: user.plan,
    aiCallsThisMonth: user.ai_calls_this_month,
    aiCallsResetAt: user.ai_calls_reset_at,
  };
}

export async function incrementAiUsage(userId: string): Promise<number> {
  const usage = await getAiUsage(userId);
  const client = await ensureInitialized();
  const next = usage.aiCallsThisMonth + 1;
  await client.execute({
    sql: "UPDATE users SET ai_calls_this_month = ? WHERE id = ?",
    args: [next, userId],
  });
  return next;
}

export async function getDailyAiUsage(userId: string): Promise<{ aiCallsToday: number; aiDailyResetAt: string }> {
  const user = await findUserById(userId);
  if (!user) return { aiCallsToday: 0, aiDailyResetAt: new Date().toISOString() };
  if (shouldResetDailyAiWindow(user.ai_daily_reset_at)) {
    const client = await ensureInitialized();
    await client.execute({
      sql: "UPDATE users SET ai_calls_today = 0, ai_daily_reset_at = datetime('now') WHERE id = ?",
      args: [userId],
    });
    return { aiCallsToday: 0, aiDailyResetAt: new Date().toISOString() };
  }
  return { aiCallsToday: user.ai_calls_today, aiDailyResetAt: user.ai_daily_reset_at };
}

export async function incrementDailyAiUsage(userId: string): Promise<number> {
  const usage = await getDailyAiUsage(userId);
  const next = usage.aiCallsToday + 1;
  const client = await ensureInitialized();
  await client.execute({
    sql: "UPDATE users SET ai_calls_today = ? WHERE id = ?",
    args: [next, userId],
  });
  return next;
}

export async function getAiTokenUsage(userId: string): Promise<{
  plan: UserPlan;
  aiTokensThisMonth: number;
  aiTokensToday: number;
  aiCallsResetAt: string;
}> {
  const user = await findUserById(userId);
  if (!user) {
    return { plan: "free", aiTokensThisMonth: 0, aiTokensToday: 0, aiCallsResetAt: new Date().toISOString() };
  }
  if (shouldResetAiWindow(user.ai_calls_reset_at)) {
    const client = await ensureInitialized();
    await client.execute({
      sql: "UPDATE users SET ai_tokens_this_month = 0, ai_calls_this_month = 0, ai_calls_reset_at = datetime('now') WHERE id = ?",
      args: [userId],
    });
    const tokensToday = shouldResetDailyAiWindow(user.ai_daily_reset_at) ? 0 : user.ai_tokens_today;
    return { plan: user.plan, aiTokensThisMonth: 0, aiTokensToday: tokensToday, aiCallsResetAt: new Date().toISOString() };
  }
  const tokensToday = shouldResetDailyAiWindow(user.ai_daily_reset_at) ? 0 : user.ai_tokens_today;
  return {
    plan: user.plan,
    aiTokensThisMonth: user.ai_tokens_this_month,
    aiTokensToday: tokensToday,
    aiCallsResetAt: user.ai_calls_reset_at,
  };
}

export async function incrementAiTokenUsage(userId: string, tokens: number): Promise<number> {
  if (tokens <= 0) return 0;
  const usage = await getAiTokenUsage(userId);
  const client = await ensureInitialized();
  const next = usage.aiTokensThisMonth + tokens;
  await client.execute({
    sql: "UPDATE users SET ai_tokens_this_month = ? WHERE id = ?",
    args: [next, userId],
  });
  return next;
}

export async function incrementDailyAiTokenUsage(userId: string, tokens: number): Promise<number> {
  if (tokens <= 0) return 0;
  const user = await findUserById(userId);
  if (!user) return 0;
  const client = await ensureInitialized();
  if (shouldResetDailyAiWindow(user.ai_daily_reset_at)) {
    await client.execute({
      sql: "UPDATE users SET ai_tokens_today = ?, ai_calls_today = 0, ai_daily_reset_at = datetime('now') WHERE id = ?",
      args: [tokens, userId],
    });
    return tokens;
  }
  const next = user.ai_tokens_today + tokens;
  await client.execute({
    sql: "UPDATE users SET ai_tokens_today = ? WHERE id = ?",
    args: [next, userId],
  });
  return next;
}

export async function countProSubscribers(): Promise<number> {
  const client = await ensureInitialized();
  const result = await client.execute(
    "SELECT COUNT(*) as cnt FROM users WHERE plan = 'pro' AND deleted_at = ''",
  );
  return num(result.rows[0]?.cnt);
}

/**
 * Soft-delete a user for GDPR erasure while retaining an anonymized tombstone
 * so admins can still see the account as deleted in the users list.
 *
 * Personal data is purged from related tables (CASCADE where possible, plus
 * explicit deletes for non-CASCADE FKs). The users row is kept with scrubbed
 * PII and deleted_at set.
 */
export async function deleteUser(userId: string) {
  const existing = await findUserById(userId);
  if (!existing) return;
  if (existing.deleted_at) return;

  const client = await ensureInitialized();
  const tag = `deleted-${userId.replace(/-/g, "").slice(0, 12)}`;
  const createdAt = existing.created_at;
  const plan = existing.plan;
  const authProvider = existing.auth_provider;

  // Non-CASCADE refs that would block a hard DELETE (and hold PII).
  const nonCascadePurge: { sql: string; args: (string)[] }[] = [
    { sql: "DELETE FROM unsubscribe_tokens WHERE user_id = ?", args: [userId] },
    { sql: "DELETE FROM email_sends WHERE user_id = ?", args: [userId] },
    { sql: "DELETE FROM private_chat_reactions WHERE user_id = ?", args: [userId] },
    { sql: "DELETE FROM private_chat_messages WHERE sender_id = ?", args: [userId] },
    { sql: "DELETE FROM private_chat_participants WHERE user_id = ?", args: [userId] },
    { sql: "DELETE FROM private_chat_rooms WHERE created_by = ?", args: [userId] },
    { sql: "DELETE FROM social_post_comments WHERE user_id = ?", args: [userId] },
    { sql: "DELETE FROM social_posts WHERE user_id = ?", args: [userId] },
    {
      sql: "DELETE FROM user_connections WHERE requester_id = ? OR receiver_id = ?",
      args: [userId, userId],
    },
  ];
  for (const stmt of nonCascadePurge) {
    try {
      await client.execute(stmt);
    } catch {
      // Table may not exist in older/local DBs; continue erasure.
    }
  }

  // Hard-delete so ON DELETE CASCADE purges holdings, settings, etc.
  await client.execute({ sql: "DELETE FROM users WHERE id = ?", args: [userId] });

  // Re-insert anonymized tombstone for admin listing (same id for continuity).
  // Email is intentionally blank — no outbound mail address remains.
  await client.execute({
    sql: `INSERT INTO users (
      id, username, password_hash, role, must_change_password,
      created_at, email, display_name, plan, auth_provider, deleted_at, referral_code,
      email_verified
    ) VALUES (?, ?, '', 'user', 0, ?, '', '', ?, ?, datetime('now'), ?, 0)`,
    args: [
      userId,
      tag,
      createdAt,
      plan,
      authProvider,
      `del-${tag}`,
    ],
  });
}

/** True when an email address belongs to a deleted-account tombstone (or is empty). */
export function isDeletedTombstoneEmail(email: string | null | undefined): boolean {
  const value = (email ?? "").trim().toLowerCase();
  if (!value) return true;
  return (
    value.endsWith("@deleted.invalid") ||
    value.endsWith("@deleted.local") ||
    /^deleted-[a-z0-9]+@/.test(value)
  );
}

export function toPublicUser(user: DbUser): PublicUser {
  return mapUser(user);
}

export async function getPortfolioReviewUsage(userId: string): Promise<{
  count: number;
  resetAt: string;
}> {
  const user = await findUserById(userId);
  if (!user) return { count: 0, resetAt: new Date().toISOString() };
  if (shouldResetAiWindow(user.portfolio_review_reset_at)) {
    const client = await ensureInitialized();
    await client.execute({
      sql: "UPDATE users SET portfolio_review_count = 0, portfolio_review_reset_at = datetime('now') WHERE id = ?",
      args: [userId],
    });
    return { count: 0, resetAt: new Date().toISOString() };
  }
  return { count: user.portfolio_review_count, resetAt: user.portfolio_review_reset_at };
}

export async function incrementPortfolioReviewUsage(userId: string): Promise<number> {
  const usage = await getPortfolioReviewUsage(userId);
  const next = usage.count + 1;
  const client = await ensureInitialized();
  await client.execute({
    sql: "UPDATE users SET portfolio_review_count = ? WHERE id = ?",
    args: [next, userId],
  });
  return next;
}

export async function setEmailVerified(userId: string, verified: boolean): Promise<void> {
  const client = await ensureInitialized();
  await client.execute({
    sql: "UPDATE users SET email_verified = ? WHERE id = ?",
    args: [verified ? 1 : 0, userId],
  });
}

export async function linkGoogleAccount(userId: string, googleId: string): Promise<void> {
  const client = await ensureInitialized();
  await client.execute({
    sql: "UPDATE users SET google_id = ? WHERE id = ?",
    args: [googleId, userId],
  });
}

export async function unlinkGoogleAccount(userId: string): Promise<void> {
  const client = await ensureInitialized();
  await client.execute({
    sql: "UPDATE users SET google_id = '' WHERE id = ?",
    args: [userId],
  });
}

export async function linkAppleAccount(userId: string, appleId: string): Promise<void> {
  const client = await ensureInitialized();
  await client.execute({
    sql: "UPDATE users SET apple_id = ? WHERE id = ?",
    args: [appleId, userId],
  });
}

export async function unlinkAppleAccount(userId: string): Promise<void> {
  const client = await ensureInitialized();
  await client.execute({
    sql: "UPDATE users SET apple_id = '' WHERE id = ?",
    args: [userId],
  });
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export {
  generateWidgetToken,
  revokeWidgetToken,
  findUserByWidgetToken,
  listWidgetTokens,
  getLatestValidWidgetToken,
  userHasActiveWidgetToken,
  widgetTokenPrefix,
} from "./widget-tokens";
export type { WidgetTokenListItem } from "./widget-tokens";

export async function generateDevicePasskey(userId: string): Promise<string> {
  const client = await ensureInitialized();
  const bytes = randomBytes(12);
  const digits = Array.from(bytes).map((b) => String(b % 10));
  const passkey = `${digits.slice(0, 4).join("")}-${digits.slice(4, 8).join("")}-${digits.slice(8, 12).join("")}`;
  const hash = hashToken(passkey);
  await client.execute({
    sql: "UPDATE users SET device_passkey_hash = ? WHERE id = ?",
    args: [hash, userId],
  });
  return passkey;
}

export async function revokeDevicePasskey(userId: string): Promise<void> {
  const client = await ensureInitialized();
  await client.execute({
    sql: "UPDATE users SET device_passkey_hash = '' WHERE id = ?",
    args: [userId],
  });
}

export async function findUserByDevicePasskey(passkey: string): Promise<DbUser | null> {
  const normalized = passkey?.trim() ?? "";
  if (!normalized) return null;
  const isLegacy = /^\d{4}-\d{4}$/.test(normalized);
  const isNew = /^\d{4}-\d{4}-\d{4}$/.test(normalized);
  if (!isLegacy && !isNew) return null;
  const client = await ensureInitialized();
  const hash = hashToken(normalized);
  const result = await client.execute({
    sql: "SELECT * FROM users WHERE device_passkey_hash = ? AND deleted_at = ''",
    args: [hash],
  });
  if (result.rows.length === 0) return null;
  return rowToDbUser(result.rows[0]);
}

export type TrialTokenStatus = "valid" | "already_used" | "invalid";

export async function checkTrialToken(token: string): Promise<TrialTokenStatus> {
  if (!token) return "invalid";
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "SELECT trial_activated_at FROM users WHERE trial_token = ?",
    args: [token],
  });
  if (result.rows.length === 0) return "invalid";
  const activated = String(result.rows[0].trial_activated_at ?? "");
  return activated !== "" ? "already_used" : "valid";
}

export const MEMBERSHIP_GRANT_MIN_DAYS = 1;
export const MEMBERSHIP_GRANT_MAX_DAYS = 730;

/** Expiry for a complimentary grant activated now; stacks when same effective tier has a future end date. */
export function computeMembershipGrantExpiry(user: DbUser, grantPlan: UserPlan, days: number): Date {
  const now = new Date();
  const eff = effectivePlan(user.plan, user.plan_expires_at);
  const currentExpiry = user.plan_expires_at ? new Date(user.plan_expires_at) : null;
  const ms = days * 86400000;
  if (
    grantPlan === eff &&
    currentExpiry &&
    !Number.isNaN(currentExpiry.getTime()) &&
    currentExpiry > now
  ) {
    return new Date(currentExpiry.getTime() + ms);
  }
  return new Date(now.getTime() + ms);
}

export async function setPendingMembershipGrant(
  userId: string,
  grantPlan: "basic" | "pro" | "wealth",
  days: number,
): Promise<{ token: string }> {
  const token = randomBytes(32).toString("hex");
  const client = await ensureInitialized();
  await client.execute({
    sql: `UPDATE users SET membership_grant_token = ?, membership_grant_plan = ?, membership_grant_days = ?, membership_grant_created_at = datetime('now') WHERE id = ?`,
    args: [token, grantPlan, days, userId],
  });
  return { token };
}

export async function clearMembershipGrantFields(userId: string): Promise<void> {
  const client = await ensureInitialized();
  await client.execute({
    sql: `UPDATE users SET membership_grant_token = '', membership_grant_plan = '', membership_grant_days = 0, membership_grant_created_at = '' WHERE id = ?`,
    args: [userId],
  });
}

export type MembershipGrantTokenStatus = "valid" | "invalid";

export async function checkMembershipGrantToken(token: string): Promise<MembershipGrantTokenStatus> {
  if (!token) return "invalid";
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "SELECT 1 FROM users WHERE membership_grant_token = ? AND membership_grant_token != ''",
    args: [token],
  });
  return result.rows.length > 0 ? "valid" : "invalid";
}

export async function applyPendingMembershipGrant(
  userId: string,
  token: string,
): Promise<{ ok: true; planExpiresAt: string; plan: UserPlan } | { ok: false; error: string }> {
  const user = await findUserById(userId);
  if (!user) return { ok: false, error: "User not found" };
  if (!token || user.membership_grant_token !== token) {
    return { ok: false, error: "Invalid or expired activation link" };
  }
  const rawPlan = user.membership_grant_plan;
  if (rawPlan !== "pro" && rawPlan !== "basic" && rawPlan !== "wealth") {
    return { ok: false, error: "No pending membership grant" };
  }
  const days = user.membership_grant_days;
  if (days < MEMBERSHIP_GRANT_MIN_DAYS || days > MEMBERSHIP_GRANT_MAX_DAYS) {
    return { ok: false, error: "Invalid grant" };
  }
  const grantPlan = rawPlan as UserPlan;
  const planExpiresAt = computeMembershipGrantExpiry(user, grantPlan, days).toISOString();

  await updateUserSubscription(userId, { plan: grantPlan, planExpiresAt });
  await clearMembershipGrantFields(userId);

  return { ok: true, planExpiresAt, plan: grantPlan };
}

export async function markDeviceLinked(userId: string): Promise<void> {
  const client = await ensureInitialized();
  await client.execute({
    sql: "UPDATE users SET device_linked_at = datetime('now') WHERE id = ? AND device_linked_at = ''",
    args: [userId],
  });
}

export async function markDeviceProRedeemed(userId: string): Promise<void> {
  const client = await ensureInitialized();
  await client.execute({
    sql: "UPDATE users SET device_pro_redeemed_at = datetime('now') WHERE id = ? AND device_pro_redeemed_at = ''",
    args: [userId],
  });
}

export async function updateDeviceTemplate(userId: string, templateId: string): Promise<void> {
  const client = await ensureInitialized();
  await client.execute({
    sql: "UPDATE users SET device_template_id = ? WHERE id = ?",
    args: [templateId, userId],
  });
}

export async function getDeviceTemplate(userId: string): Promise<string> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "SELECT device_template_id FROM users WHERE id = ?",
    args: [userId],
  });
  if (result.rows.length === 0) return "classic-dark";
  return (result.rows[0].device_template_id as string) || "classic-dark";
}

/* ── Admin: aggregated user list ── */

export interface AdminUserWithStats {
  id: string;
  username: string;
  role: UserRole;
  plan: UserPlan;
  email: string;
  displayName: string;
  authProvider: AuthProvider;
  emailVerified: boolean;
  mustChangePassword: boolean;
  createdAt: string;
  lastActiveAt: string;
  planExpiresAt: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  taxResidency: string;
  onboardingCompleted: boolean;
  aiCallsThisMonth: number;
  experienceLevel: string;
  language: string;
  portfolioCount: number;
  holdingCount: number;
  totalHoldingsEur: number;
  cashCount: number;
  totalCashEur: number;
  transactionCount: number;
  brokerAccounts: string;
  brokerImports: string;
  deletedAt: string;
}

function mapUserRow(r: import("@libsql/client").Row): AdminUserWithStats {
  return {
    id: str(r.id),
    username: str(r.username),
    role: str(r.role) as UserRole,
    plan: str(r.plan) as UserPlan,
    email: str(r.email),
    displayName: str(r.display_name),
    authProvider: str(r.auth_provider) as AuthProvider,
    emailVerified: num(r.email_verified) === 1,
    mustChangePassword: num(r.must_change_password) === 1,
    createdAt: str(r.created_at),
    lastActiveAt: str(r.last_active_at),
    planExpiresAt: str(r.plan_expires_at),
    stripeCustomerId: str(r.stripe_customer_id),
    stripeSubscriptionId: str(r.stripe_subscription_id),
    taxResidency: str(r.tax_residency),
    onboardingCompleted: num(r.onboarding_completed) === 1,
    aiCallsThisMonth: num(r.ai_calls_this_month),
    experienceLevel: str(r.experience_level),
    language: str(r.language),
    portfolioCount: num(r.portfolio_count),
    holdingCount: num(r.holding_count),
    totalHoldingsEur: Number(r.total_holdings_eur ?? 0),
    cashCount: num(r.cash_count),
    totalCashEur: Number(r.total_cash_eur ?? 0),
    transactionCount: num(r.transaction_count),
    brokerAccounts: str(r.broker_accounts),
    brokerImports: str(r.broker_imports),
    deletedAt: str(r.deleted_at),
  };
}

const USER_STATS_SELECT = `
  SELECT
    u.id, u.username, u.role, u.plan, u.email, u.display_name,
    u.auth_provider, u.email_verified, u.must_change_password,
    u.created_at, u.last_active_at, u.plan_expires_at,
    u.stripe_customer_id, u.stripe_subscription_id,
    u.tax_residency, u.onboarding_completed, u.ai_calls_this_month,
    u.experience_level, u.deleted_at,
    COALESCE((SELECT us.language FROM user_settings us WHERE us.user_id = u.id), 'en') AS language,
    (SELECT COUNT(*) FROM portfolios WHERE user_id = u.id) AS portfolio_count,
    (SELECT COUNT(*) FROM holdings WHERE user_id = u.id) AS holding_count,
    (SELECT COALESCE(SUM(value_in_eur), 0) FROM holdings WHERE user_id = u.id) AS total_holdings_eur,
    (SELECT COUNT(*) FROM cash_entries WHERE user_id = u.id) AS cash_count,
    (SELECT COALESCE(SUM(amount_eur), 0) FROM cash_entries WHERE user_id = u.id) AS total_cash_eur,
    (SELECT COUNT(*) FROM transactions WHERE user_id = u.id) AS transaction_count,
    (SELECT GROUP_CONCAT(DISTINCT broker) FROM accounts WHERE user_id = u.id) AS broker_accounts,
    (SELECT GROUP_CONCAT(DISTINCT broker_name) FROM transactions WHERE user_id = u.id AND broker_name != '') AS broker_imports
  FROM users u`;

export async function listUsersWithStats(): Promise<AdminUserWithStats[]> {
  const client = await ensureInitialized();
  const result = await client.execute(`${USER_STATS_SELECT} ORDER BY u.created_at DESC`);
  return result.rows.map(mapUserRow);
}

type AdminSortKey = "username" | "authProvider" | "plan" | "holdingCount" | "totalHoldingsEur" | "lastActiveAt" | "createdAt";

const SORT_COLUMN_MAP: Record<AdminSortKey, string> = {
  username: "u.username",
  authProvider: "u.auth_provider",
  plan: "u.plan",
  holdingCount: "holding_count",
  totalHoldingsEur: "total_holdings_eur",
  lastActiveAt: "u.last_active_at",
  createdAt: "u.created_at",
};

export async function listUsersWithStatsPaginated(opts: {
  page: number;
  pageSize: number;
  search?: string;
  sortKey?: AdminSortKey;
  sortDir?: "asc" | "desc";
  filterPlan?: string;
  filterAuth?: string;
  filterImport?: string;
  filterStatus?: string;
  filterTest?: "all" | "real" | "test";
}): Promise<{ users: AdminUserWithStats[]; total: number }> {
  const client = await ensureInitialized();
  const {
    page,
    pageSize,
    search,
    sortKey = "createdAt",
    sortDir = "desc",
    filterPlan,
    filterAuth,
    filterImport,
    filterStatus,
    filterTest = "all",
  } = opts;

  const whereClauses: string[] = [];
  const args: (string | number)[] = [];

  if (search) {
    whereClauses.push("(u.username LIKE ? OR u.email LIKE ? OR u.display_name LIKE ?)");
    const like = `%${search}%`;
    args.push(like, like, like);
  }
  if (filterPlan && filterPlan !== "all") {
    whereClauses.push("u.plan = ?");
    args.push(filterPlan);
  }
  if (filterAuth && filterAuth !== "all") {
    whereClauses.push("u.auth_provider = ?");
    args.push(filterAuth);
  }
  if (filterStatus === "deleted") {
    whereClauses.push("u.deleted_at != ''");
  } else if (filterStatus === "active") {
    whereClauses.push("u.deleted_at = ''");
  }
  if (filterTest === "real") {
    whereClauses.push(sqlExcludeTestAccountEmail("u.email"));
  } else if (filterTest === "test") {
    whereClauses.push(sqlIsTestAccountEmail("u.email"));
  }

  const whereStr = whereClauses.length > 0 ? ` WHERE ${whereClauses.join(" AND ")}` : "";

  const col = SORT_COLUMN_MAP[sortKey] || "u.created_at";
  const dir = sortDir === "asc" ? "ASC" : "DESC";
  const offset = page * pageSize;

  const DIRECT_COLUMNS = new Set(["u.username", "u.auth_provider", "u.plan", "u.last_active_at", "u.created_at"]);
  const isDirectSort = DIRECT_COLUMNS.has(col);
  const needsImportFilter = filterImport === "imported" || filterImport === "not-imported";

  if (isDirectSort && !needsImportFilter) {
    // Two-phase approach: paginate on users table first, then compute stats for page only
    const countResult = await client.execute({ sql: `SELECT COUNT(*) as cnt FROM users u${whereStr}`, args });
    const total = num(countResult.rows[0]?.cnt);

    const idResult = await client.execute({
      sql: `SELECT u.id FROM users u${whereStr} ORDER BY ${col} ${dir} LIMIT ? OFFSET ?`,
      args: [...args, pageSize, offset],
    });
    const pageIds = idResult.rows.map((r) => str(r.id));

    if (pageIds.length === 0) {
      return { users: [], total };
    }

    const placeholders = pageIds.map(() => "?").join(",");
    const statsSql = `${USER_STATS_SELECT} WHERE u.id IN (${placeholders}) ORDER BY ${col} ${dir}`;

    const result = await client.execute({ sql: statsSql, args: pageIds });

    return { users: result.rows.map(mapUserRow), total };
  }

  // Fallback: computed-column sort or import filter needs full scan
  const countResult = await client.execute({ sql: `SELECT COUNT(*) as cnt FROM users u${whereStr}`, args });

  let fullSql = `${USER_STATS_SELECT}${whereStr} ORDER BY ${col} ${dir} LIMIT ? OFFSET ?`;
  const fullArgs = [...args, pageSize, offset];

  if (needsImportFilter) {
    const havingSql = filterImport === "imported"
      ? " HAVING broker_accounts IS NOT NULL OR broker_imports IS NOT NULL"
      : " HAVING broker_accounts IS NULL AND broker_imports IS NULL";
    fullSql = `SELECT * FROM (${USER_STATS_SELECT}${whereStr})${havingSql} ORDER BY ${col} ${dir} LIMIT ? OFFSET ?`;
  }

  const result = await client.execute({ sql: fullSql, args: fullArgs });

  return {
    users: result.rows.map(mapUserRow),
    total: num(countResult.rows[0]?.cnt),
  };
}

export async function getUserDetailData(userId: string): Promise<{
  portfolios: { id: string; name: string; currency: string; isDefault: boolean; holdingCount: number; totalValueEur: number }[];
  importEvents: { event: string; metadata: string; createdAt: string }[];
}> {
  const client = await ensureInitialized();

  const [portResult, holdingCounts, importResult] = await Promise.all([
    client.execute({
      sql: "SELECT id, name, currency, is_default FROM portfolios WHERE user_id = ? ORDER BY sort_order ASC, created_at ASC",
      args: [userId],
    }),
    client.execute({
      sql: `SELECT portfolio_id, COUNT(*) as cnt, COALESCE(SUM(value_in_eur), 0) as total_eur
            FROM holdings WHERE user_id = ? GROUP BY portfolio_id`,
      args: [userId],
    }),
    client.execute({
      sql: `SELECT event, metadata, created_at FROM analytics_events
            WHERE user_id = ? AND event IN ('portfolio_import', 'onboarding_import_method')
            ORDER BY created_at DESC LIMIT 50`,
      args: [userId],
    }),
  ]);

  const holdingMap = new Map<string, { count: number; totalEur: number }>();
  for (const r of holdingCounts.rows) {
    holdingMap.set(str(r.portfolio_id), { count: num(r.cnt), totalEur: Number(r.total_eur ?? 0) });
  }

  const portfolios = portResult.rows.map((r) => {
    const stats = holdingMap.get(str(r.id)) ?? { count: 0, totalEur: 0 };
    return {
      id: str(r.id),
      name: str(r.name),
      currency: str(r.currency),
      isDefault: num(r.is_default) === 1,
      holdingCount: stats.count,
      totalValueEur: stats.totalEur,
    };
  });

  const importEvents = importResult.rows.map((r) => ({
    event: str(r.event),
    metadata: str(r.metadata),
    createdAt: str(r.created_at),
  }));

  return { portfolios, importEvents };
}

/* ── Last-activity tracking ── */

export async function updateLastActive(userId: string): Promise<void> {
  const client = await ensureInitialized();
  await client.execute({
    sql: "UPDATE users SET last_active_at = datetime('now') WHERE id = ? AND deleted_at = ''",
    args: [userId],
  });
  // Fire-and-forget: alert ProdOps if this user is on a support return-watch.
  void import("@/lib/user-return-watch")
    .then((m) => m.notifyIfWatchedUserReturned(userId))
    .catch(() => {});
}

export async function getLastActive(userId: string): Promise<string> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "SELECT last_active_at FROM users WHERE id = ?",
    args: [userId],
  });
  if (result.rows.length === 0) return "";
  return str(result.rows[0].last_active_at);
}

/** Live count of verified accounts, for real (non-fabricated) landing-page social proof. */
export async function countVerifiedUsers(): Promise<number> {
  const client = await ensureInitialized();
  const result = await client.execute("SELECT COUNT(*) as c FROM users WHERE email_verified = 1");
  return Number(result.rows[0]?.c) || 0;
}
