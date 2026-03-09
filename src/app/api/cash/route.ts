import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { addCashEntry, listCashEntries, removeCashEntry, updateCashEntry } from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";
import { parseBody } from "@/lib/api-response";
import { createCashSchema, updateCashSchema } from "@/lib/schemas";

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
  const { name, amountEUR } = result.data;
  const created = await addCashEntry(session.userId, { name, amountEUR }, portfolioId);
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
