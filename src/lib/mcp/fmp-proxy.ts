import { FMP_STABLE_BASE } from "@/lib/api-providers/fmp";
import { getGlobalFmpApiKey } from "@/lib/db";

export const FMP_PROXY_DEFAULT_LIMIT_BYTES = 1_048_576;
export const FMP_PROXY_MAX_LIMIT_BYTES = 2_097_152;
const FMP_PROXY_TIMEOUT_MS = 25_000;
const FMP_PROXY_MAX_PATH_LEN = 200;
const FMP_PROXY_MAX_PARAMS = 40;
const FMP_PROXY_MAX_PARAM_VALUE_LEN = 500;

const PATH_SEGMENT_RE = /^[a-zA-Z0-9_-]+$/;

export type SanitizeFmpPathResult =
  | { ok: true; path: string }
  | { ok: false; error: string };

export type SanitizeFmpParamsResult =
  | { ok: true; params: Record<string, string> }
  | { ok: false; error: string };

export type FmpStableGetResult =
  | {
      ok: true;
      status: number;
      path: string;
      data: unknown;
      truncated: boolean;
      bytes: number;
      disclaimer: string;
    }
  | {
      ok: false;
      error: string;
      status?: number;
      path?: string;
    };

export const FMP_DATA_DISCLAIMER =
  "Informational only; not investment advice. Past performance does not guarantee future results. trefolio is not a financial advisor.";

/** Normalize and validate a relative FMP stable path (no scheme, query, or traversal). */
export function sanitizeFmpStablePath(raw: string): SanitizeFmpPathResult {
  if (typeof raw !== "string" || !raw.trim()) {
    return { ok: false, error: "path is required" };
  }
  let path = raw.trim();
  if (path.includes("://") || path.includes("\\") || path.includes("?") || path.includes("#")) {
    return { ok: false, error: "path must be a relative stable endpoint (no URL, query, or fragment)" };
  }
  if (path.includes("..")) {
    return { ok: false, error: "path must not contain '..'" };
  }
  path = path.replace(/^\/+/, "").replace(/\/+$/, "");
  if (!path || path.length > FMP_PROXY_MAX_PATH_LEN) {
    return { ok: false, error: `path must be 1–${FMP_PROXY_MAX_PATH_LEN} characters` };
  }
  const segments = path.split("/");
  if (segments.some((s) => !s || !PATH_SEGMENT_RE.test(s))) {
    return {
      ok: false,
      error: "path segments may only contain letters, digits, underscore, and hyphen",
    };
  }
  return { ok: true, path: segments.join("/") };
}

/** Copy query params; strip apikey; coerce values to short strings. */
export function sanitizeFmpParams(raw: unknown): SanitizeFmpParamsResult {
  if (raw == null) return { ok: true, params: {} };
  if (typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: "params must be an object of string values" };
  }
  const entries = Object.entries(raw as Record<string, unknown>);
  if (entries.length > FMP_PROXY_MAX_PARAMS) {
    return { ok: false, error: `params may have at most ${FMP_PROXY_MAX_PARAMS} keys` };
  }
  const params: Record<string, string> = {};
  for (const [key, value] of entries) {
    if (!key || key.toLowerCase() === "apikey") continue;
    if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") {
      return { ok: false, error: `param "${key}" must be a string, number, or boolean` };
    }
    const str = String(value);
    if (str.length > FMP_PROXY_MAX_PARAM_VALUE_LEN) {
      return {
        ok: false,
        error: `param "${key}" exceeds ${FMP_PROXY_MAX_PARAM_VALUE_LEN} characters`,
      };
    }
    params[key] = str;
  }
  return { ok: true, params };
}

export function clampFmpLimitBytes(limitBytes?: number): number {
  if (limitBytes == null || !Number.isFinite(limitBytes)) return FMP_PROXY_DEFAULT_LIMIT_BYTES;
  const n = Math.floor(limitBytes);
  if (n < 1_024) return 1_024;
  if (n > FMP_PROXY_MAX_LIMIT_BYTES) return FMP_PROXY_MAX_LIMIT_BYTES;
  return n;
}

/**
 * GET `https://financialmodelingprep.com/stable/{path}` with server-side API key.
 * Never forwards a client `apikey`.
 */
export async function fmpStableGet(input: {
  path: string;
  params?: Record<string, string>;
  limitBytes?: number;
}): Promise<FmpStableGetResult> {
  const pathResult = sanitizeFmpStablePath(input.path);
  if (!pathResult.ok) return { ok: false, error: pathResult.error };

  const paramsResult = sanitizeFmpParams(input.params ?? {});
  if (!paramsResult.ok) return { ok: false, error: paramsResult.error };

  const apiKey = getGlobalFmpApiKey();
  if (!apiKey) return { ok: false, error: "FMP_API_KEY is not configured" };

  const limitBytes = clampFmpLimitBytes(input.limitBytes);
  const url = new URL(`${FMP_STABLE_BASE}/${pathResult.path}`);
  url.searchParams.set("apikey", apiKey);
  for (const [k, v] of Object.entries(paramsResult.params)) {
    url.searchParams.set(k, v);
  }

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      method: "GET",
      signal: AbortSignal.timeout(FMP_PROXY_TIMEOUT_MS),
      headers: { Accept: "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "FMP request failed";
    return { ok: false, error: message, path: pathResult.path };
  }

  const text = await res.text();
  if (text.includes("Restricted Endpoint")) {
    return {
      ok: false,
      error: `FMP endpoint "${pathResult.path}" requires a higher FMP plan (Restricted Endpoint)`,
      status: res.status,
      path: pathResult.path,
    };
  }
  if (!res.ok) {
    return {
      ok: false,
      error: `FMP request failed: ${res.status} ${res.statusText}: ${text.slice(0, 200)}`,
      status: res.status,
      path: pathResult.path,
    };
  }

  const bytes = new TextEncoder().encode(text).length;
  if (bytes > limitBytes) {
    return {
      ok: true,
      status: res.status,
      path: pathResult.path,
      data: {
        preview: text.slice(0, limitBytes),
        message: `Response exceeded limitBytes (${limitBytes}); returning preview only. Retry with a narrower query or higher limitBytes (max ${FMP_PROXY_MAX_LIMIT_BYTES}).`,
      },
      truncated: true,
      bytes,
      disclaimer: FMP_DATA_DISCLAIMER,
    };
  }

  let data: unknown;
  try {
    data = text.length === 0 ? null : JSON.parse(text);
  } catch {
    return {
      ok: false,
      error: `FMP endpoint "${pathResult.path}" returned non-JSON`,
      status: res.status,
      path: pathResult.path,
    };
  }

  if (data && typeof data === "object" && !Array.isArray(data)) {
    const errMsg = (data as Record<string, unknown>)["Error Message"];
    if (typeof errMsg === "string" && errMsg.length > 0) {
      return {
        ok: false,
        error: `FMP ${pathResult.path}: ${errMsg}`,
        status: res.status,
        path: pathResult.path,
      };
    }
  }

  return {
    ok: true,
    status: res.status,
    path: pathResult.path,
    data,
    truncated: false,
    bytes,
    disclaimer: FMP_DATA_DISCLAIMER,
  };
}
