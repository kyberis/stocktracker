import { SignJWT, jwtVerify } from "jose";

import { isE2EAuthBypassActive } from "@/lib/e2e-auth-bypass";
import { isIdpEnabled } from "@/lib/idp/config";

const PURPOSE = "trefolio_registration_approval";
const TTL_SECONDS = 60 * 60 * 24 * 7;

export function requiresRegistrationApproval(): boolean {
  const v = process.env.REGISTRATION_REQUIRES_APPROVAL?.trim().toLowerCase();
  if (v === "0" || v === "false" || v === "no" || v === "off") return false;
  return true;
}

export function isRegistrationApproved(user: {
  registration_approved_at?: string | null;
}): boolean {
  if (!requiresRegistrationApproval()) return true;
  const at = user.registration_approved_at;
  return typeof at === "string" && at.trim().length > 0;
}

/**
 * Legacy (IdP-off) creates stay pending. IdP-on and env-off stamp now.
 * `createUser` defaults to now so tests and OIDC provision stay unlocked.
 */
export function registrationApprovedAtForLegacyCreate(): string {
  if (!requiresRegistrationApproval()) return new Date().toISOString();
  if (isIdpEnabled()) return new Date().toISOString();
  if (isE2EAuthBypassActive()) return new Date().toISOString();
  return "";
}

function signingSecret(): Uint8Array {
  return new TextEncoder().encode(
    process.env.APP_SESSION_SECRET || "trefolio-dev-session-secret-change-me",
  );
}

export async function createRegistrationApprovalJwt(args: {
  userId: string;
  email: string;
}): Promise<string> {
  return new SignJWT({
    purpose: PURPOSE,
    email: args.email,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(args.userId)
    .setIssuedAt()
    .setExpirationTime(`${TTL_SECONDS}s`)
    .sign(signingSecret());
}

export async function verifyRegistrationApprovalJwt(token: string): Promise<{
  userId: string;
  email: string;
} | null> {
  try {
    const { payload } = await jwtVerify(token, signingSecret(), {
      algorithms: ["HS256"],
    });
    if (payload.purpose !== PURPOSE) return null;
    const userId = typeof payload.sub === "string" ? payload.sub : "";
    const email = typeof payload.email === "string" ? payload.email : "";
    if (!userId || !email) return null;
    return { userId, email };
  } catch {
    return null;
  }
}
