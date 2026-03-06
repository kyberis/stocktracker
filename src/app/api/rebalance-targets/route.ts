import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { listRebalanceTargets, setRebalanceTarget, deleteRebalanceTarget } from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";
import { parseBody } from "@/lib/api-response";
import { rebalanceTargetSchema } from "@/lib/schemas";

export const GET = withMetrics("/api/rebalance-targets", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;
  return NextResponse.json(await listRebalanceTargets(session.userId));
});

export const POST = withMetrics("/api/rebalance-targets", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  const result = await parseBody(req, rebalanceTargetSchema);
  if (!result.success) return result.error;
  const { label, targetPercent, category } = result.data;
  const target = await setRebalanceTarget(session.userId, { category, label, targetPercent });
  return NextResponse.json(target);
});

export const DELETE = withMetrics("/api/rebalance-targets", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });

  const deleted = await deleteRebalanceTarget(session.userId, id);
  if (!deleted) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
});
