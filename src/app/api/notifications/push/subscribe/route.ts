import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { findUserById, savePushSubscription, deletePushSubscription } from "@/lib/db";
import { canAccessFeature } from "@/lib/subscription";
import { z } from "zod";
import { parseBody } from "@/lib/api-response";

const subscribeSchema = z.object({
  endpoint: z.string().url("Invalid endpoint"),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

const unsubscribeSchema = z.object({
  endpoint: z.string().url("Invalid endpoint"),
});

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  const user = await findUserById(session.userId);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const access = canAccessFeature("alerts-push", {
    plan: user.plan,
    aiCallsThisMonth: user.ai_calls_this_month,
  });
  if (!access.allowed) {
    return NextResponse.json({ error: "Push notifications require Starter or Pro plan" }, { status: 403 });
  }

  const result = await parseBody(req, subscribeSchema);
  if (!result.success) return result.error;

  const sub = await savePushSubscription(session.userId, {
    endpoint: result.data.endpoint,
    p256dh: result.data.keys.p256dh,
    auth: result.data.keys.auth,
    userAgent: req.headers.get("user-agent") || "",
  });

  return NextResponse.json({ ok: true, id: sub.id }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  const result = await parseBody(req, unsubscribeSchema);
  if (!result.success) return result.error;

  const deleted = await deletePushSubscription(session.userId, result.data.endpoint);
  return NextResponse.json({ ok: deleted });
}
