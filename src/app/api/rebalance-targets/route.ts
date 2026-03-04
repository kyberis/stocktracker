import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { listRebalanceTargets, setRebalanceTarget, deleteRebalanceTarget } from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";

export const GET = withMetrics("/api/rebalance-targets", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;
  return NextResponse.json(await listRebalanceTargets(session.userId));
});

export const POST = withMetrics("/api/rebalance-targets", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  try {
    const body = await req.json();
    if (!body?.label || body?.targetPercent == null) {
      return NextResponse.json({ error: "label and targetPercent are required." }, { status: 400 });
    }
    const target = await setRebalanceTarget(session.userId, {
      category: body.category || "assetClass",
      label: body.label,
      targetPercent: body.targetPercent,
    });
    return NextResponse.json(target);
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
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
