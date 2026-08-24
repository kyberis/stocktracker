/**
 * Extract an HTTP status from SnapTrade SDK / axios-style errors, or from
 * message text like "Request failed with status code 404".
 */
export function extractSnapTradeHttpStatus(err: unknown): number | undefined {
  if (err && typeof err === "object") {
    const e = err as {
      status?: number;
      statusCode?: number;
      response?: { status?: number };
      cause?: unknown;
    };
    if (typeof e.statusCode === "number") return e.statusCode;
    if (typeof e.status === "number") return e.status;
    if (typeof e.response?.status === "number") return e.response.status;
    if (e.cause) {
      const nested = extractSnapTradeHttpStatus(e.cause);
      if (nested !== undefined) return nested;
    }
  }
  const msg = err instanceof Error ? err.message : String(err);
  const m = msg.match(/status code\s+(\d{3})/i);
  if (m) return Number(m[1]);
  return undefined;
}

/** True when SnapTrade reports the resource is already gone (idempotent delete). */
export function isSnapTradeNotFound(err: unknown): boolean {
  return extractSnapTradeHttpStatus(err) === 404;
}
