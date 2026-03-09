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
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

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
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let ids: string[] | undefined;
  try {
    const body = await req.json();
    if (Array.isArray(body.ids)) ids = body.ids;
  } catch { /* mark all as read */ }

  const count = await markDeviceNotificationsRead(user.id, ids);
  return Response.json({ ok: true, marked: count });
});
