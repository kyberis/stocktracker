import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { checkEligibility, createOrUpdateDraft, submitSurvey, dismissSurvey } from "@/lib/db";
import { parseBody } from "@/lib/api-response";
import { satisfactionDraftSchema } from "@/lib/schemas";
import { withMetrics } from "@/lib/with-metrics";

export const GET = withMetrics("/api/satisfaction", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  const result = await checkEligibility(session.userId);
  return NextResponse.json(result);
});

export const POST = withMetrics("/api/satisfaction", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  const result = await parseBody(req, satisfactionDraftSchema);
  if (!result.success) return result.error;
  const { rating, comment } = result.data;

  const draft = await createOrUpdateDraft(session.userId, rating, comment);
  return NextResponse.json(draft, { status: 201 });
});

export const PUT = withMetrics("/api/satisfaction", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  let body: { action?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (body.action === "dismiss") {
    await dismissSurvey(session.userId);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "submit") {
    const survey = await submitSurvey(session.userId);
    if (!survey) {
      return NextResponse.json({ error: "No draft to submit" }, { status: 404 });
    }
    return NextResponse.json(survey);
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
});
