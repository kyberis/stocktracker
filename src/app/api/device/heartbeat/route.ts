export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { findUserByWidgetToken, findUserByDevicePasskey, isFeatureEnabled } from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";
import { deviceHeartbeats, deviceErrors } from "@/lib/metrics";

async function resolveUser(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const token = auth.slice(7);
  return await findUserByWidgetToken(token) ?? await findUserByDevicePasskey(token);
}

export const POST = withMetrics("/api/device/heartbeat", async (req: NextRequest) => {
  if (!(await isFeatureEnabled("device_enabled"))) {
    return Response.json({ error: "Device features are not enabled" }, { status: 404 });
  }

  const user = await resolveUser(req);
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const fwVersion = req.headers.get("x-firmware-version") ?? "unknown";

  let body: { status?: string; errors?: { type: string; message?: string }[]; uptimeSeconds?: number };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const status = body.status ?? "ok";
  deviceHeartbeats.inc({ fw_version: fwVersion, status });

  if (body.errors && Array.isArray(body.errors)) {
    for (const err of body.errors) {
      if (err.type) {
        deviceErrors.inc({ fw_version: fwVersion, error_type: err.type });
      }
    }
  }

  return Response.json({ ok: true });
});
