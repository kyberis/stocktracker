import { NextRequest, NextResponse } from "next/server";
import {
  findUserByGoogleId,
  findUserByEmail,
  findUserById,
  createUser,
  linkGoogleAccount,
  trackEvent,
  ensureDefaultPortfolio,
  findUserByReferralCode,
  createReferral,
} from "@/lib/db";
import type { DbUser } from "@/lib/db";
import {
  createSessionToken,
  getSessionCookieConfig,
  verifySessionToken,
} from "@/lib/auth/session";
import { sendWelcomeEmail, sendAdminNewCustomerNotification } from "@/lib/email";
import { ensureSessionSecret } from "@/lib/auth/session-secret";
import { authEventsTotal } from "@/lib/metrics";
import { isBlockedEmailDomain } from "@/lib/schemas";
import { createNotification } from "@/lib/db";
import { welcomeNotification } from "@/lib/notification-templates";
import { FIRST_TOUCH_ATTRIBUTION_COOKIE, normalizeAttribution, parseFirstTouchAttributionCookie } from "@/lib/attribution";
import { freezeLocalUserWrites, isIdpEnabled } from "@/lib/idp/config";
import { enqueueProdOpsUserRegisteredEvent } from "@/lib/prodops";
import { grantCommerceComplimentaryPro } from "@/lib/commerce-complimentary-pro";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";

interface GoogleUserInfo {
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
  picture: string;
}

function getRedirectUri(req: NextRequest): string {
  const base = process.env.APP_BASE_URL || req.nextUrl.origin;
  return `${base}/api/auth/google/callback`;
}

function errorRedirect(req: NextRequest, message: string): NextResponse {
  const url = new URL("/login", req.nextUrl.origin);
  url.searchParams.set("error", message);
  return NextResponse.redirect(url);
}

function profileErrorRedirect(req: NextRequest, message: string): NextResponse {
  const url = new URL("/profile", req.nextUrl.origin);
  url.searchParams.set("linkError", message);
  return NextResponse.redirect(url);
}

function clearLinkIntentCookie(response: NextResponse): void {
  response.cookies.set({
    name: "google_link_intent",
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

async function exchangeCodeForGoogleUser(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string,
): Promise<GoogleUserInfo | null> {
  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    console.error("Google token exchange failed:", await tokenRes.text());
    return null;
  }

  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;
  if (!accessToken) return null;

  const userInfoRes = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!userInfoRes.ok) return null;

  return userInfoRes.json();
}

export async function GET(req: NextRequest) {
  ensureSessionSecret();

  if (isIdpEnabled()) {
    return errorRedirect(req, "Google sign-in moved to user.trefolio.com.");
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return errorRedirect(req, "Google OAuth is not configured.");
  }

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const storedState = req.cookies.get("google_oauth_state")?.value;

  if (!code || !state || state !== storedState) {
    return errorRedirect(req, "Invalid OAuth state. Please try again.");
  }

  const isLinkFlow = req.cookies.get("google_link_intent")?.value === "1";

  if (isLinkFlow) {
    return handleLinkFlow(req, code, clientId, clientSecret);
  }

  return handleLoginFlow(req, code, clientId, clientSecret);
}

async function handleLinkFlow(
  req: NextRequest,
  code: string,
  clientId: string,
  clientSecret: string,
): Promise<NextResponse> {
  const token = req.cookies.get("trefolio_session")?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session) {
    const resp = errorRedirect(req, "Session expired. Please log in and try again.");
    clearLinkIntentCookie(resp);
    return resp;
  }

  const googleUser = await exchangeCodeForGoogleUser(
    code, clientId, clientSecret, getRedirectUri(req),
  );
  if (!googleUser?.email) {
    const resp = profileErrorRedirect(req, "Failed to get Google account info.");
    clearLinkIntentCookie(resp);
    return resp;
  }

  const dbUser = await findUserById(session.userId);
  if (!dbUser) {
    const resp = profileErrorRedirect(req, "User not found.");
    clearLinkIntentCookie(resp);
    return resp;
  }

  if (dbUser.email.toLowerCase() !== googleUser.email.toLowerCase()) {
    const resp = profileErrorRedirect(
      req,
      "Google email does not match your account email.",
    );
    clearLinkIntentCookie(resp);
    return resp;
  }

  const existingGoogleUser = await findUserByGoogleId(googleUser.sub);
  if (existingGoogleUser && existingGoogleUser.id !== dbUser.id) {
    const resp = profileErrorRedirect(
      req,
      "This Google account is already linked to another user.",
    );
    clearLinkIntentCookie(resp);
    return resp;
  }

  await linkGoogleAccount(dbUser.id, googleUser.sub);
  trackEvent(dbUser.id, "google_linked");

  const response = NextResponse.redirect(
    new URL("/profile?googleLinked=true", req.nextUrl.origin),
  );
  response.cookies.set({
    name: "google_oauth_state",
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  clearLinkIntentCookie(response);
  return response;
}

async function handleLoginFlow(
  req: NextRequest,
  code: string,
  clientId: string,
  clientSecret: string,
): Promise<NextResponse> {
  try {
    const attribution = normalizeAttribution(
      parseFirstTouchAttributionCookie(req.cookies.get(FIRST_TOUCH_ATTRIBUTION_COOKIE)?.value) ?? undefined
    );
    const googleUser = await exchangeCodeForGoogleUser(
      code, clientId, clientSecret, getRedirectUri(req),
    );
    if (!googleUser) {
      return errorRedirect(req, "Google authentication failed.");
    }
    if (!googleUser.email) {
      return errorRedirect(req, "No email returned from Google.");
    }

    if (isBlockedEmailDomain(googleUser.email)) {
      return errorRedirect(req, "Disposable email addresses are not allowed. Please use a real email.");
    }

    let dbUser: DbUser | null = await findUserByGoogleId(googleUser.sub);

    if (!dbUser) {
      const existingEmail = await findUserByEmail(googleUser.email);
      if (existingEmail) {
        if (existingEmail.auth_provider === "credentials") {
          return errorRedirect(
            req,
            "An account with this email already exists. Please sign in with your password, then link Google from your profile.",
          );
        }
        dbUser = existingEmail;
      }
    }

    let isNewSignup = false;
    if (!dbUser) {
      if (freezeLocalUserWrites()) {
        return errorRedirect(
          req,
          "Account creation is temporarily paused while we migrate to the unified trefolio account. Please sign up at user.trefolio.com.",
        );
      }
      isNewSignup = true;
      const username = googleUser.email.split("@")[0].replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 30) || "user";
      const publicUser = await createUser({
        username,
        passwordHash: "",
        email: googleUser.email.toLowerCase(),
        displayName: googleUser.name || "",
        avatarUrl: googleUser.picture || "",
        authProvider: "google",
        googleId: googleUser.sub,
        emailVerified: googleUser.email_verified,
        seedWithData: false,
        attribution,
      });
      await ensureDefaultPortfolio(publicUser.id);
      const complimentaryGrant = await grantCommerceComplimentaryPro(publicUser.id);

      const refCode = req.cookies.get("trefolio_ref")?.value || "";
      if (refCode) {
        const referrer = await findUserByReferralCode(refCode);
        if (referrer && referrer.id !== publicUser.id) {
          createReferral(referrer.id, publicUser.id).catch((err) =>
            console.error("Failed to create referral:", err),
          );
          trackEvent(publicUser.id, "referral_signup", { referrerId: referrer.id });
        }
      }

      dbUser = {
        id: publicUser.id,
        username: publicUser.username,
        password_hash: "",
        role: publicUser.role,
        must_change_password: 0,
        created_at: publicUser.createdAt,
        email: publicUser.email,
        display_name: publicUser.displayName,
        avatar_url: publicUser.avatarUrl,
        plan: complimentaryGrant.granted ? "pro" : publicUser.plan,
        stripe_customer_id: "",
        stripe_subscription_id: "",
        plan_expires_at: complimentaryGrant.granted ? complimentaryGrant.planExpiresAt : "",
        ai_calls_this_month: 0,
        ai_calls_reset_at: "",
        ai_calls_today: 0,
        ai_daily_reset_at: "",
        email_verified: googleUser.email_verified ? 1 : 0,
        auth_provider: "google",
        google_id: googleUser.sub,
        apple_id: "",
        idp_sub: "",
        portfolio_review_count: 0,
        portfolio_review_reset_at: "",
        widget_token_hash: "",
        device_passkey_hash: "",
        device_template_id: "classic-dark",
        device_linked_at: "",
        device_pro_redeemed_at: "",
        device_portfolio_id: "",
        last_active_at: "",
        tax_residency: "",
        onboarding_completed: 0,
        experience_level: "",
        referral_code: "",
        referred_by: "",
        referral_reward_days: 0,
        ai_tokens_this_month: 0,
        ai_tokens_today: 0,
        trial_invited_at: "",
        trial_activated_at: "",
        trial_token: "",
        trial_expired_notified: 0,
        membership_grant_token: "",
        membership_grant_plan: "",
        membership_grant_days: 0,
        membership_grant_created_at: "",
        commerce_complimentary_at: complimentaryGrant.granted ? new Date().toISOString() : "",
        checklist_dismissed_at: "",
        weekly_digest_enabled: 1,
        profile_slug: "",
        bio: "",
        social_visibility: "private",
        headline: "",
        share_portfolio_value: 0,
        share_holdings: 0,
        allow_comments: 1,
      };
      trackEvent(publicUser.id, "signup", {
        source: attribution.source,
        medium: attribution.medium,
        campaign: attribution.campaign || "none",
      });
      trackEvent(publicUser.id, "signup_completed", {
        method: "google",
        source: attribution.source,
        medium: attribution.medium,
        campaign: attribution.campaign || "none",
      });
      await enqueueProdOpsUserRegisteredEvent({
        userId: publicUser.id,
        method: "google",
      });
      authEventsTotal.inc({ event: "signup" });
      sendWelcomeEmail(googleUser.email.toLowerCase(), googleUser.name || "", "en", publicUser.id).catch((err) =>
        console.error("Welcome email failed:", err),
      );
      createNotification(publicUser.id, welcomeNotification()).catch((err) =>
        console.error("Welcome notification failed:", err),
      );
      // Legacy Google signup only. With unified IdP, new-account email goes from user.trefolio.com once.
      if (!isIdpEnabled()) {
        sendAdminNewCustomerNotification(googleUser.email.toLowerCase(), googleUser.name || "", "google").catch((err) =>
          console.error("Admin new customer notification failed:", err),
        );
      }
    }

    if (!dbUser) {
      return errorRedirect(req, "Google authentication failed.");
    }

    const sessionToken = await createSessionToken({
      userId: dbUser.id,
      username: dbUser.username,
      email: dbUser.email,
      role: dbUser.role,
      mustChangePassword: false,
      plan: dbUser.plan,
      emailVerified: dbUser.email_verified === 1,
      onboardingCompleted: dbUser.onboarding_completed === 1,
    });

    trackEvent(dbUser.id, "login");
    authEventsTotal.inc({ event: "login_success" });

    const oauthRedirect = req.cookies.get("oauth_redirect")?.value;
    const destination = oauthRedirect && oauthRedirect.startsWith("/") ? oauthRedirect : "/";
    const response = NextResponse.redirect(new URL(destination, req.nextUrl.origin));
    response.cookies.set(getSessionCookieConfig(sessionToken));
    if (isNewSignup) {
      response.cookies.set({
        name: "trefolio_signup_conversion",
        value: "google",
        httpOnly: false,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60,
      });
    }
    response.cookies.set({
      name: "google_oauth_state",
      value: "",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });
    if (oauthRedirect) {
      response.cookies.set({ name: "oauth_redirect", value: "", httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 });
    }

    return response;
  } catch (error) {
    console.error("Google OAuth callback failed:", error);
    return errorRedirect(req, "Google authentication failed.");
  }
}
