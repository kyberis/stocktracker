import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth/guards";
import {
  createRefundRequest,
  getActiveRefundRequestForUser,
  findUserById,
  getUserSettings,
} from "@/lib/db";
import { effectivePlan } from "@/lib/subscription";
import { sendRefundRequestReceivedEmail } from "@/lib/refund-request-email";
import { withMetrics } from "@/lib/with-metrics";

const requestSchema = z.object({
  reason: z.string().trim().min(10).max(800),
});

export const GET = withMetrics("/api/refund-requests", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error!;

  const pending = await getActiveRefundRequestForUser(session.userId);
  return NextResponse.json({ pending: pending || null });
});

export const POST = withMetrics("/api/refund-requests", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error!;

  const user = await findUserById(session.userId);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const plan = effectivePlan(user.plan as "free" | "starter" | "pro", user.plan_expires_at);
  if (plan === "free") {
    return NextResponse.json({ error: "Refund requests are only available for paid plans" }, { status: 403 });
  }

  const existing = await getActiveRefundRequestForUser(session.userId);
  if (existing) {
    return NextResponse.json({ error: "You already have a pending refund request", existingId: existing.id }, { status: 409 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please provide a reason (10–800 characters)" }, { status: 400 });
  }

  const created = await createRefundRequest({
    userId: session.userId,
    reason: parsed.data.reason,
  });

  const settings = await getUserSettings(session.userId);

  if (user.email) {
    sendRefundRequestReceivedEmail({
      userId: session.userId,
      email: user.email,
      displayName: user.display_name || user.username,
      language: settings.language || "en",
      requestId: created.id,
    }).catch((err) => {
      console.error("Failed to send refund request confirmation email:", err);
    });
  }

  return NextResponse.json({ ok: true, requestId: created.id });
});
