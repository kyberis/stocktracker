import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { createDecisionMemo, listDecisionMemos } from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";

const VALID_DECISIONS = new Set(["scale", "iterate", "stop"]);

export const GET = withMetrics("/api/admin/acquisition-memos", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const memos = await listDecisionMemos();
  return NextResponse.json({ memos });
});

export const POST = withMetrics("/api/admin/acquisition-memos", async (req: NextRequest) => {
  const { session, error } = await requireAdmin(req);
  if (error) return error;

  const body = await req.json().catch(() => null);
  const periodStart = String(body?.periodStart || "").trim();
  const periodEnd = String(body?.periodEnd || "").trim();
  const decision = String(body?.decision || "").trim();
  const notes = body?.notes !== undefined ? String(body.notes).slice(0, 4000) : "";
  const nextCycleKpiTargets = body?.nextCycleKpiTargets !== undefined
    ? String(body.nextCycleKpiTargets).slice(0, 2000)
    : "";
  const budgetReallocation = body?.budgetReallocation !== undefined
    ? String(body.budgetReallocation).slice(0, 2000)
    : "";

  if (!periodStart || !periodEnd || !VALID_DECISIONS.has(decision)) {
    return NextResponse.json(
      { error: "periodStart, periodEnd, and decision (scale|iterate|stop) are required" },
      { status: 400 }
    );
  }

  const memo = await createDecisionMemo({
    periodStart,
    periodEnd,
    decision: decision as "scale" | "iterate" | "stop",
    notes,
    nextCycleKpiTargets,
    budgetReallocation,
    createdBy: session!.userId,
  });
  return NextResponse.json({ ok: true, memo });
});
