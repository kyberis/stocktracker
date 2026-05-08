import { NextRequest, NextResponse } from "next/server";
import { findUserByUsername, findUserByEmail, toPublicUser, trackEvent } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import {
  createSessionToken,
  getSessionCookieConfig,
} from "@/lib/auth/session";
import { ensureSessionSecret } from "@/lib/auth/session-secret";
import { withMetrics } from "@/lib/with-metrics";
import { authEventsTotal } from "@/lib/metrics";
import { parseBody } from "@/lib/api-response";
import { loginSchema } from "@/lib/schemas";
import { checkLoginRateLimit, getClientIp } from "@/lib/rate-limit";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { isE2EAuthBypassActive } from "@/lib/e2e-auth-bypass";
import { useLegacyAuth } from "@/lib/idp/config";
import { json401 } from "@/lib/log-unauthorized";

export const POST = withMetrics("/api/auth/login", async (req: NextRequest) => {
  ensureSessionSecret();

  if (!useLegacyAuth()) {
    return NextResponse.json(
      {
        error: "Sign in moved to user.trefolio.com. You can sign in there once and the session works across trefolio, Clara and Will.",
        loginUrl: "https://user.trefolio.com/login?from=trefolio",
      },
      { status: 410 },
    );
  }

  const ip = getClientIp(req);
  const isDev = process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test";
  if (!isDev && !isE2EAuthBypassActive()) {
    const rl = await checkLoginRateLimit(ip);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many login attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": "900" } },
      );
    }
  }

  const result = await parseBody(req, loginSchema);
  if (!result.success) return result.error;
  const { identifier, password } = result.data;
  const trimmed = identifier.trim();

  const cfToken = (result.data as Record<string, unknown>).turnstileToken as string | undefined;
  const captchaOk = await verifyTurnstileToken(cfToken, ip, req.headers.get("host"));
  if (!captchaOk) {
    return NextResponse.json({ error: "CAPTCHA verification failed. Please try again." }, { status: 403 });
  }

  try {
    const isEmail = trimmed.includes("@");
    const user = isEmail
      ? await findUserByEmail(trimmed)
      : await findUserByUsername(trimmed);

    if (!user) {
      authEventsTotal.inc({ event: "login_failure" });
      return json401(req, { source: "api/auth/login", reason: "invalid_credentials", tags: { phase: "user_lookup" } }, { error: "Invalid credentials." });
    }

    if (user.auth_provider === "google") {
      return NextResponse.json(
        { error: "This account uses Google sign-in. Please use the Google button." },
        { status: 400 },
      );
    }

    if (user.auth_provider === "apple") {
      return NextResponse.json(
        { error: "This account uses Apple sign-in. Please use the Apple button." },
        { status: 400 },
      );
    }

    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      authEventsTotal.inc({ event: "login_failure" });
      return json401(req, { source: "api/auth/login", reason: "invalid_credentials", tags: { phase: "password" } }, { error: "Invalid credentials." });
    }

    const token = await createSessionToken({
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      mustChangePassword: user.must_change_password === 1,
      plan: user.plan,
      emailVerified: user.email_verified === 1,
      onboardingCompleted: user.onboarding_completed === 1,
    });

    trackEvent(user.id, "login");
    authEventsTotal.inc({ event: "login_success" });
    const response = NextResponse.json({ user: toPublicUser(user) });
    response.cookies.set(getSessionCookieConfig(token));
    return response;
  } catch (error) {
    console.error("Login failed:", error);
    authEventsTotal.inc({ event: "login_failure" });
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }
});
