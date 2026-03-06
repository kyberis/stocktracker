import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { listTransactions, addTransaction, deleteTransaction, rebuildHoldings, listHoldings, findUserById, listTransactionSourceRefs } from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";
import { transactionsOpsTotal } from "@/lib/metrics";
import { parseBody } from "@/lib/api-response";
import { createTransactionSchema } from "@/lib/schemas";
import { PLATFORM_LIMITS } from "@/lib/platform-config";
import { YahooProvider } from "@/lib/api-providers/yahoo";

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

  const result = await parseBody(req, createTransactionSchema);
  if (!result.success) return result.error;

  const user = await findUserById(session.userId);
  if ((user?.plan || session.plan) !== "pro" && result.data.type === "buy") {
    const currentHoldings = await listHoldings(session.userId);
    const alreadyOwned = currentHoldings.some(
      (h) => h.ticker === result.data.ticker && h.exchange === (result.data.exchange || "")
    );
    if (!alreadyOwned && currentHoldings.length >= PLATFORM_LIMITS.FREE_HOLDINGS_LIMIT) {
      return NextResponse.json(
        {
          error: "Free plan limit: 15 holdings",
          reason: "holdings_limit_reached",
          limit: PLATFORM_LIMITS.FREE_HOLDINGS_LIMIT,
          current: currentHoldings.length,
        },
        { status: 403 }
      );
    }
  }

  const txData = { ...result.data };
  if (!txData.exchangeRateEur && txData.currency && txData.currency !== "EUR") {
    try {
      const rate = await new YahooProvider().getExchangeRate("EUR", txData.currency);
      if (rate > 0) txData.exchangeRateEur = rate;
    } catch { /* non-critical — performance calc falls back to current rates */ }
  }

  if (txData.sourceRef) {
    const existingRefs = await listTransactionSourceRefs(session.userId);
    if (existingRefs.has(txData.sourceRef)) {
      return NextResponse.json({ skipped: true, reason: "duplicate_source_ref" }, { status: 200 });
    }
  }
  const created = await addTransaction(session.userId, txData);
  transactionsOpsTotal.inc({ operation: "add" });
  return NextResponse.json(created, { status: 201 });
});

export const DELETE = withMetrics("/api/transactions", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });

  const deleted = await deleteTransaction(session.userId, id);
  if (!deleted) return NextResponse.json({ error: "Not found." }, { status: 404 });
  await rebuildHoldings(session.userId);
  transactionsOpsTotal.inc({ operation: "delete" });
  return NextResponse.json({ ok: true });
});
