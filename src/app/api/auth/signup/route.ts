import { NextRequest, NextResponse } from "next/server";
import { createUser, findUserByEmail, findUserById, toPublicUser, trackEvent, ensureDefaultPortfolio, findUserByReferralCode, createReferral } from "@/lib/db";
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
import { createVerificationToken, sendVerificationEmail, sendWelcomeEmail, sendAdminNewCustomerNotification, getEmailLocale } from "@/lib/email";
import { checkSignupRateLimit, getClientIp } from "@/lib/rate-limit";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { createNotification } from "@/lib/db";
import { welcomeNotification } from "@/lib/notification-templates";
import { normalizeAttribution, parseFirstTouchAttributionCookie, FIRST_TOUCH_ATTRIBUTION_COOKIE } from "@/lib/attribution";
import { isE2EAuthBypassActive } from "@/lib/e2e-auth-bypass";
import { freezeLocalUserWrites, isIdpEnabled } from "@/lib/idp/config";
import { enqueueProdOpsUserRegisteredEvent } from "@/lib/prodops";
import { grantCommerceComplimentaryPro } from "@/lib/commerce-complimentary-pro";

function deriveUsername(email: string): string {
  const prefix = email.split("@")[0].replace(/[^a-zA-Z0-9._-]/g, "");
  return prefix.slice(0, 30) || "user";
}

export const POST = withMetrics("/api/auth/signup", async (req: NextRequest) => {
  ensureSessionSecret();

  if (isIdpEnabled()) {
    return NextResponse.json(
      {
        error: "Sign up has moved to user.trefolio.com. Open /signup in the app to create your unified trefolio account (trefolio, Clara, and Will).",
        upgradeUrl: "https://user.trefolio.com",
      },
      { status: 410 },
    );
  }
  if (freezeLocalUserWrites()) {
    return NextResponse.json(
      {
        error: "Account creation is temporarily paused while we migrate to the unified trefolio account. Please try again in a few minutes or sign up at user.trefolio.com.",
        upgradeUrl: "https://user.trefolio.com/signup?from=trefolio",
      },
      { status: 503, headers: { "Retry-After": "300" } },
    );
  }

  const ip = getClientIp(req);
  const isDev = process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test";
  if (!isDev && !isE2EAuthBypassActive()) {
    const rl = await checkSignupRateLimit(ip);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many signup attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": "3600" } },
      );
    }
  }

  let rawJson: Record<string, unknown> = {};
  try { rawJson = await req.clone().json(); } catch {}
  const seedWithData = isDev && rawJson.seedWithData === true;

  const result = await parseBody(req, signupSchema);
  if (!result.success) return result.error;
  const { email, password, displayName, referralCode, attribution: attributionFromBody } = result.data;
  const normalizedEmail = email.trim().toLowerCase();
  const attributionFromCookie = parseFirstTouchAttributionCookie(
    req.cookies.get(FIRST_TOUCH_ATTRIBUTION_COOKIE)?.value
  );
  const attribution = normalizeAttribution(attributionFromBody ?? attributionFromCookie ?? undefined);

  const cfToken = (result.data as Record<string, unknown>).turnstileToken as string | undefined;
  const captchaOk = await verifyTurnstileToken(cfToken, ip, req.headers.get("host"));
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
      seedWithData,
      attribution,
    });

    await ensureDefaultPortfolio(user.id);
    await grantCommerceComplimentaryPro(user.id);
    const dbUser = await findUserById(user.id);
    const provisionedUser = dbUser ? toPublicUser(dbUser) : user;

    // Handle referral code from body or cookie
    const refCode = referralCode || req.cookies.get("trefolio_ref")?.value || "";
    if (refCode) {
      const referrer = await findUserByReferralCode(refCode);
      if (referrer && referrer.id !== user.id) {
        createReferral(referrer.id, user.id).catch((err) =>
          console.error("Failed to create referral:", err),
        );
        trackEvent(user.id, "referral_signup", { referrerId: referrer.id });
      }
    }

    const token = await createSessionToken({
      userId: provisionedUser.id,
      username: provisionedUser.username,
      email: provisionedUser.email,
      role: provisionedUser.role,
      mustChangePassword: provisionedUser.mustChangePassword,
      plan: provisionedUser.plan,
      emailVerified: false,
      onboardingCompleted: false,
    });

    trackEvent(user.id, "signup", {
      source: attribution.source,
      medium: attribution.medium,
      campaign: attribution.campaign || "none",
    });
    trackEvent(user.id, "signup_completed", {
      method: "credentials",
      source: attribution.source,
      medium: attribution.medium,
      campaign: attribution.campaign || "none",
    });
    await enqueueProdOpsUserRegisteredEvent({
      userId: user.id,
      method: "credentials",
    });
    authEventsTotal.inc({ event: "signup" });

    const verificationToken = await createVerificationToken(user.id, normalizedEmail);
    const browserLang = req.headers.get("accept-language")?.split(",")[0]?.split("-")[0] ?? "en";
    const emailLocale = getEmailLocale(browserLang);
    sendVerificationEmail(normalizedEmail, verificationToken, emailLocale).then((result) => {
      if (result.success) trackEvent(user.id, "email_verification_sent");
    });
    sendWelcomeEmail(normalizedEmail, displayName || "", emailLocale, user.id).catch((err) =>
      console.error("Welcome email failed:", err),
    );
    createNotification(user.id, welcomeNotification()).catch((err) =>
      console.error("Welcome notification failed:", err),
    );
    // Legacy signup only (IdP disabled). Unified signups are notified from the IdP, not Warren.
    if (!isIdpEnabled()) {
      sendAdminNewCustomerNotification(normalizedEmail, displayName || "", "credentials").catch((err) =>
        console.error("Admin new customer notification failed:", err),
      );
    }

    const response = NextResponse.json({ user: provisionedUser }, { status: 201 });
    response.cookies.set(getSessionCookieConfig(token));
    return response;
  } catch (error) {
    console.error("Signup failed:", error);
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }
});
