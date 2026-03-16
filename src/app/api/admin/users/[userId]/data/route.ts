import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import {
  getUserDetailData,
  listHoldings,
  listTransactions,
  listCashEntries,
  listPortfolios,
  findUserById,
  listAccounts,
} from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";

export const GET = withMetrics("/api/admin/users/[userId]/data", async (
  req: NextRequest,
  ctx?: unknown,
) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const { userId } = (ctx as { params: { userId: string } }).params;

  const dbUser = await findUserById(userId);
  if (!dbUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const portfolioId = req.nextUrl.searchParams.get("portfolioId") || undefined;

  const [detail, portfolios, holdings, transactions, cash, accounts] = await Promise.all([
    getUserDetailData(userId),
    listPortfolios(userId),
    listHoldings(userId, portfolioId),
    listTransactions(userId, undefined, portfolioId),
    listCashEntries(userId, portfolioId),
    listAccounts(userId),
  ]);

  const user = {
    id: dbUser.id,
    username: dbUser.username,
    role: dbUser.role,
    plan: dbUser.plan,
    email: dbUser.email,
    displayName: dbUser.display_name,
    authProvider: dbUser.auth_provider,
    emailVerified: dbUser.email_verified === 1,
    mustChangePassword: dbUser.must_change_password === 1,
    createdAt: dbUser.created_at,
    lastActiveAt: dbUser.last_active_at,
    planExpiresAt: dbUser.plan_expires_at,
    stripeCustomerId: dbUser.stripe_customer_id,
    stripeSubscriptionId: dbUser.stripe_subscription_id,
    taxResidency: dbUser.tax_residency,
    onboardingCompleted: dbUser.onboarding_completed === 1,
    aiCallsThisMonth: dbUser.ai_calls_this_month,
  };

  return NextResponse.json({
    user,
    portfolios: detail.portfolios,
    importEvents: detail.importEvents,
    holdings,
    transactions,
    cash,
    accounts,
    allPortfolios: portfolios,
  });
});
