import type { NextRequest } from "next/server";

/**
 * Reads a dynamic `[param]` segment for App Router route handlers.
 * During static analysis / `next build`, `context.params` may be missing; we fall back to the URL.
 */
export function getAppRouteParam(
  req: NextRequest,
  context: unknown,
  key: string
): string {
  const params =
    context && typeof context === "object" && context !== null && "params" in context
      ? (context as { params?: Record<string, string | string[]> }).params
      : undefined;
  const v = params?.[key];
  const fromContext = Array.isArray(v) ? v[0] : v;
  if (fromContext) return fromContext;
  const segments = req.nextUrl.pathname.split("/").filter(Boolean);
  return segments[segments.length - 1] ?? "";
}
