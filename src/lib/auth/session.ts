import { SignJWT, jwtVerify } from "jose";
import type { NextRequest } from "next/server";
import type { UserRole } from "@/lib/db";
import type { SubscriptionPlan } from "@/lib/types";

const SESSION_COOKIE = "trefolio_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const DEV_FALLBACK_SECRET = "trefolio-dev-session-secret-change-me";

function getSessionSecret(): string {
  const secret = process.env.APP_SESSION_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("APP_SESSION_SECRET must be set in production. Generate one with: openssl rand -hex 32");
  }
  return DEV_FALLBACK_SECRET;
}

export interface SessionPayload {
  userId: string;
  username: string;
  email: string;
  role: UserRole;
  mustChangePassword: boolean;
  plan: SubscriptionPlan;
  emailVerified: boolean;
  onboardingCompleted: boolean;
  /** When set, an admin is viewing the app as this user (see /api/admin/impersonate). */
  impersonatorUserId?: string;
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  const secret = new TextEncoder().encode(getSessionSecret());
  const claims: Record<string, unknown> = {
    userId: payload.userId,
    username: payload.username,
    email: payload.email,
    role: payload.role,
    mustChangePassword: payload.mustChangePassword,
    plan: payload.plan,
    emailVerified: payload.emailVerified,
    onboardingCompleted: payload.onboardingCompleted,
  };
  if (payload.impersonatorUserId) {
    claims.impersonatorUserId = payload.impersonatorUserId;
  }
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secret);
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const secret = new TextEncoder().encode(getSessionSecret());
    const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
    const impersonatorRaw = payload.impersonatorUserId;
    const impersonatorUserId =
      typeof impersonatorRaw === "string" && impersonatorRaw.length > 0 ? impersonatorRaw : undefined;
    return {
      userId: String(payload.userId),
      username: String(payload.username),
      email: String(payload.email || ""),
      role: payload.role === "admin" ? "admin" : "user",
      mustChangePassword: Boolean(payload.mustChangePassword),
      plan: (payload.plan === "pro" ? "pro" : payload.plan === "starter" ? "starter" : "free") as SubscriptionPlan,
      emailVerified: Boolean(payload.emailVerified),
      onboardingCompleted: Boolean(payload.onboardingCompleted),
      impersonatorUserId,
    };
  } catch {
    return null;
  }
}

export async function getSessionFromRequest(req: NextRequest): Promise<SessionPayload | null> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export function getSessionCookieConfig(token: string) {
  return {
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  };
}

export function getExpiredSessionCookieConfig() {
  return {
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  };
}
