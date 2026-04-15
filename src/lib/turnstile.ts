import { isE2EAuthBypassActive } from "@/lib/e2e-auth-bypass";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/**
 * Verify a Cloudflare Turnstile token server-side.
 * Returns true when Turnstile is not configured (dev/optional), during `next dev`, or when E2E bypass is active.
 */
export async function verifyTurnstileToken(token: string | null | undefined, ip: string): Promise<boolean> {
  if (isE2EAuthBypassActive()) return true;
  if (process.env.NODE_ENV === "development") return true;
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (!token) return false;

  try {
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token, remoteip: ip }),
    });
    const data = await res.json();
    return data.success === true;
  } catch {
    return false;
  }
}
