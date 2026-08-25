import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withMetrics } from "@/lib/with-metrics";
import { getAppRouteParam } from "@/lib/api-route-params";
import {
  getSurveyInviteByToken,
  markSurveyInviteOpened,
  submitSurveyResponse,
} from "@/lib/db";

export const GET = withMetrics("/api/survey/[token]", async (req: NextRequest, ctx?: unknown) => {
  const token = getAppRouteParam(req, ctx, "token");
  const invite = await getSurveyInviteByToken(token);
  if (!invite) return NextResponse.json({ error: "Survey not found" }, { status: 404 });
  if (invite.campaignStatus === "cancelled") {
    return NextResponse.json({ error: "Survey cancelled" }, { status: 410 });
  }

  await markSurveyInviteOpened(token);

  let questions: unknown[] = [];
  try {
    questions = JSON.parse(invite.questionsJson);
  } catch {
    questions = [];
  }

  return NextResponse.json({
    title: invite.campaignTitle,
    templateId: invite.templateId,
    language: invite.language,
    completed: Boolean(invite.completedAt),
    questions,
  });
});

const submitSchema = z.object({
  answers: z.record(z.string(), z.unknown()),
  npsScore: z.number().int().min(0).max(10).optional().nullable(),
});

export const POST = withMetrics("/api/survey/[token]", async (req: NextRequest, ctx?: unknown) => {
  const token = getAppRouteParam(req, ctx, "token");
  const invite = await getSurveyInviteByToken(token);
  if (!invite) return NextResponse.json({ error: "Survey not found" }, { status: 404 });
  if (invite.campaignStatus === "cancelled") {
    return NextResponse.json({ error: "Survey cancelled" }, { status: 410 });
  }
  if (invite.completedAt) {
    return NextResponse.json({ error: "Already submitted" }, { status: 409 });
  }

  const body = await req.json().catch(() => null);
  const parsed = submitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
  }

  let npsScore = parsed.data.npsScore ?? null;
  if (npsScore == null) {
    try {
      const questions = JSON.parse(invite.questionsJson) as { id: string; type: string }[];
      const npsQ = questions.find((q) => q.type === "nps");
      if (npsQ && parsed.data.answers[npsQ.id] != null) {
        const n = Number(parsed.data.answers[npsQ.id]);
        if (Number.isFinite(n) && n >= 0 && n <= 10) npsScore = Math.round(n);
      }
    } catch {
      // ignore
    }
  }

  try {
    await submitSurveyResponse({
      inviteId: invite.id,
      userId: invite.userId,
      answers: parsed.data.answers,
      npsScore,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "ALREADY_SUBMITTED") {
      return NextResponse.json({ error: "Already submitted" }, { status: 409 });
    }
    throw err;
  }

  return NextResponse.json({ ok: true });
});
