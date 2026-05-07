/**
 * Service-to-service HTTP client for the trefolio-accounts IdP.
 * Server-side only. Same shape as Clara's idp-client.ts (only `appHint`
 * differs).
 */

class IdpClientError extends Error {
  constructor(message: string, public readonly status: number, public readonly body: unknown) {
    super(message);
    this.name = "IdpClientError";
  }
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const base = process.env.IDP_BASE_URL;
  const token = process.env.IDP_SERVICE_TOKEN;
  if (!base) throw new Error("IDP_BASE_URL is not configured");
  if (!token) throw new Error("IDP_SERVICE_TOKEN is not configured");

  const res = await fetch(`${base.replace(/\/+$/g, "")}${path}`, {
    ...init,
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
    throw new IdpClientError(
      `IdP ${init.method ?? "GET"} ${path} failed (${res.status})`,
      res.status,
      body,
    );
  }
  return (await res.json()) as T;
}

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
}): Promise<{ sub: string; linkedAt: string }> {
  return call(`/v1/telegram/link`, {
    method: "POST",
    body: JSON.stringify({
      telegramUserId: String(args.telegramUserId),
      telegramUsername: args.telegramUsername,
      code: args.code,
      appHint: "will",
    }),
  });
}

export interface IdpEntitlementResponse {
  sub: string;
  plan: "free" | "pro";
  proUntil: string | null;
  entitlements: {
    trefolio_pro: boolean;
    clara_daily_limit: number;
    will_daily_limit: number;
  };
}

export function fetchEntitlementsBySub(sub: string): Promise<IdpEntitlementResponse> {
  return call(`/v1/entitlements/${encodeURIComponent(sub)}`);
}

export interface ImportUserPayload {
  email: string;
  passwordHash?: string;
  name?: string;
  locale?: string;
  emailVerified?: boolean;
  plan?: "free" | "pro";
}

export function importUser(payload: ImportUserPayload): Promise<{ sub: string; email: string; created: boolean }> {
  return call(`/v1/admin/users/import`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export { IdpClientError };
