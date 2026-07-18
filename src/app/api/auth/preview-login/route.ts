import { NextRequest, NextResponse } from "next/server";
import { findUserByEmail, trackEvent } from "@/lib/db";
import {
  createSessionToken,
  getSessionCookieConfig,
} from "@/lib/auth/session";
import { ensureSessionSecret } from "@/lib/auth/session-secret";
import {
  getPreviewUserEmail,
  isPreviewLoginAllowed,
  previewLoginSecretsConfigured,
  safePreviewRedirect,
  verifyPreviewLoginSecret,
} from "@/lib/auth/preview-login";
import { withMetrics } from "@/lib/with-metrics";

export const dynamic = "force-dynamic";

/**
 * Mint a session cookie for PREVIEW_USER_EMAIL.
 * GET /api/auth/preview-login?secret=…&redirect=/
 * Only when VERCEL_ENV=preview (or local with PREVIEW_LOGIN_ALLOW_LOCAL=1).
 */
export const GET = withMetrics("/api/auth/preview-login", async (req: NextRequest) => {
  ensureSessionSecret();

  if (!isPreviewLoginAllowed()) {
    return NextResponse.json(
      { error: "Preview login is only available on Vercel Preview deployments." },
      { status: 403 },
    );
  }

  if (!previewLoginSecretsConfigured()) {
    return NextResponse.json(
      {
        error:
          "Preview login is not configured. Set PREVIEW_LOGIN_SECRET and PREVIEW_USER_EMAIL.",
      },
      { status: 503 },
    );
  }

  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");
  if (!verifyPreviewLoginSecret(secret)) {
    return NextResponse.json({ error: "Invalid preview login secret." }, { status: 401 });
  }

  const email = getPreviewUserEmail();
  const user = await findUserByEmail(email);
  if (!user) {
    return NextResponse.json(
      { error: `Preview user not found: ${email}. Create this user in the DB used by Preview.` },
      { status: 404 },
    );
  }

  const token = await createSessionToken({
    userId: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    mustChangePassword: user.must_change_password === 1,
    plan: user.plan === "pro" ? "pro" : "free",
    emailVerified: user.email_verified === 1,
    onboardingCompleted: user.onboarding_completed === 1,
  });

  await trackEvent(user.id, "preview_login", {
    env: process.env.VERCEL_ENV ?? "local",
  }).catch(() => {});

  const redirectTo = safePreviewRedirect(url.searchParams.get("redirect"));
  const response = NextResponse.redirect(new URL(redirectTo, req.url));
  response.cookies.set(getSessionCookieConfig(token));
  return response;
});
