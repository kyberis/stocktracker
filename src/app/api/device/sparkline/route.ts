export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { isFeatureEnabled } from "@/lib/db";
import { YahooProvider } from "@/lib/api-providers/yahoo";
import { withMetrics } from "@/lib/with-metrics";
import { deviceApiCalls } from "@/lib/metrics";
import { json401 } from "@/lib/log-unauthorized";
import {
  authenticateDeviceBearer,
  deviceBearerRateLimitResponse,
} from "@/lib/device-bearer-auth";

export const GET = withMetrics("/api/device/sparkline", async (req: NextRequest) => {
  if (!(await isFeatureEnabled("device_enabled"))) {
    return Response.json({ error: "Device features are not enabled" }, { status: 404 });
  }

  const fwVersion = req.headers.get("x-firmware-version");
  if (fwVersion) deviceApiCalls.inc({ fw_version: fwVersion, route: "/api/device/sparkline", status: "attempt" });

  const auth = await authenticateDeviceBearer(req);
  if (auth.status === "rate_limited") {
    if (fwVersion) deviceApiCalls.inc({ fw_version: fwVersion, route: "/api/device/sparkline", status: "rate_limited" });
    return deviceBearerRateLimitResponse(auth.retryAfterSec);
  }
  if (auth.status !== "ok") {
    if (fwVersion) deviceApiCalls.inc({ fw_version: fwVersion, route: "/api/device/sparkline", status: "auth_failed" });
    return json401(req, {
      source: "api/device/sparkline",
      reason: "device_bearer_auth_failed",
      tags: { hasBearer: Boolean(req.headers.get("authorization")?.startsWith("Bearer ")) },
    });
  }

  const ticker = req.nextUrl.searchParams.get("ticker");
  if (!ticker || ticker.length > 20) {
    return Response.json({ error: "Missing or invalid ticker" }, { status: 400 });
  }

  const yahoo = new YahooProvider();
  const history = await yahoo.getHistorical(ticker, "1m");

  const sampled = samplePoints(history.map((p) => ({ date: p.date, close: p.close })), 20);

  if (fwVersion) deviceApiCalls.inc({ fw_version: fwVersion, route: "/api/device/sparkline", status: "ok" });

  return Response.json(
    { ticker, points: sampled },
    { headers: { "Cache-Control": "private, max-age=300" } },
  );
});

function samplePoints(
  points: { date: string; close: number }[],
  maxPoints: number,
): { date: string; close: number }[] {
  if (points.length <= maxPoints) return points;
  const step = (points.length - 1) / (maxPoints - 1);
  const result: { date: string; close: number }[] = [];
  for (let i = 0; i < maxPoints; i++) {
    result.push(points[Math.round(i * step)]);
  }
  return result;
}
