import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { findUserById, setEmailVerified, trackEvent } from "@/lib/db";
import {
  createVerificationToken,
  sendVerificationEmail,
  verifyVerificationToken,
  isTestVerificationToken,
  isTreefolioTestEmail,
} from "@/lib/email";
import {
  createSessionToken,
  getSessionCookieConfig,
  verifySessionToken,
} from "@/lib/auth/session";
import { withMetrics } from "@/lib/with-metrics";

export const POST = withMetrics("/api/auth/verify-email", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  const user = await findUserById(session.userId);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (!user.email) {
    return NextResponse.json({ error: "No email set. Update your profile first." }, { status: 400 });
  }

  if (user.email_verified === 1) {
    return NextResponse.json({ error: "Email already verified" }, { status: 400 });
  }

  const token = await createVerificationToken(session.userId, user.email);
  const result = await sendVerificationEmail(user.email, token);

  if (!result.success) {
    return NextResponse.json({ error: "Failed to send verification email" }, { status: 500 });
  }

  trackEvent(session.userId, "email_verification_resent");
  return NextResponse.json({ ok: true, message: "Verification email sent" });
});

export const GET = withMetrics("/api/auth/verify-email", async (req: NextRequest) => {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  let userId: string;
  let email: string;

  if (isTestVerificationToken(token)) {
    const existingToken = req.cookies.get("trefolio_session")?.value;
    const existingSession = existingToken ? await verifySessionToken(existingToken) : null;
    if (!existingSession) {
      return NextResponse.json({ error: "Session required for test verification" }, { status: 401 });
    }
    const sessionUser = await findUserById(existingSession.userId);
    if (!sessionUser || !isTreefolioTestEmail(sessionUser.email)) {
      return NextResponse.json({ error: "Test token only valid for test accounts" }, { status: 403 });
    }
    userId = sessionUser.id;
    email = sessionUser.email;
  } else {
    const payload = await verifyVerificationToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
    }
    const user = await findUserById(payload.userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (user.email !== payload.email) {
      return NextResponse.json({ error: "Email mismatch" }, { status: 400 });
    }
    userId = payload.userId;
    email = payload.email;
  }

  await setEmailVerified(userId, true);
  trackEvent(userId, "email_verification_completed");

  const existingToken = req.cookies.get("trefolio_session")?.value;
  const existingSession = existingToken ? await verifySessionToken(existingToken) : null;

  if (existingSession && existingSession.userId === userId) {
    const newSessionToken = await createSessionToken({
      ...existingSession,
      emailVerified: true,
    });
    const dest = existingSession.onboardingCompleted ? "/" : "/onboarding";
    const response = NextResponse.redirect(`${baseUrl}${dest}`);
    response.cookies.set(getSessionCookieConfig(newSessionToken));
    return response;
  }

  return NextResponse.redirect(`${baseUrl}/login?emailVerified=true`);
});
