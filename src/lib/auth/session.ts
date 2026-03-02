import { SignJWT, jwtVerify } from "jose";
import type { NextRequest } from "next/server";
import type { UserRole } from "@/lib/db";

const SESSION_COOKIE = "stocktracker_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const DEV_FALLBACK_SECRET = "stocktracker-dev-session-secret-change-me";

function getSessionSecret(): string {
  return process.env.APP_SESSION_SECRET || DEV_FALLBACK_SECRET;
}

export interface SessionPayload {
  userId: string;
  username: string;
  role: UserRole;
  mustChangePassword: boolean;
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  const secret = new TextEncoder().encode(getSessionSecret());
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secret);
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const secret = new TextEncoder().encode(getSessionSecret());
    const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
    return {
      userId: String(payload.userId),
      username: String(payload.username),
      role: payload.role === "admin" ? "admin" : "user",
      mustChangePassword: Boolean(payload.mustChangePassword),
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
