import { isE2EAuthBypassActive } from "@/lib/e2e-auth-bypass";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** True when the request host is a local dev origin (localhost / 127.0.0.1 / ::1). */
function isLocalhostHost(host: string | null | undefined): boolean {
  if (!host) return false;
  const h = host.toLowerCase().split(":")[0];
  return h === "localhost" || h === "127.0.0.1" || h === "[::1]" || h === "::1";
}

/** True when the request IP is a loopback address. */
function isLoopbackIp(ip: string | null | undefined): boolean {
  if (!ip) return false;
  return ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1";
}

/**
 * Verify a Cloudflare Turnstile token server-side.
 * Returns true when Turnstile is not configured (dev/optional), during `next dev`,
 * when E2E bypass is active, when the request originates from localhost, or when
 * the operator opts out via `TURNSTILE_DISABLED=1`.
 */
export async function verifyTurnstileToken(
  token: string | null | undefined,
  ip: string,
  host?: string | null,
): Promise<boolean> {
  if (isE2EAuthBypassActive()) return true;
  if (process.env.NODE_ENV === "development") return true;
  if (process.env.TURNSTILE_DISABLED === "1") return true;
  if (isLocalhostHost(host) || isLoopbackIp(ip)) return true;
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
