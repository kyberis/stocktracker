import { httpRequestsTotal, httpRequestDuration } from "./metrics";
import { pushRequestMetric } from "./grafana-push";
import { normalizeApiRoute } from "./traffic/normalize";
import { resolveTrafficSource } from "./traffic/resolve-source";
import { runWithTrafficApiGroupAsync } from "./traffic/request-context";
import { trackTrafficEdge } from "./traffic/track";

type RouteHandler<T extends Request = Request> = (
  req: T,
  ctx?: unknown
) => Promise<Response>;

/**
 * Wraps a Next.js App Router handler to record HTTP request count and duration.
 * Also pushes metrics to Grafana Cloud when configured (fire-and-forget).
 */
export function withMetrics<T extends Request>(
  route: string,
  handler: RouteHandler<T>
): RouteHandler<T> {
  return async (req: T, ctx?: unknown) => {
    const apiGroup = normalizeApiRoute(route);
    return runWithTrafficApiGroupAsync(apiGroup, async () => {
      const method = req.method ?? "UNKNOWN";
      const start = performance.now();
      const end = httpRequestDuration.startTimer({ route, method });
      let statusCode = 500;
      try {
        const res = await handler(req, ctx);
        statusCode = res?.status ?? 200;

        if (statusCode >= 500) {
          try {
            const body = await res.clone().json();
            const msg = body?.error || body?.message || "Unknown error";
            console.error(`[${route}] ${method} ${statusCode}: ${msg}`);
          } catch {
            console.error(`[${route}] ${method} ${statusCode}`);
          }
        } else if (statusCode >= 400) {
          try {
            const body = await res.clone().json();
            const msg = body?.error || body?.message || "Client error";
            console.warn(`[${route}] ${method} ${statusCode}: ${msg}`);
          } catch {
            console.warn(`[${route}] ${method} ${statusCode}`);
          }
        }

        return res;
      } catch (err) {
        statusCode = 500;
        console.error(`[${route}] ${method} unhandled:`, err instanceof Error ? err.message : err);
        throw err;
      } finally {
        end();
        httpRequestsTotal.inc({ route, method, status_code: String(statusCode) });
        const durationSeconds = (performance.now() - start) / 1000;
        pushRequestMetric(route, method, statusCode, durationSeconds);

        const source = resolveTrafficSource(req);
        trackTrafficEdge("source_api", source, apiGroup);
      }
    });
  };
}
