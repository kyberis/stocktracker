import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { listTransactions, addTransaction, deleteTransaction } from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";
import { transactionsOpsTotal } from "@/lib/metrics";

export const GET = withMetrics("/api/transactions", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  const holdingId = req.nextUrl.searchParams.get("holdingId") || undefined;
  const txs = await listTransactions(session.userId, holdingId);
  transactionsOpsTotal.inc({ operation: "list" });
  return NextResponse.json(txs);
});

export const POST = withMetrics("/api/transactions", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  try {
    const body = await req.json();
    if (!body?.ticker || !body?.type || !body?.date) {
      return NextResponse.json({ error: "ticker, type, and date are required." }, { status: 400 });
    }
    const created = await addTransaction(session.userId, body);
    transactionsOpsTotal.inc({ operation: "add" });
    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
});

export const DELETE = withMetrics("/api/transactions", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });

  const deleted = await deleteTransaction(session.userId, id);
  if (!deleted) return NextResponse.json({ error: "Not found." }, { status: 404 });
  transactionsOpsTotal.inc({ operation: "delete" });
  return NextResponse.json({ ok: true });
});
