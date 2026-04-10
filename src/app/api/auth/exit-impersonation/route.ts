import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { createSessionToken, getSessionCookieConfig } from "@/lib/auth/session";
import { ensureSessionSecret } from "@/lib/auth/session-secret";
import { findUserById, trackEvent } from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";

export const POST = withMetrics("/api/auth/exit-impersonation", async (req: NextRequest) => {
  ensureSessionSecret();
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  const adminId = session.impersonatorUserId;
  if (!adminId) {
    return NextResponse.json({ error: "Not impersonating." }, { status: 400 });
  }

  const admin = await findUserById(adminId);
  if (!admin || admin.role !== "admin") {
    return NextResponse.json({ error: "Invalid session." }, { status: 403 });
  }

  const wasUserId = session.userId;

  const token = await createSessionToken({
    userId: admin.id,
    username: admin.username,
    email: admin.email,
    role: admin.role,
    mustChangePassword: admin.must_change_password === 1,
    plan: admin.plan,
    emailVerified: admin.email_verified === 1,
    onboardingCompleted: admin.onboarding_completed === 1,
  });

  await trackEvent(admin.id, "admin_impersonate_end", {
    wasUserId,
  });

  const response = NextResponse.json({ ok: true });
  response.cookies.set(getSessionCookieConfig(token));
  return response;
});
