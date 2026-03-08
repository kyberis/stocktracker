export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import {
  findUserByWidgetToken,
  findUserByDevicePasskey,
  isFeatureEnabled,
} from "@/lib/db";
import { checkDeviceAuthRateLimit, getClientIp } from "@/lib/rate-limit";
import { deviceApiCalls } from "@/lib/metrics";
import { YahooProvider } from "@/lib/api-providers/yahoo";
import { withMetrics } from "@/lib/with-metrics";

async function resolveUser(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;

  const ip = getClientIp(req);
  const rl = await checkDeviceAuthRateLimit(ip);
  if (!rl.allowed) return null;

  const token = auth.slice(7);
  return (
    (await findUserByWidgetToken(token)) ??
    (await findUserByDevicePasskey(token))
  );
}

export const GET = withMetrics("/api/device/sparkline", async (req: NextRequest) => {
  if (!(await isFeatureEnabled("device_enabled"))) {
    return Response.json({ error: "Device features are not enabled" }, { status: 404 });
  }

  const fwVersion = req.headers.get("x-firmware-version");
  if (fwVersion) deviceApiCalls.inc({ fw_version: fwVersion, route: "/api/device/sparkline", status: "attempt" });

  const user = await resolveUser(req);
  if (!user) {
    if (fwVersion) deviceApiCalls.inc({ fw_version: fwVersion, route: "/api/device/sparkline", status: "auth_failed" });
    return Response.json({ error: "Unauthorized" }, { status: 401 });
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
