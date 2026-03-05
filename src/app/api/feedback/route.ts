import { NextRequest, NextResponse } from "next/server";
import { requireSession, requireAdmin } from "@/lib/auth/guards";
import { createFeedback, getFeedbackByUser, getAllFeedback, replyToFeedback } from "@/lib/db";
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

  try {
    const body = await req.json();
    const subject = (body?.subject || "").trim();
    const message = (body?.message || "").trim();

    if (!subject || !message) {
      return NextResponse.json(
        { error: "Subject and message are required." },
        { status: 400 }
      );
    }

    const entry = await createFeedback(session.userId, subject, message);
    return NextResponse.json(entry, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
});

export const PUT = withMetrics("/api/feedback", async (req: NextRequest) => {
  const { session, error } = await requireAdmin(req);
  if (error || !session) return error;

  try {
    const body = await req.json();
    const id = body?.id;
    const reply = (body?.reply ?? "").trim();
    const status = body?.status;

    if (!id) {
      return NextResponse.json({ error: "id is required." }, { status: 400 });
    }
    if (!["open", "answered", "closed"].includes(status)) {
      return NextResponse.json(
        { error: "status must be open, answered, or closed." },
        { status: 400 }
      );
    }

    const updated = await replyToFeedback(id, reply, status);
    if (!updated) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
});
