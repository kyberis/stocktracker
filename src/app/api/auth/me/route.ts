import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import {
  findUserById,
  countPasskeysByUserId,
  isFeatureEnabledForUser,
  updateUserSubscription,
  getUserSettings,
  updateUserSettings,
  getSnapTradeConnection,
  scheduleSnapTradeDeletion,
  createNotification,
} from "@/lib/db";
import { effectivePlan, canAccessTheme, getAiTokenLimit } from "@/lib/subscription";
import { getAllFeatureQuotas } from "@/lib/feature-quotas";
import { planExpiredNotification } from "@/lib/notification-templates";
import { withMetrics } from "@/lib/with-metrics";
import { syncEntitlementsForUser } from "@/lib/idp/entitlements";
import { isIdpEnabled } from "@/lib/idp/config";
import { createSessionToken, getSessionCookieConfig } from "@/lib/auth/session";
import { ensureTrefolioAdminRoleForUser } from "@/lib/auth/admin-allowlist";

/**
 * Fire-and-forget: when a plan's grace period has expired, persist the
 * downgrade and reconcile downstream resources.
 */
function lazyDowngrade(userId: string): void {
  const run = async () => {
    await updateUserSubscription(userId, { plan: "free", planExpiresAt: "" });
    const settings = await getUserSettings(userId);
    if (!canAccessTheme(settings.dashboardTheme, "free")) {
      await updateUserSettings(userId, { dashboardTheme: "default" });
    }
    const conn = await getSnapTradeConnection(userId);
    if (conn) await scheduleSnapTradeDeletion(userId);
    await createNotification(userId, planExpiredNotification());
  };
  run().catch((err) =>
    console.error("[auth/me] Lazy downgrade failed:", err instanceof Error ? err.message : err),
  );
}

/**
 * Fire-and-forget: pull the latest entitlements from the IdP and write them to
 * the local users.plan / plan_expires_at columns. This is what makes a Pro
 * upgrade purchased on Clara or Will visible in trefolio without waiting for
 * the user's next OIDC sign-in. No-op when the IdP is not configured.
 */
function lazyIdpEntitlementSync(userId: string): void {
  if (!isIdpEnabled()) return;
  syncEntitlementsForUser(userId).catch((err) =>
    console.error("[auth/me] IdP entitlement sync failed:", err instanceof Error ? err.message : err),
  );
}

export const GET = withMetrics("/api/auth/me", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  const impersonatorId = session.impersonatorUserId;
  let user = await findUserById(session.userId);
  if (user) {
    await ensureTrefolioAdminRoleForUser(user.id, user.email);
    user = await findUserById(session.userId);
  }

  const [passkeyCount, deviceOn, impersonator] = await Promise.all([
    countPasskeysByUserId(session.userId),
    isFeatureEnabledForUser("device_enabled", session.userId),
    impersonatorId ? findUserById(impersonatorId) : Promise.resolve(null),
  ]);

  const storedPlan = user?.plan || session.plan || "free";
  const planExpiry = user?.plan_expires_at || "";
  const resolvedPlan = effectivePlan(storedPlan, planExpiry);

  if (resolvedPlan !== storedPlan && user) {
    lazyDowngrade(user.id);
  }

  // Pull fresh entitlements from the IdP (no-op if not configured / user not linked).
  if (user) {
    lazyIdpEntitlementSync(user.id);
  }

  // Expose all per-feature quota usage so the UI can render "X / Y" badges
  // without making one round-trip per feature.
  const rawQuotas = await getAllFeatureQuotas(session.userId, resolvedPlan);
  const quotas = Object.fromEntries(
    Object.entries(rawQuotas).map(([k, v]) => [
      k,
      { used: v.used, limit: v.limit, remaining: v.remaining, resetAt: v.resetAt, window: v.window },
    ]),
  );

  const effectiveRole = user ? (user.role === "admin" ? "admin" : "user") : session.role;

  const response = NextResponse.json({
    user: {
      id: session.userId,
      username: session.username,
      role: effectiveRole,
      mustChangePassword: session.mustChangePassword,
      email: user?.email || "",
      displayName: user?.display_name || "",
      avatarUrl: user?.avatar_url || "",
      plan: resolvedPlan,
      planExpiresAt: planExpiry,
      aiCallsThisMonth: user?.ai_calls_this_month || 0,
      aiCallsResetAt: user?.ai_calls_reset_at || "",
      aiCallsToday: user?.ai_calls_today || 0,
      aiDailyResetAt: user?.ai_daily_reset_at || "",
      aiTokensThisMonth: user?.ai_tokens_this_month || 0,
      aiTokensToday: user?.ai_tokens_today || 0,
      aiTokenLimit: getAiTokenLimit(resolvedPlan),
      emailVerified: user?.email_verified === 1,
      authProvider: user?.auth_provider || "credentials",
      googleLinked: !!user?.google_id,
      passkeyCount,
      portfolioReviewCount: user?.portfolio_review_count || 0,
      portfolioReviewResetAt: user?.portfolio_review_reset_at || "",
      quotas,
      deviceProEligible: deviceOn && !!user?.device_linked_at && !user?.device_pro_redeemed_at && resolvedPlan === "free",
      devicePortfolioId: user?.device_portfolio_id || "",
      lastActiveAt: user?.last_active_at || "",
      taxResidency: user?.tax_residency || "",
      onboardingCompleted: user?.onboarding_completed === 1,
      trialActivatedAt: user?.trial_activated_at || "",
      impersonation:
        impersonatorId && impersonator
          ? { impersonatorId, impersonatorUsername: impersonator.username }
          : null,
    },
  });

  if (user && user.role === "admin" && session.role !== "admin") {
    const token = await createSessionToken({
      userId: session.userId,
      username: user.username,
      email: user.email || "",
      role: "admin",
      mustChangePassword: user.must_change_password === 1,
      plan: user.plan === "pro" ? "pro" : "free",
      emailVerified: user.email_verified === 1,
      onboardingCompleted: user.onboarding_completed === 1,
      impersonatorUserId: session.impersonatorUserId,
    });
    response.cookies.set(getSessionCookieConfig(token));
  }

  return response;
});
