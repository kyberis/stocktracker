import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { addCashEntry, listCashEntries, removeCashEntry, updateCashEntry, getManualAssetCount } from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";
import { parseBody } from "@/lib/api-response";
import { createCashSchema, updateCashSchema } from "@/lib/schemas";
import { canAccessFeature, getManualAssetLimit } from "@/lib/subscription";

export const GET = withMetrics("/api/cash", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  const portfolioId = req.nextUrl.searchParams.get("portfolioId") || undefined;
  const cash = await listCashEntries(session.userId, portfolioId);
  return NextResponse.json(cash);
});

export const POST = withMetrics("/api/cash", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  const portfolioId = req.nextUrl.searchParams.get("portfolioId") || undefined;
  const result = await parseBody(req, createCashSchema);
  if (!result.success) return result.error;
  const data = result.data;

  // Net-worth manual assets (savings/pension/real estate) require Trefolio (Pro).
  // Fixed-return investments are available on Free within the manual-asset soft cap.
  if (data.type && data.type !== "cash" && data.type !== "fixed_return") {
    const entitlement = canAccessFeature("net-worth", { plan: session.plan, aiCallsThisMonth: 0 });
    if (!entitlement.allowed) {
      return NextResponse.json({ error: "Upgrade to Trefolio to track net worth assets.", code: "upgrade_required" }, { status: 403 });
    }
  }
  if (data.type && data.type !== "cash") {
    const count = await getManualAssetCount(session.userId);
    const limit = getManualAssetLimit(session.plan);
    if (count >= limit) {
      return NextResponse.json({ error: `Manual asset limit reached (${count}/${limit}).`, code: "limit_reached", count, limit }, { status: 403 });
    }
  }

  const created = await addCashEntry(session.userId, {
    name: data.name,
    amountEUR: data.amountEUR,
    type: data.type ?? "cash",
    displayCurrency: data.displayCurrency ?? "EUR",
    displayAmount: data.displayAmount ?? data.amountEUR,
    notes: data.notes ?? "",
    valuationDate: data.valuationDate ?? "",
    startDate: data.startDate ?? "",
    termMonths: data.termMonths ?? 0,
    totalReturnPct: data.totalReturnPct ?? 0,
  }, portfolioId);
  return NextResponse.json(created, { status: 201 });
});

export const PUT = withMetrics("/api/cash", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  const result = await parseBody(req, updateCashSchema);
  if (!result.success) return result.error;
  const { id, updates } = result.data;
  const updated = await updateCashEntry(session.userId, id, updates);
  if (!updated) {
    return NextResponse.json({ error: "Cash entry not found." }, { status: 404 });
  }
  return NextResponse.json(updated);
});

export const DELETE = withMetrics("/api/cash", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id query param is required." }, { status: 400 });
  }

  const deleted = await removeCashEntry(session.userId, id);
  if (!deleted) {
    return NextResponse.json({ error: "Cash entry not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
});
