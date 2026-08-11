import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { addSpendEntry, listSpendEntries, getSpendSummaryByChannel } from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";

export const GET = withMetrics("/api/admin/channel-spend/entries", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const channel = req.nextUrl.searchParams.get("channel") || undefined;
  const [entries, summary] = await Promise.all([
    listSpendEntries(channel),
    getSpendSummaryByChannel(),
  ]);
  return NextResponse.json({ entries, summary });
});

export const POST = withMetrics("/api/admin/channel-spend/entries", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const body = await req.json().catch(() => null);
  const channel = String(body?.channel || "").trim().toLowerCase();
  const amountEur = Number(body?.amountEur);
  const spentOn = String(body?.spentOn || "").trim();
  const note = body?.note !== undefined ? String(body.note).slice(0, 500) : "";

  if (!channel || !Number.isFinite(amountEur) || amountEur <= 0 || !spentOn) {
    return NextResponse.json({ error: "channel, amountEur, spentOn are required" }, { status: 400 });
  }

  const entry = await addSpendEntry({ channel, amountEur, spentOn, note });
  return NextResponse.json({ ok: true, entry });
});
