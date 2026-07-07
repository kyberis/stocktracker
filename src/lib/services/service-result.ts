/** Shared result type for MCP-facing domain services. */
export type ServiceErrorCode =
  | "quota_exceeded"
  | "invalid_input"
  | "user_not_found"
  | "not_found"
  | "rate_limited"
  | "not_configured";

export type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code: ServiceErrorCode };

export function serviceErr(
  error: string,
  code: ServiceErrorCode,
): { ok: false; error: string; code: ServiceErrorCode } {
  return { ok: false, error, code };
}
