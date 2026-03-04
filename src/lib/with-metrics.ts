import { httpRequestsTotal, httpRequestDuration } from "./metrics";
import { pushRequestMetric } from "./grafana-push";

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
    const method = req.method ?? "UNKNOWN";
    const start = performance.now();
    const end = httpRequestDuration.startTimer({ route, method });
    let statusCode = 500;
    try {
      const res = await handler(req, ctx);
      statusCode = res?.status ?? 200;
      return res;
    } catch (err) {
      statusCode = 500;
      throw err;
    } finally {
      end();
      httpRequestsTotal.inc({ route, method, status_code: String(statusCode) });
      const durationSeconds = (performance.now() - start) / 1000;
      pushRequestMetric(route, method, statusCode, durationSeconds);
    }
  };
}
