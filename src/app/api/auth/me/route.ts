import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import {
  findUserById,
  countPasskeysByUserId,
  isFeatureEnabled,
  updateUserSubscription,
  getUserSettings,
  updateUserSettings,
  getSnapTradeConnection,
  scheduleSnapTradeDeletion,
  createNotification,
} from "@/lib/db";
import { effectivePlan, canAccessTheme } from "@/lib/subscription";
import { planExpiredNotification } from "@/lib/notification-templates";
import { withMetrics } from "@/lib/with-metrics";

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

export const GET = withMetrics("/api/auth/me", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  const [user, passkeyCount, deviceOn] = await Promise.all([
    findUserById(session.userId),
    countPasskeysByUserId(session.userId),
    isFeatureEnabled("device_enabled"),
  ]);

  const storedPlan = user?.plan || session.plan || "free";
  const planExpiry = user?.plan_expires_at || "";
  const resolvedPlan = effectivePlan(storedPlan, planExpiry);

  if (resolvedPlan !== storedPlan && user) {
    lazyDowngrade(user.id);
  }

  return NextResponse.json({
    user: {
      id: session.userId,
      username: session.username,
      role: session.role,
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
      emailVerified: user?.email_verified === 1,
      authProvider: user?.auth_provider || "credentials",
      googleLinked: !!user?.google_id,
      passkeyCount,
      portfolioReviewCount: user?.portfolio_review_count || 0,
      portfolioReviewResetAt: user?.portfolio_review_reset_at || "",
      deviceProEligible: deviceOn && !!user?.device_linked_at && !user?.device_pro_redeemed_at && resolvedPlan === "free",
      devicePortfolioId: user?.device_portfolio_id || "",
      lastActiveAt: user?.last_active_at || "",
      taxResidency: user?.tax_residency || "",
      onboardingCompleted: user?.onboarding_completed === 1,
    },
  });
});
