export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import {
  findUserByWidgetToken,
  findUserByDevicePasskey,
  isFeatureEnabled,
  listUnreadDeviceNotifications,
  markDeviceNotificationsRead,
} from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";
import { json401 } from "@/lib/log-unauthorized";

async function resolveUser(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const token = auth.slice(7);
  return await findUserByWidgetToken(token) ?? await findUserByDevicePasskey(token);
}

export const GET = withMetrics("/api/device/notifications", async (req: NextRequest) => {
  if (!(await isFeatureEnabled("device_enabled"))) {
    return Response.json({ error: "Device features are not enabled" }, { status: 404 });
  }

  const user = await resolveUser(req);
  if (!user) {
    return json401(req, {
      source: "api/device/notifications",
      reason: "device_bearer_auth_failed",
      tags: { httpMethod: "GET", hasBearer: Boolean(req.headers.get("authorization")?.startsWith("Bearer ")) },
    });
  }

  const notifications = await listUnreadDeviceNotifications(user.id);
  return Response.json({ notifications }, {
    headers: { "Cache-Control": "private, no-cache" },
  });
});

export const POST = withMetrics("/api/device/notifications", async (req: NextRequest) => {
  if (!(await isFeatureEnabled("device_enabled"))) {
    return Response.json({ error: "Device features are not enabled" }, { status: 404 });
  }

  const user = await resolveUser(req);
  if (!user) {
    return json401(req, {
      source: "api/device/notifications",
      reason: "device_bearer_auth_failed",
      tags: { httpMethod: "POST", hasBearer: Boolean(req.headers.get("authorization")?.startsWith("Bearer ")) },
    });
  }

  let ids: string[] | undefined;
  try {
    const body = await req.json();
    if (Array.isArray(body.ids)) ids = body.ids;
  } catch { /* mark all as read */ }

  const count = await markDeviceNotificationsRead(user.id, ids);
  return Response.json({ ok: true, marked: count });
});
