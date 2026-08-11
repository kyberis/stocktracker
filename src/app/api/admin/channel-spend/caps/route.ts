import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { createSpendCap, listSpendCaps } from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";

export const GET = withMetrics("/api/admin/channel-spend/caps", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const caps = await listSpendCaps();
  return NextResponse.json({ caps });
});

export const POST = withMetrics("/api/admin/channel-spend/caps", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const body = await req.json().catch(() => null);
  const channel = String(body?.channel || "").trim().toLowerCase();
  const capAmountEur = Number(body?.capAmountEur);
  const periodStart = String(body?.periodStart || "").trim();
  const periodEnd = String(body?.periodEnd || "").trim();

  if (!channel || !Number.isFinite(capAmountEur) || capAmountEur <= 0 || !periodStart || !periodEnd) {
    return NextResponse.json({ error: "channel, capAmountEur, periodStart, periodEnd are required" }, { status: 400 });
  }

  const cap = await createSpendCap({ channel, capAmountEur, periodStart, periodEnd });
  return NextResponse.json({ ok: true, cap });
});
