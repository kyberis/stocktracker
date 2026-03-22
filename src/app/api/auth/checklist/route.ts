import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { withMetrics } from "@/lib/with-metrics";
import {
  getChecklistState,
  completeChecklistStep,
  dismissChecklist,
  autoDetectCompletedSteps,
  ALL_CHECKLIST_STEPS,
  type ChecklistStep,
} from "@/lib/db";

export const GET = withMetrics("/api/auth/checklist", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error!;

  await autoDetectCompletedSteps(session.userId);
  const state = await getChecklistState(session.userId);
  return NextResponse.json(state);
});

export const POST = withMetrics("/api/auth/checklist", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error!;

  const body = await req.json();

  if (body.dismiss === true) {
    await dismissChecklist(session.userId);
    return NextResponse.json({ ok: true });
  }

  const step = body.step as string;
  if (!step || !ALL_CHECKLIST_STEPS.includes(step as ChecklistStep)) {
    return NextResponse.json({ error: "Invalid step" }, { status: 400 });
  }

  await completeChecklistStep(session.userId, step as ChecklistStep);
  const state = await getChecklistState(session.userId);
  return NextResponse.json(state);
});
