import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { listTransactions, addTransaction, updateTransaction, deleteTransaction, rebuildHoldings, listHoldings, findUserById } from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";
import { transactionsOpsTotal } from "@/lib/metrics";
import { parseBody } from "@/lib/api-response";
import { createTransactionSchema, updateTransactionSchema } from "@/lib/schemas";
import { getHoldingsLimit } from "@/lib/subscription";
import { YahooProvider } from "@/lib/api-providers/yahoo";
import { deferTask } from "@/lib/task-runner";
import { runIncrementalBackfill } from "@/lib/backfill-snapshots";

export const GET = withMetrics("/api/transactions", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  const holdingId = req.nextUrl.searchParams.get("holdingId") || undefined;
  const portfolioId = req.nextUrl.searchParams.get("portfolioId") || undefined;
  const source = req.nextUrl.searchParams.get("source") || undefined; // e.g. "snaptrade"
  const since = req.nextUrl.searchParams.get("since") || undefined;   // ISO timestamp
  let txs = await listTransactions(session.userId, holdingId, portfolioId);

  if (source === "snaptrade") {
    txs = txs.filter((tx) =>
      tx.notes?.toLowerCase().includes("snaptrade") ||
      tx.brokerName != null
    );
  }
  if (since) {
    const sinceMs = new Date(since).getTime();
    if (!isNaN(sinceMs)) {
      txs = txs.filter((tx) => tx.createdAt && new Date(tx.createdAt).getTime() >= sinceMs);
    }
  }

  transactionsOpsTotal.inc({ operation: "list" });
  return NextResponse.json(txs);
});

export const POST = withMetrics("/api/transactions", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  const portfolioId = req.nextUrl.searchParams.get("portfolioId") || undefined;
  const result = await parseBody(req, createTransactionSchema);
  if (!result.success) return result.error;

  const user = await findUserById(session.userId);
  const plan = (user?.plan || session.plan) ?? "free";
  const holdingsLimit = getHoldingsLimit(plan);
  if (holdingsLimit < Infinity && result.data.type === "buy") {
    const currentHoldings = await listHoldings(session.userId, portfolioId);
    const alreadyOwned = currentHoldings.some(
      (h) => h.ticker === result.data.ticker && h.exchange === (result.data.exchange || "")
    );
    if (!alreadyOwned && currentHoldings.length >= holdingsLimit) {
      return NextResponse.json(
        {
          error: `Plan limit: ${holdingsLimit} holdings`,
          reason: "holdings_limit_reached",
          limit: holdingsLimit,
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

  const created = await addTransaction(session.userId, txData, portfolioId);
  if (!created) {
    return NextResponse.json({ skipped: true, reason: "duplicate_source_ref" }, { status: 200 });
  }
  transactionsOpsTotal.inc({ operation: "add" });

  // When the transaction date is in the past, rebuild daily snapshots from
  // that date forward so the portfolio evolution chart reflects the real history.
  const txDate = (created.date || "").slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  if (txDate && txDate < today) {
    deferTask(async () => {
      try {
        await runIncrementalBackfill(session.userId, txDate);
      } catch (err) {
        console.warn("[transactions] incremental backfill failed:", err);
      }
    });
  }

  return NextResponse.json({ ...created, snapshotBackfillTriggered: txDate < today }, { status: 201 });
});

export const PATCH = withMetrics("/api/transactions", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  const result = await parseBody(req, updateTransactionSchema);
  if (!result.success) return result.error;

  const { id, updates } = result.data;
  const updated = await updateTransaction(session.userId, id, updates);
  if (!updated) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const portfolioId = req.nextUrl.searchParams.get("portfolioId") || undefined;
  await rebuildHoldings(session.userId, portfolioId);
  transactionsOpsTotal.inc({ operation: "update" });
  return NextResponse.json({ ok: true });
});

export const DELETE = withMetrics("/api/transactions", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });

  const portfolioId = req.nextUrl.searchParams.get("portfolioId") || undefined;
  const deleted = await deleteTransaction(session.userId, id);
  if (!deleted) return NextResponse.json({ error: "Not found." }, { status: 404 });
  await rebuildHoldings(session.userId, portfolioId);
  transactionsOpsTotal.inc({ operation: "delete" });
  return NextResponse.json({ ok: true });
});
