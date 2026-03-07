import type { NextRequest } from "next/server";

const CHALLENGE_COOKIE = "trefolio_webauthn_challenge";
const CHALLENGE_TTL_SECONDS = 300; // 5 minutes

export function getWebAuthnConfig(req?: NextRequest) {
  const base = process.env.APP_BASE_URL || req?.nextUrl.origin || "http://localhost:3000";
  const url = new URL(base);
  return {
    rpName: "trefolio",
    rpID: url.hostname,
    origin: url.origin,
  };
}

export function getChallengeCookieConfig(challenge: string) {
  return {
    name: CHALLENGE_COOKIE,
    value: challenge,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CHALLENGE_TTL_SECONDS,
  };
}

export function getChallengeFromRequest(req: NextRequest): string | null {
  return req.cookies.get(CHALLENGE_COOKIE)?.value ?? null;
}

export function getExpiredChallengeCookieConfig() {
  return {
    name: CHALLENGE_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  };
}
