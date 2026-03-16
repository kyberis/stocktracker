import { NextRequest, NextResponse } from "next/server";
import { requireSession, requireAdmin } from "@/lib/auth/guards";
import { createFeedback, getFeedbackByUser, getAllFeedback, getAllFeedbackPaginated, replyToFeedback } from "@/lib/db";
import { parseBody } from "@/lib/api-response";
import { createFeedbackSchema, replyFeedbackSchema } from "@/lib/schemas";
import { withMetrics } from "@/lib/with-metrics";

export const GET = withMetrics("/api/feedback", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  if (session.role === "admin") {
    const pageParam = req.nextUrl.searchParams.get("page");
    if (pageParam !== null) {
      const page = Math.max(0, parseInt(pageParam, 10) || 0);
      const pageSize = Math.min(100, Math.max(1, parseInt(req.nextUrl.searchParams.get("pageSize") || "25", 10)));
      const result = await getAllFeedbackPaginated(page, pageSize);
      return NextResponse.json(result);
    }
    return NextResponse.json(await getAllFeedback());
  }

  return NextResponse.json(await getFeedbackByUser(session.userId));
});

export const POST = withMetrics("/api/feedback", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  const result = await parseBody(req, createFeedbackSchema);
  if (!result.success) return result.error;
  const { subject, message, type, userContext } = result.data;

  let enrichedContext = userContext;
  if (type === "bug" && userContext) {
    try {
      const parsed = JSON.parse(userContext);
      parsed.email = session.email;
      parsed.plan = session.plan;
      parsed.userId = session.userId;
      parsed.username = session.username;
      enrichedContext = JSON.stringify(parsed);
    } catch {
      enrichedContext = userContext;
    }
  }

  const entry = await createFeedback(session.userId, subject, message, type, enrichedContext);
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
