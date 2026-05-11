import { getIdpBaseUrl, getIdpServiceToken } from "./config";

/**
 * Service-to-service HTTP client for the IdP REST API.
 * Server-side only. Never call from a client component.
 */

class IdpClientError extends Error {
  constructor(message: string, public readonly status: number, public readonly body: unknown) {
    super(message);
    this.name = "IdpClientError";
  }
}

/** Bound IdP S2S calls so a slow or hung IdP never blocks the caller indefinitely. */
const IDP_FETCH_TIMEOUT_MS = 20_000;

function isLikelyFetchTimeout(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const name = (err as { name?: string }).name;
  return name === "TimeoutError" || name === "AbortError";
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const base = getIdpBaseUrl();
  const token = getIdpServiceToken();
  if (!base) throw new Error("IDP_BASE_URL is not configured");
  if (!token) throw new Error("IDP_SERVICE_TOKEN is not configured");

  const { signal: _callerSignal, ...rest } = init;
  const method = (init.method ?? "GET").toUpperCase();
  /** POST timeouts may still have reached the IdP — avoid duplicate side effects. */
  const retryOnTimeout = method === "GET";

  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`${base}${path}`, {
        ...rest,
        signal: AbortSignal.timeout(IDP_FETCH_TIMEOUT_MS),
        headers: {
          ...(init.headers ?? {}),
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });

      if (!res.ok) {
        let body: unknown = null;
        try {
          body = await res.json();
        } catch {
          // ignore
        }
        throw new IdpClientError(`IdP ${init.method ?? "GET"} ${path} failed (${res.status})`, res.status, body);
      }
      return (await res.json()) as T;
    } catch (err) {
      lastErr = err;
      if (attempt === 0 && retryOnTimeout && isLikelyFetchTimeout(err)) {
        await new Promise((r) => setTimeout(r, 400));
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

/* ── Entitlements ────────────────────────────────────────────────────── */

export interface IdpEntitlementResponse {
  sub: string;
  plan: "free" | "pro";
  proUntil: string | null;
  source: "stripe" | "grant" | "trial" | null;
  profile?: {
    email: string;
    name: string;
    picture: string | null;
    taxResidency: string | null;
  };
  entitlements: {
    trefolio_pro: boolean;
    clara_daily_limit: number;
    will_daily_limit: number;
  };
}

export function fetchEntitlementsBySub(sub: string): Promise<IdpEntitlementResponse> {
  return call(`/v1/entitlements/${encodeURIComponent(sub)}`);
}

/* ── Telegram ────────────────────────────────────────────────────────── */

export interface TelegramLookup {
  sub: string;
  email: string;
  locale: string;
  appHint: string | null;
  verifiedAt: string;
}

export function fetchUserByTelegramId(tgUserId: string | number | bigint): Promise<TelegramLookup> {
  return call(`/v1/telegram/by-id/${encodeURIComponent(String(tgUserId))}`);
}

export function linkTelegramUser(args: {
  telegramUserId: string | number | bigint;
  telegramUsername?: string;
  code: string;
  appHint: "trefolio" | "clara" | "will";
}): Promise<{ sub: string; linkedAt: string }> {
  return call(`/v1/telegram/link`, {
    method: "POST",
    body: JSON.stringify({
      telegramUserId: String(args.telegramUserId),
      telegramUsername: args.telegramUsername,
      code: args.code,
      appHint: args.appHint,
    }),
  });
}

/* ── Admin ───────────────────────────────────────────────────────────── */

export interface ImportUserPayload {
  email: string;
  passwordHash?: string;
  name?: string;
  locale?: string;
  googleId?: string;
  appleId?: string;
  emailVerified?: boolean;
  plan?: "free" | "pro";
  proUntil?: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
}

export interface ImportUserResponse {
  sub: string;
  email: string;
  created: boolean;
}

export function importUser(payload: ImportUserPayload): Promise<ImportUserResponse> {
  return call(`/v1/admin/users/import`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** Copies Warren `trial_token` to the IdP so invitation links on user.* validate. */
export function syncTrialTokenToIdp(payload: {
  email: string;
  trialToken: string;
}): Promise<{ ok: boolean }> {
  return call(`/v1/admin/users/sync-trial-token`, {
    method: "POST",
    body: JSON.stringify({
      email: payload.email,
      trialToken: payload.trialToken,
    }),
  });
}

/** Creates pending grant + sends invitation email from the IdP (unified claim URL). */
export function inviteMembershipGrantViaIdp(payload: {
  email: string;
  days: number;
}): Promise<{ ok: boolean; sub: string }> {
  return call(`/v1/admin/users/membership-grant-invite`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export { IdpClientError };
