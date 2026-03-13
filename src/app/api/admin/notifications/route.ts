import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { broadcastNotification, listBroadcastHistory } from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";
import type { NotificationType, SubscriptionPlan } from "@/lib/types";

const VALID_TYPES: NotificationType[] = ["admin", "info"];
const VALID_PLANS: SubscriptionPlan[] = ["free", "starter", "pro"];

export const POST = withMetrics("/api/admin/notifications", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const body = await req.json().catch(() => null);
  if (!body || !body.title || !body.message) {
    return NextResponse.json({ error: "title and message are required" }, { status: 400 });
  }

  const type = VALID_TYPES.includes(body.type) ? body.type : "admin";
  const targetPlan = body.targetPlan && VALID_PLANS.includes(body.targetPlan) ? body.targetPlan : undefined;

  const count = await broadcastNotification({
    type,
    title: body.title,
    titleEs: body.titleEs || "",
    message: body.message,
    messageEs: body.messageEs || "",
    link: body.link || "",
    linkLabel: body.linkLabel || "",
    linkLabelEs: body.linkLabelEs || "",
    targetPlan,
  });

  return NextResponse.json({ sent: count });
});

export const GET = withMetrics("/api/admin/notifications", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const history = await listBroadcastHistory(50);
  return NextResponse.json({ history });
});
