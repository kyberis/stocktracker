import { NextRequest, NextResponse } from "next/server";
import { SignJWT, importPKCS8, createRemoteJWKSet, jwtVerify } from "jose";
import {
  findUserByAppleId,
  findUserByEmail,
  createUser,
  trackEvent,
  toPublicUser,
  isFeatureEnabled,
  ensureDefaultPortfolio,
} from "@/lib/db";
import type { DbUser } from "@/lib/db";
import {
  createSessionToken,
  getSessionCookieConfig,
} from "@/lib/auth/session";
import { sendWelcomeEmail, sendAdminNewCustomerNotification } from "@/lib/email";
import { ensureSessionSecret } from "@/lib/auth/session-secret";
import { authEventsTotal } from "@/lib/metrics";
import { isBlockedEmailDomain } from "@/lib/schemas";
import { createNotification } from "@/lib/db";
import { welcomeNotification } from "@/lib/notification-templates";

const APPLE_TOKEN_URL = "https://appleid.apple.com/auth/token";
const APPLE_JWKS_URL = new URL("https://appleid.apple.com/auth/keys");

function getRedirectUri(req: NextRequest): string {
  const base = process.env.APP_BASE_URL || req.nextUrl.origin;
  return `${base}/api/auth/apple/callback`;
}

function errorRedirect(req: NextRequest, message: string): NextResponse {
  const url = new URL("/login", req.nextUrl.origin);
  url.searchParams.set("error", message);
  return NextResponse.redirect(url);
}

async function generateAppleClientSecret(): Promise<string> {
  const teamId = process.env.APPLE_TEAM_ID!;
  const clientId = process.env.APPLE_CLIENT_ID!;
  const keyId = process.env.APPLE_KEY_ID!;
  const privateKeyBase64 = process.env.APPLE_PRIVATE_KEY!;

  const privateKeyPem = Buffer.from(privateKeyBase64, "base64").toString("utf-8");
  const key = await importPKCS8(privateKeyPem, "ES256");

  return new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: keyId })
    .setIssuer(teamId)
    .setIssuedAt()
    .setExpirationTime("180d")
    .setAudience("https://appleid.apple.com")
    .setSubject(clientId)
    .sign(key);
}

interface AppleIdTokenClaims {
  sub: string;
  email?: string;
  email_verified?: boolean | string;
}

export async function POST(req: NextRequest) {
  ensureSessionSecret();

  if (!(await isFeatureEnabled("apple_signin_enabled"))) {
    return errorRedirect(req, "Apple Sign In is not enabled.");
  }

  const clientId = process.env.APPLE_CLIENT_ID;
  const teamId = process.env.APPLE_TEAM_ID;
  const keyId = process.env.APPLE_KEY_ID;
  const privateKey = process.env.APPLE_PRIVATE_KEY;

  if (!clientId || !teamId || !keyId || !privateKey) {
    return errorRedirect(req, "Apple OAuth is not configured.");
  }

  const formData = await req.formData();
  const code = formData.get("code") as string | null;
  const state = formData.get("state") as string | null;
  const storedState = req.cookies.get("apple_oauth_state")?.value;

  if (!code || !state || state !== storedState) {
    return errorRedirect(req, "Invalid OAuth state. Please try again.");
  }

  // Apple sends user info only on first authorization
  const userJson = formData.get("user") as string | null;
  let appleUserName = "";
  if (userJson) {
    try {
      const parsed = JSON.parse(userJson);
      const first = parsed.name?.firstName || "";
      const last = parsed.name?.lastName || "";
      appleUserName = [first, last].filter(Boolean).join(" ");
    } catch { /* ignore malformed user JSON */ }
  }

  try {
    const clientSecret = await generateAppleClientSecret();

    const tokenRes = await fetch(APPLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: getRedirectUri(req),
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      console.error("Apple token exchange failed:", await tokenRes.text());
      return errorRedirect(req, "Apple authentication failed.");
    }

    const tokenData = await tokenRes.json();
    const idToken = tokenData.id_token;
    if (!idToken) {
      return errorRedirect(req, "Apple authentication failed.");
    }

    const JWKS = createRemoteJWKSet(APPLE_JWKS_URL);
    const { payload } = await jwtVerify(idToken, JWKS, {
      issuer: "https://appleid.apple.com",
      audience: clientId,
    });

    const claims = payload as unknown as AppleIdTokenClaims;
    const appleSub = claims.sub;
    const appleEmail = claims.email;
    const emailVerified = claims.email_verified === true || claims.email_verified === "true";

    if (!appleSub) {
      return errorRedirect(req, "Apple authentication failed.");
    }

    if (appleEmail && isBlockedEmailDomain(appleEmail)) {
      return errorRedirect(req, "Disposable email addresses are not allowed. Please use a real email.");
    }

    let dbUser: DbUser | null = await findUserByAppleId(appleSub);

    if (!dbUser && appleEmail) {
      const existingEmail = await findUserByEmail(appleEmail);
      if (existingEmail) {
        if (existingEmail.auth_provider === "credentials") {
          return errorRedirect(
            req,
            "An account with this email already exists. Please sign in with your password.",
          );
        }
        dbUser = existingEmail;
      }
    }

    if (!dbUser) {
      const emailBase = appleEmail ? appleEmail.split("@")[0] : "user";
      const username = emailBase.replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 30) || "user";
      const publicUser = await createUser({
        username,
        passwordHash: "",
        email: appleEmail?.toLowerCase() || "",
        displayName: appleUserName || "",
        avatarUrl: "",
        authProvider: "apple",
        appleId: appleSub,
        emailVerified,
        seedWithData: false,
      });
      await ensureDefaultPortfolio(publicUser.id);
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
        plan: publicUser.plan,
        stripe_customer_id: "",
        stripe_subscription_id: "",
        plan_expires_at: "",
        ai_calls_this_month: 0,
        ai_calls_reset_at: "",
        ai_calls_today: 0,
        ai_daily_reset_at: "",
        email_verified: emailVerified ? 1 : 0,
        auth_provider: "apple",
        google_id: "",
        apple_id: appleSub,
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
      };
      trackEvent(publicUser.id, "signup");
      authEventsTotal.inc({ event: "signup" });
      if (appleEmail) {
        sendWelcomeEmail(appleEmail.toLowerCase(), appleUserName || "").catch((err) =>
          console.error("Welcome email failed:", err),
        );
      }
      createNotification(publicUser.id, welcomeNotification()).catch((err) =>
        console.error("Welcome notification failed:", err),
      );
      sendAdminNewCustomerNotification(appleEmail?.toLowerCase() || "", appleUserName || "", "apple").catch((err) =>
        console.error("Admin new customer notification failed:", err),
      );
    }

    const token = await createSessionToken({
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

    const response = NextResponse.redirect(new URL("/", req.nextUrl.origin));
    response.cookies.set(getSessionCookieConfig(token));
    response.cookies.set({
      name: "apple_oauth_state",
      value: "",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });

    return response;
  } catch (error) {
    console.error("Apple OAuth callback failed:", error);
    return errorRedirect(req, "Apple authentication failed.");
  }
}
