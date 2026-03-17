import { randomUUID, randomBytes } from "crypto";
import { ensureInitialized } from "./client";
import { str, num, type DbUser, rowToDbUser, mapUser } from "./helpers";
import { PLATFORM_LIMITS } from "@/lib/platform-config";
import { isBlockedEmailDomain } from "@/lib/schemas";
import { trackEvent } from "./analytics";

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
const CODE_LENGTH = 8;

export type ReferralStatus = "pending" | "accepted" | "rewarded" | "rejected";

export interface Referral {
  id: string;
  referrerId: string;
  refereeId: string;
  status: ReferralStatus;
  createdAt: string;
  acceptedAt: string;
  rewardedAt: string;
  rejectReason: string;
}

export interface ReferralStats {
  total: number;
  pending: number;
  accepted: number;
  rewarded: number;
  rejected: number;
  rewardDaysEarned: number;
  rewardDaysCap: number;
}

export interface ReferralFunnelStats {
  linkViews: number;
  linkCopiesOrShares: number;
  signups: number;
  accepted: number;
  rewarded: number;
  rejected: number;
  topReferrers: { userId: string; displayName: string; email: string; count: number; rewardDays: number }[];
  rejectionReasons: { reason: string; count: number }[];
}

export function generateReferralCode(): string {
  const bytes = randomBytes(CODE_LENGTH);
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) code += CODE_CHARS[bytes[i] % CODE_CHARS.length];
  return code;
}

export async function ensureReferralCode(userId: string): Promise<string> {
  const client = await ensureInitialized();
  const row = await client.execute({ sql: "SELECT referral_code FROM users WHERE id = ?", args: [userId] });
  const existing = str(row.rows[0]?.referral_code);
  if (existing) return existing;

  const code = generateReferralCode();
  await client.execute({ sql: "UPDATE users SET referral_code = ? WHERE id = ? AND referral_code IS NULL", args: [code, userId] });
  const updated = await client.execute({ sql: "SELECT referral_code FROM users WHERE id = ?", args: [userId] });
  return str(updated.rows[0]?.referral_code) || code;
}

export async function findUserByReferralCode(code: string): Promise<DbUser | null> {
  if (!code || code.length !== CODE_LENGTH) return null;
  const client = await ensureInitialized();
  const result = await client.execute({ sql: "SELECT * FROM users WHERE referral_code = ?", args: [code] });
  if (result.rows.length === 0) return null;
  return rowToDbUser(result.rows[0]);
}

export async function createReferral(referrerId: string, refereeId: string): Promise<string> {
  const client = await ensureInitialized();
  const id = randomUUID();
  await client.execute({
    sql: "INSERT INTO referrals (id, referrer_id, referee_id) VALUES (?, ?, ?)",
    args: [id, referrerId, refereeId],
  });
  return id;
}

export interface AntiAbuseResult {
  pass: boolean;
  reason?: string;
}

export async function checkAntiAbuse(
  referrer: DbUser,
  referee: DbUser,
): Promise<AntiAbuseResult> {
  if (referrer.id === referee.id) {
    return { pass: false, reason: "self_referral" };
  }

  const referrerDomain = referrer.email.split("@")[1]?.toLowerCase() || "";
  const refereeDomain = referee.email.split("@")[1]?.toLowerCase() || "";
  const genericDomains = new Set(["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com", "protonmail.com", "proton.me", "live.com", "aol.com", "mail.com"]);
  if (referrerDomain && refereeDomain && referrerDomain === refereeDomain && !genericDomains.has(referrerDomain)) {
    return { pass: false, reason: "same_private_domain" };
  }

  if (isBlockedEmailDomain(referee.email)) {
    return { pass: false, reason: "disposable_email" };
  }

  if (referrer.referral_reward_days >= PLATFORM_LIMITS.REFERRAL_MAX_REWARD_DAYS) {
    return { pass: false, reason: "reward_cap_reached" };
  }

  const client = await ensureInitialized();
  const velocity = await client.execute({
    sql: `SELECT COUNT(*) as cnt FROM referrals
          WHERE referrer_id = ? AND status IN ('accepted', 'rewarded')
          AND created_at >= datetime('now', '-30 days')`,
    args: [referrer.id],
  });
  if (num(velocity.rows[0]?.cnt) >= PLATFORM_LIMITS.REFERRAL_VELOCITY_PER_30D) {
    return { pass: false, reason: "velocity_limit" };
  }

  return { pass: true };
}

export async function acceptReferral(refereeId: string): Promise<void> {
  const client = await ensureInitialized();

  const ref = await client.execute({
    sql: "SELECT * FROM referrals WHERE referee_id = ? AND status = 'pending'",
    args: [refereeId],
  });
  if (ref.rows.length === 0) return;

  const referral = ref.rows[0];
  const referrerId = str(referral.referrer_id);

  const referrerRow = await client.execute({ sql: "SELECT * FROM users WHERE id = ?", args: [referrerId] });
  if (referrerRow.rows.length === 0) return;
  const referrer = rowToDbUser(referrerRow.rows[0]);

  const refereeRow = await client.execute({ sql: "SELECT * FROM users WHERE id = ?", args: [refereeId] });
  if (refereeRow.rows.length === 0) return;
  const referee = rowToDbUser(refereeRow.rows[0]);

  const abuse = await checkAntiAbuse(referrer, referee);
  if (!abuse.pass) {
    await client.execute({
      sql: "UPDATE referrals SET status = 'rejected', reject_reason = ? WHERE id = ?",
      args: [abuse.reason || "unknown", str(referral.id)],
    });
    await trackEvent(referrerId, "referral_rejected", { reason: abuse.reason || "unknown", refereeId });
    return;
  }

  await client.execute({
    sql: "UPDATE referrals SET status = 'accepted', accepted_at = datetime('now') WHERE id = ?",
    args: [str(referral.id)],
  });
  await trackEvent(refereeId, "referral_accepted", { referrerId });

  await grantReferralReward(referrerId, str(referral.id));
}

export async function grantReferralReward(referrerId: string, referralId: string): Promise<void> {
  const client = await ensureInitialized();
  const rewardDays = PLATFORM_LIMITS.REFERRAL_REWARD_DAYS;

  const userRow = await client.execute({ sql: "SELECT * FROM users WHERE id = ?", args: [referrerId] });
  if (userRow.rows.length === 0) return;
  const user = rowToDbUser(userRow.rows[0]);

  const hasActiveStripeSub = !!user.stripe_subscription_id;
  const currentExpiry = user.plan_expires_at ? new Date(user.plan_expires_at) : null;
  const now = new Date();

  let newExpiry: Date;
  if (hasActiveStripeSub && user.plan === "pro") {
    // Store credit days — they'll be consumed when the Stripe sub ends
    await client.execute({
      sql: "UPDATE users SET referral_reward_days = referral_reward_days + ? WHERE id = ?",
      args: [rewardDays, referrerId],
    });
  } else if (user.plan === "pro" && currentExpiry && currentExpiry > now) {
    // Already on referral/gifted Pro — extend
    newExpiry = new Date(currentExpiry.getTime() + rewardDays * 86400000);
    await client.execute({
      sql: "UPDATE users SET plan_expires_at = ?, referral_reward_days = referral_reward_days + ? WHERE id = ?",
      args: [newExpiry.toISOString(), rewardDays, referrerId],
    });
  } else {
    // Free or Starter — grant Pro now
    newExpiry = new Date(now.getTime() + rewardDays * 86400000);
    await client.execute({
      sql: "UPDATE users SET plan = 'pro', plan_expires_at = ?, referral_reward_days = referral_reward_days + ? WHERE id = ?",
      args: [newExpiry.toISOString(), rewardDays, referrerId],
    });
  }

  await client.execute({
    sql: "UPDATE referrals SET status = 'rewarded', rewarded_at = datetime('now') WHERE id = ?",
    args: [referralId],
  });
  await trackEvent(referrerId, "referral_reward_granted", { days: String(rewardDays) });
}

export async function getReferralStats(userId: string): Promise<ReferralStats> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT status, COUNT(*) as cnt FROM referrals WHERE referrer_id = ? GROUP BY status`,
    args: [userId],
  });
  const userRow = await client.execute({ sql: "SELECT referral_reward_days FROM users WHERE id = ?", args: [userId] });

  const counts: Record<string, number> = {};
  let total = 0;
  for (const r of result.rows) {
    const status = str(r.status);
    const cnt = num(r.cnt);
    counts[status] = cnt;
    total += cnt;
  }

  return {
    total,
    pending: counts["pending"] ?? 0,
    accepted: counts["accepted"] ?? 0,
    rewarded: counts["rewarded"] ?? 0,
    rejected: counts["rejected"] ?? 0,
    rewardDaysEarned: num(userRow.rows[0]?.referral_reward_days),
    rewardDaysCap: PLATFORM_LIMITS.REFERRAL_MAX_REWARD_DAYS,
  };
}

export async function getReferralFunnelStats(days: number): Promise<ReferralFunnelStats> {
  const client = await ensureInitialized();
  const daysArg = `-${days} days`;

  const [linkViews, linkActions, referralsByStatus, topReferrers, rejections] = await Promise.all([
    client.execute({
      sql: `SELECT COUNT(*) as cnt FROM analytics_events
            WHERE event = 'referral_link_viewed' AND created_at >= datetime('now', ?)`,
      args: [daysArg],
    }),
    client.execute({
      sql: `SELECT COUNT(*) as cnt FROM analytics_events
            WHERE event IN ('referral_link_copied', 'referral_link_shared')
            AND created_at >= datetime('now', ?)`,
      args: [daysArg],
    }),
    client.execute({
      sql: `SELECT status, COUNT(*) as cnt FROM referrals
            WHERE created_at >= datetime('now', ?) GROUP BY status`,
      args: [daysArg],
    }),
    client.execute({
      sql: `SELECT r.referrer_id, u.display_name, u.email, COUNT(*) as cnt, u.referral_reward_days
            FROM referrals r
            JOIN users u ON u.id = r.referrer_id
            WHERE r.status IN ('accepted', 'rewarded') AND r.created_at >= datetime('now', ?)
            GROUP BY r.referrer_id ORDER BY cnt DESC LIMIT 10`,
      args: [daysArg],
    }),
    client.execute({
      sql: `SELECT reject_reason, COUNT(*) as cnt FROM referrals
            WHERE status = 'rejected' AND created_at >= datetime('now', ?)
            GROUP BY reject_reason ORDER BY cnt DESC`,
      args: [daysArg],
    }),
  ]);

  const statusMap: Record<string, number> = {};
  let totalSignups = 0;
  for (const r of referralsByStatus.rows) {
    const cnt = num(r.cnt);
    statusMap[str(r.status)] = cnt;
    totalSignups += cnt;
  }

  return {
    linkViews: num(linkViews.rows[0]?.cnt),
    linkCopiesOrShares: num(linkActions.rows[0]?.cnt),
    signups: totalSignups,
    accepted: statusMap["accepted"] ?? 0,
    rewarded: statusMap["rewarded"] ?? 0,
    rejected: statusMap["rejected"] ?? 0,
    topReferrers: topReferrers.rows.map((r) => ({
      userId: str(r.referrer_id),
      displayName: str(r.display_name),
      email: str(r.email),
      count: num(r.cnt),
      rewardDays: num(r.referral_reward_days),
    })),
    rejectionReasons: rejections.rows.map((r) => ({
      reason: str(r.reject_reason) || "unknown",
      count: num(r.cnt),
    })),
  };
}
