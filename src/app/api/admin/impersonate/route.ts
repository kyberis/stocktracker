import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { createSessionToken, getSessionCookieConfig } from "@/lib/auth/session";
import { ensureSessionSecret } from "@/lib/auth/session-secret";
import { findUserById, trackEvent } from "@/lib/db";
import { parseBody } from "@/lib/api-response";
import { adminImpersonateSchema } from "@/lib/schemas";
import { withMetrics } from "@/lib/with-metrics";

export const POST = withMetrics("/api/admin/impersonate", async (req: NextRequest) => {
  ensureSessionSecret();
  const { session, error } = await requireAdmin(req);
  if (error || !session) return error;

  const result = await parseBody(req, adminImpersonateSchema);
  if (!result.success) return result.error;

  const target = await findUserById(result.data.userId);
  if (!target) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  if (target.id === session.userId) {
    return NextResponse.json({ error: "Cannot impersonate yourself." }, { status: 400 });
  }

  if (target.role === "admin" || target.username === "admin") {
    return NextResponse.json({ error: "Cannot impersonate administrator accounts." }, { status: 403 });
  }

  const token = await createSessionToken({
    userId: target.id,
    username: target.username,
    email: target.email,
    role: target.role,
    mustChangePassword: target.must_change_password === 1,
    plan: target.plan,
    emailVerified: target.email_verified === 1,
    onboardingCompleted: target.onboarding_completed === 1,
    impersonatorUserId: session.userId,
  });

  await trackEvent(session.userId, "admin_impersonate_start", {
    targetUserId: target.id,
    targetUsername: target.username,
  });

  const response = NextResponse.json({ ok: true });
  response.cookies.set(getSessionCookieConfig(token));
  return response;
});
