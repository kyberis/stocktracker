/**
 * Fetch canonical AI model map from trefolio-accounts (IdP).
 * When unset or unreachable, trefolio falls back to Turso `platform_settings`.
 *
 * Auth: Bearer `ACCOUNTS_AI_CONFIG_SECRET`, or `IDP_SERVICE_TOKEN` if the former is not set
 * (one less secret to rotate in small deployments).
 */

import { getIdpBaseUrl } from "@/lib/idp/config";
import {
  AI_FLOW_KEYS,
  type AiFlowKey,
  type AllowedAiModel,
  normalizeAiModelConfigRecord,
} from "@/lib/ai-models";

const INTERNAL_PATH = "/api/v1/internal/ai-model-config";

function internalBearer(): string | null {
  return (
    process.env.ACCOUNTS_AI_CONFIG_SECRET?.trim() ||
    process.env.IDP_SERVICE_TOKEN?.trim() ||
    null
  );
}

export function isIdpAiModelConfigFetchEnabled(): boolean {
  return !!(getIdpBaseUrl() && internalBearer());
}

export async function fetchAiModelConfigFromIdp(): Promise<Record<AiFlowKey, AllowedAiModel> | null> {
  const base = getIdpBaseUrl();
  const token = internalBearer();
  if (!base || !token) return null;

  const url = `${base.replace(/\/+$/g, "")}${INTERNAL_PATH}`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
  } catch (err) {
    console.warn("[idp/ai-model-config] fetch failed", err);
    return null;
  }

  if (!res.ok) {
    console.warn("[idp/ai-model-config] non-OK", res.status, url);
    return null;
  }

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return null;
  }

  const config = (body as { config?: Record<string, string> }).config;
  if (!config || typeof config !== "object") return null;

  const parsed: Record<string, string | undefined> = {};
  for (const key of AI_FLOW_KEYS) {
    const v = config[key];
    if (typeof v === "string") parsed[key] = v;
  }
  return normalizeAiModelConfigRecord(parsed);
}

export async function putAiModelConfigToIdp(
  config: Record<string, string>,
): Promise<{ ok: true } | { ok: false; status: number; message: string }> {
  const base = getIdpBaseUrl();
  const token = internalBearer();
  if (!base || !token) {
    return { ok: false, status: 501, message: "IdP AI config URL or bearer token not configured" };
  }
  const url = `${base.replace(/\/+$/g, "")}${INTERNAL_PATH}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ config }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "fetch failed";
    return { ok: false, status: 502, message };
  }

  if (!res.ok) {
    let message = res.statusText;
    try {
      const j = (await res.json()) as { error?: string };
      if (j?.error) message = j.error;
    } catch {
      /* ignore */
    }
    return { ok: false, status: res.status, message };
  }
  return { ok: true };
}
