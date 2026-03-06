import { NextRequest, NextResponse } from "next/server";
import { requireSession, requireAdmin } from "@/lib/auth/guards";
import { createFeedback, getFeedbackByUser, getAllFeedback, replyToFeedback } from "@/lib/db";
import { parseBody } from "@/lib/api-response";
import { createFeedbackSchema, replyFeedbackSchema } from "@/lib/schemas";
import { withMetrics } from "@/lib/with-metrics";

export const GET = withMetrics("/api/feedback", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  const items =
    session.role === "admin"
      ? await getAllFeedback()
      : await getFeedbackByUser(session.userId);

  return NextResponse.json(items);
});

export const POST = withMetrics("/api/feedback", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  const result = await parseBody(req, createFeedbackSchema);
  if (!result.success) return result.error;
  const { subject, message } = result.data;

  const entry = await createFeedback(session.userId, subject, message);
  return NextResponse.json(entry, { status: 201 });
});

export const PUT = withMetrics("/api/feedback", async (req: NextRequest) => {
  const { session, error } = await requireAdmin(req);
  if (error || !session) return error;

  const result = await parseBody(req, replyFeedbackSchema);
  if (!result.success) return result.error;
  const { id, reply, status } = result.data;

  const updated = await replyToFeedback(id, reply, status);
  if (!updated) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
});
