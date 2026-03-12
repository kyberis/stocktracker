import { NextRequest, NextResponse } from "next/server";
import { createUser, findUserByEmail, trackEvent, ensureDefaultPortfolio } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import {
  createSessionToken,
  getSessionCookieConfig,
} from "@/lib/auth/session";
import { ensureSessionSecret } from "@/lib/auth/session-secret";
import { withMetrics } from "@/lib/with-metrics";
import { authEventsTotal } from "@/lib/metrics";
import { parseBody } from "@/lib/api-response";
import { signupSchema } from "@/lib/schemas";
import { createVerificationToken, sendVerificationEmail, sendWelcomeEmail } from "@/lib/email";
import { checkSignupRateLimit, getClientIp } from "@/lib/rate-limit";
import { verifyTurnstileToken } from "@/lib/turnstile";

function deriveUsername(email: string): string {
  const prefix = email.split("@")[0].replace(/[^a-zA-Z0-9._-]/g, "");
  return prefix.slice(0, 30) || "user";
}

export const POST = withMetrics("/api/auth/signup", async (req: NextRequest) => {
  ensureSessionSecret();

  const ip = getClientIp(req);
  const isDev = process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test";
  if (!isDev) {
    const rl = await checkSignupRateLimit(ip);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many signup attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": "3600" } },
      );
    }
  }

  const result = await parseBody(req, signupSchema);
  if (!result.success) return result.error;
  const { email, password, displayName, seedWithData } = result.data;
  const normalizedEmail = email.trim().toLowerCase();

  const cfToken = (result.data as Record<string, unknown>).turnstileToken as string | undefined;
  const captchaOk = await verifyTurnstileToken(cfToken, ip);
  if (!captchaOk) {
    return NextResponse.json({ error: "CAPTCHA verification failed. Please try again." }, { status: 403 });
  }

  if (normalizedEmail.length < 5) {
    return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
  }

  try {
    const existing = await findUserByEmail(normalizedEmail);
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const username = deriveUsername(normalizedEmail);
    const user = await createUser({
      username,
      passwordHash,
      email: normalizedEmail,
      displayName: displayName || "",
      authProvider: "credentials",
      seedWithData: Boolean(seedWithData),
    });

    await ensureDefaultPortfolio(user.id);

    const token = await createSessionToken({
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
      plan: user.plan,
      emailVerified: false,
      onboardingCompleted: false,
    });

    trackEvent(user.id, "signup");
    authEventsTotal.inc({ event: "signup" });

    const verificationToken = await createVerificationToken(user.id, normalizedEmail);
    sendVerificationEmail(normalizedEmail, verificationToken).then((result) => {
      if (result.success) trackEvent(user.id, "email_verification_sent");
    });
    sendWelcomeEmail(normalizedEmail, displayName || "").catch((err) =>
      console.error("Welcome email failed:", err),
    );

    const response = NextResponse.json({ user }, { status: 201 });
    response.cookies.set(getSessionCookieConfig(token));
    return response;
  } catch (error) {
    console.error("Signup failed:", error);
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }
});
