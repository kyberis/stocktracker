import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { listNotifications, countUnreadNotifications, markNotificationsRead } from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";

export const GET = withMetrics("/api/notifications", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error) return error;

  const url = new URL(req.url);
  const unreadOnly = url.searchParams.get("unreadOnly") === "true";
  const limit = Math.min(Number(url.searchParams.get("limit") || "50"), 100);
  const countOnly = url.searchParams.get("countOnly") === "true";

  if (countOnly) {
    const count = await countUnreadNotifications(session!.userId);
    return NextResponse.json({ count });
  }

  const notifications = await listNotifications(session!.userId, { limit, unreadOnly });
  const unreadCount = await countUnreadNotifications(session!.userId);
  return NextResponse.json({ notifications, unreadCount });
});

export const PUT = withMetrics("/api/notifications", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const ids = Array.isArray(body.ids) ? body.ids.filter((id: unknown) => typeof id === "string") : undefined;
  const updated = await markNotificationsRead(session!.userId, ids);
  return NextResponse.json({ updated });
});
