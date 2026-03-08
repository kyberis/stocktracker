import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { findUserById, countPasskeysByUserId } from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";

export const GET = withMetrics("/api/auth/me", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  const [user, passkeyCount] = await Promise.all([
    findUserById(session.userId),
    countPasskeysByUserId(session.userId),
  ]);

  return NextResponse.json({
    user: {
      id: session.userId,
      username: session.username,
      role: session.role,
      mustChangePassword: session.mustChangePassword,
      email: user?.email || "",
      displayName: user?.display_name || "",
      avatarUrl: user?.avatar_url || "",
      plan: user?.plan || session.plan || "free",
      planExpiresAt: user?.plan_expires_at || "",
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
      deviceProEligible: !!user?.device_linked_at && !user?.device_pro_redeemed_at && (user?.plan || session.plan || "free") === "free",
    },
  });
});
