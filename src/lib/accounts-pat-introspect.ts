import { createHash } from "node:crypto";

import { getIdpBaseUrl, getIdpIssuer } from "@/lib/idp/config";

const TFP_PAT_PREFIX = "tfp_pat_";

type CachedOk = { sub: string; tokenId: string; until: number };
const cache = new Map<string, CachedOk>();
const TTL_MS = 45_000;
const MAX_CACHE = 500;

export type PatIntrospectFailureReason =
  | "local_secret_missing"
  | "idp_url_missing"
  | "idp_not_configured"
  | "inactive"
  | "network_error";

export type PatIntrospectResult =
  | { ok: true; sub: string; tokenId: string }
  | { ok: false; reason: PatIntrospectFailureReason };

function patIntrospectUrl(): string | null {
  const base = (getIdpIssuer() || getIdpBaseUrl() || "").replace(/\/+$/, "");
  if (!base) return null;
  return `${base}/api/v1/pat/introspect`;
}

export function isTfpPatToken(plaintext: string): boolean {
  return plaintext.trim().startsWith(TFP_PAT_PREFIX);
}

/** True when this app can call IdP PAT introspection (secret + IdP URL). */
export function isPatIntrospectionConfigured(): boolean {
  return Boolean(process.env.TREFOLIO_PAT_INTROSPECTION_SECRET?.trim() && patIntrospectUrl());
}

export async function introspectTfpPatDetailed(plaintext: string): Promise<PatIntrospectResult> {
  const secret = process.env.TREFOLIO_PAT_INTROSPECTION_SECRET?.trim();
  if (!secret) {
    console.warn("[accounts-pat-introspect] TREFOLIO_PAT_INTROSPECTION_SECRET is not set");
    return { ok: false, reason: "local_secret_missing" };
  }
  const url = patIntrospectUrl();
  if (!url) {
    console.warn("[accounts-pat-introspect] IdP issuer/base URL missing; cannot introspect PAT");
    return { ok: false, reason: "idp_url_missing" };
  }

  const key = createHash("sha256").update(plaintext).digest("hex");
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && hit.until > now) {
    return { ok: true, sub: hit.sub, tokenId: hit.tokenId };
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({ token: plaintext }),
      signal: AbortSignal.timeout(12_000),
    });
  } catch (err) {
    console.error("[accounts-pat-introspect] fetch failed", err);
    return { ok: false, reason: "network_error" };
  }

  let data: { active?: boolean; sub?: string; token_id?: string; error?: string };
  try {
    data = (await res.json()) as { active?: boolean; sub?: string; token_id?: string; error?: string };
  } catch {
    return { ok: false, reason: "network_error" };
  }
  if (res.status === 503 && data.error === "pat_introspection_not_configured") {
    console.warn("[accounts-pat-introspect] IdP PAT introspection is not configured");
    return { ok: false, reason: "idp_not_configured" };
  }
  if (!data.active || !data.sub) return { ok: false, reason: "inactive" };
  const tokenId = String(data.token_id ?? "");

  while (cache.size > MAX_CACHE) {
    const first = cache.keys().next().value;
    if (first) cache.delete(first);
    else break;
  }
  cache.set(key, { sub: data.sub, tokenId, until: now + TTL_MS });
  return { ok: true, sub: data.sub, tokenId };
}

export async function introspectTfpPat(
  plaintext: string,
): Promise<{ sub: string; tokenId: string } | null> {
  const result = await introspectTfpPatDetailed(plaintext);
  return result.ok ? { sub: result.sub, tokenId: result.tokenId } : null;
}
