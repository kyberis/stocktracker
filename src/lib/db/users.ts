import { randomUUID, randomBytes, createHash } from "crypto";
import { ensureInitialized } from "./client";
import {
  type DbUser,
  type PublicUser,
  type UserRole,
  type UserPlan,
  str,
  rowToDbUser,
  mapUser,
  shouldResetAiWindow,
  shouldResetDailyAiWindow,
  num,
} from "./helpers";
import { seedHoldingsForUser, seedTransactionsForUser } from "./seed";
import { resolvePortfolioId } from "./portfolios";

export async function findUserByUsername(username: string): Promise<DbUser | null> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "SELECT * FROM users WHERE username = ?",
    args: [username],
  });
  if (result.rows.length === 0) return null;
  return rowToDbUser(result.rows[0]);
}

export async function findUserByEmail(email: string): Promise<DbUser | null> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "SELECT * FROM users WHERE LOWER(email) = LOWER(?)",
    args: [email],
  });
  if (result.rows.length === 0) return null;
  return rowToDbUser(result.rows[0]);
}

export async function findUserByGoogleId(googleId: string): Promise<DbUser | null> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "SELECT * FROM users WHERE google_id = ?",
    args: [googleId],
  });
  if (result.rows.length === 0) return null;
  return rowToDbUser(result.rows[0]);
}

export async function findUserByAppleId(appleId: string): Promise<DbUser | null> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "SELECT * FROM users WHERE apple_id = ?",
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

export async function listUsers(): Promise<PublicUser[]> {
  const client = await ensureInitialized();
  const result = await client.execute("SELECT * FROM users ORDER BY created_at ASC");
  return result.rows.map(rowToDbUser).map(mapUser);
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
}): Promise<PublicUser> {
  const client = await ensureInitialized();
  const id = randomUUID();

  await client.batch(
    [
      {
        sql: `INSERT INTO users (id, username, password_hash, role, must_change_password,
              ai_calls_reset_at, email, display_name, avatar_url, auth_provider, google_id, apple_id, email_verified)
              VALUES (?, ?, ?, 'user', 0, datetime('now'), ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          id, params.username, params.passwordHash,
          params.email || "", params.displayName || "", params.avatarUrl || "",
          params.authProvider || "credentials", params.googleId || "", params.appleId || "",
          params.emailVerified ? 1 : 0,
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
  data: { displayName?: string; taxResidency?: string }
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
    sql: "SELECT * FROM users WHERE stripe_customer_id = ?",
    args: [customerId],
  });
  if (result.rows.length === 0) return null;
  return rowToDbUser(result.rows[0]);
}

export async function findUserByStripeSubscriptionId(subscriptionId: string): Promise<DbUser | null> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "SELECT * FROM users WHERE stripe_subscription_id = ?",
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

export async function countProSubscribers(): Promise<number> {
  const client = await ensureInitialized();
  const result = await client.execute("SELECT COUNT(*) as cnt FROM users WHERE plan IN ('starter', 'pro')");
  return num(result.rows[0]?.cnt);
}

export async function deleteUser(userId: string) {
  const client = await ensureInitialized();
  await client.execute({ sql: "DELETE FROM users WHERE id = ?", args: [userId] });
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

export async function generateWidgetToken(userId: string): Promise<string> {
  const client = await ensureInitialized();
  const token = `tfw_${randomBytes(24).toString("hex")}`;
  const hash = hashToken(token);
  await client.execute({
    sql: "UPDATE users SET widget_token_hash = ? WHERE id = ?",
    args: [hash, userId],
  });
  return token;
}

export async function revokeWidgetToken(userId: string): Promise<void> {
  const client = await ensureInitialized();
  await client.execute({
    sql: "UPDATE users SET widget_token_hash = '' WHERE id = ?",
    args: [userId],
  });
}

export async function findUserByWidgetToken(token: string): Promise<DbUser | null> {
  if (!token || !token.startsWith("tfw_")) return null;
  const client = await ensureInitialized();
  const hash = hashToken(token);
  const result = await client.execute({
    sql: "SELECT * FROM users WHERE widget_token_hash = ?",
    args: [hash],
  });
  if (result.rows.length === 0) return null;
  return rowToDbUser(result.rows[0]);
}

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
  if (!passkey) return null;
  const isLegacy = /^\d{4}-\d{4}$/.test(passkey);
  const isNew = /^\d{4}-\d{4}-\d{4}$/.test(passkey);
  if (!isLegacy && !isNew) return null;
  const client = await ensureInitialized();
  const hash = hashToken(passkey);
  const result = await client.execute({
    sql: "SELECT * FROM users WHERE device_passkey_hash = ?",
    args: [hash],
  });
  if (result.rows.length === 0) return null;
  return rowToDbUser(result.rows[0]);
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

/* ── Last-activity tracking ── */

export async function updateLastActive(userId: string): Promise<void> {
  const client = await ensureInitialized();
  await client.execute({
    sql: "UPDATE users SET last_active_at = datetime('now') WHERE id = ?",
    args: [userId],
  });
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
