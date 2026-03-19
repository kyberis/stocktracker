import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth/guards";
import { addTransactionsBulk, rebuildHoldings, listHoldings, findUserById } from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";
import { transactionsOpsTotal } from "@/lib/metrics";
import { parseBody } from "@/lib/api-response";
import { getHoldingsLimit } from "@/lib/subscription";
import { YahooProvider } from "@/lib/api-providers/yahoo";
import { normalizeYahooExchange } from "@/lib/db/helpers";
import { enrichHoldingClassifications } from "@/lib/enrich-classifications";
import { deferTask } from "@/lib/task-runner";
import { runBackfillForUser } from "@/lib/backfill-snapshots";
import { materializeCurrentSnapshotsForUser } from "@/lib/cron-portfolio-snapshots";

const bulkTransactionSchema = z.object({
  transactions: z.array(
    z.object({
      ticker: z.string().min(1),
      type: z.enum(["buy", "sell", "dividend", "fee"]),
      date: z.string().min(1),
      holdingId: z.string().optional().default(""),
      name: z.string().optional().default(""),
      exchange: z.string().optional().default(""),
      isin: z.string().optional().default(""),
      assetType: z.enum(["stock", "etf"]).optional().default("stock"),
      accountId: z.string().optional().default(""),
      shares: z.number().optional().default(0),
      pricePerShare: z.number().optional().default(0),
      totalAmount: z.number().optional().default(0),
      fees: z.number().optional().default(0),
      taxes: z.number().optional().default(0),
      currency: z.string().optional().default("EUR"),
      displayCurrency: z.string().optional(),
      exchangeRateEur: z.number().optional(),
      notes: z.string().optional().default(""),
      sourceRef: z.string().optional().default(""),
      brokerName: z.string().optional().default(""),
    })
  ).min(1).max(200),
  finalize: z.boolean().optional().default(false),
  skipRebuild: z.boolean().optional().default(false),
});

export const POST = withMetrics("/api/transactions/bulk", async (req: NextRequest) => {
  // Support cron auth: x-cron-user-id + Bearer CRON_SECRET
  const cronUserId = req.headers.get("x-cron-user-id");
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const isCronAuth = cronUserId && cronSecret && authHeader === `Bearer ${cronSecret}`;

  let userId: string;

  if (isCronAuth) {
    userId = cronUserId;
  } else {
    const { session, error } = await requireSession(req);
    if (error || !session) return error;
    userId = session.userId;
  }

  const portfolioId = req.nextUrl.searchParams.get("portfolioId") || undefined;
  const result = await parseBody(req, bulkTransactionSchema);
  if (!result.success) return result.error;

  const { transactions, finalize, skipRebuild } = result.data;

  const yahoo = new YahooProvider();

  // Resolve missing exchanges via Yahoo search
  const tickersWithoutExchange = [
    ...new Set(
      transactions
        .filter((tx) => !tx.exchange)
        .map((tx) => tx.ticker.toUpperCase()),
    ),
  ];

  const resolvedExchanges: Record<string, string> = {};
  if (tickersWithoutExchange.length > 0) {
    await Promise.all(
      tickersWithoutExchange.map(async (ticker) => {
        try {
          const results = await yahoo.search(ticker);
          if (results.length > 0) {
            resolvedExchanges[ticker] = normalizeYahooExchange(results[0].exchange);
          }
        } catch { /* non-critical */ }
      }),
    );
  }

  const getExchange = (tx: { ticker: string; exchange: string }) =>
    tx.exchange || resolvedExchanges[tx.ticker.toUpperCase()] || "";

  const user = await findUserById(userId);
  const plan = (user?.plan ?? "free");
  const holdingsLimit = getHoldingsLimit(plan);

  let holdingsCapped = 0;
  let allowedTickers: Set<string> | null = null;

  if (holdingsLimit < Infinity) {
    const currentHoldings = await listHoldings(userId, portfolioId);
    const existingTickers = new Set(
      currentHoldings.map((h) => `${h.ticker}|${h.exchange || ""}`)
    );
    const newTickers = new Set<string>();
    for (const tx of transactions) {
      if (tx.type === "buy") {
        const key = `${tx.ticker.toUpperCase()}|${getExchange(tx).toUpperCase()}`;
        if (!existingTickers.has(key)) newTickers.add(key);
      }
    }
    const slotsAvailable = Math.max(0, holdingsLimit - currentHoldings.length);
    if (newTickers.size > slotsAvailable) {
      const newArr = [...newTickers];
      const allowed = new Set(newArr.slice(0, slotsAvailable));
      holdingsCapped = newTickers.size - slotsAvailable;
      allowedTickers = new Set([...existingTickers, ...allowed]);
    }
  }

  // Fetch FX rates for non-EUR currencies
  const uniqueCurrencies = new Set(
    transactions
      .filter((tx) => !tx.exchangeRateEur && tx.currency && tx.currency !== "EUR")
      .map((tx) => tx.currency.toUpperCase())
  );

  const fxRates: Record<string, number> = {};
  if (uniqueCurrencies.size > 0) {
    await Promise.all(
      [...uniqueCurrencies].map(async (cur) => {
        try {
          const rate = await yahoo.getExchangeRate("EUR", cur);
          if (rate > 0) fxRates[cur] = rate;
        } catch { /* non-critical */ }
      })
    );
  }

  let filtered = transactions;
  if (allowedTickers) {
    filtered = transactions.filter((tx) => {
      const key = `${tx.ticker.toUpperCase()}|${getExchange(tx).toUpperCase()}`;
      return allowedTickers!.has(key);
    });
  }

  const enriched = filtered.map((tx) => {
    const cur = (tx.currency || "EUR").toUpperCase();
    const exchangeRateEur = tx.exchangeRateEur ?? fxRates[cur];
    return { ...tx, exchange: getExchange(tx), exchangeRateEur };
  });

  const skippedByLimit = transactions.length - filtered.length;
  const { inserted, skipped } = await addTransactionsBulk(userId, enriched, portfolioId);

  if (finalize && inserted > 0 && !skipRebuild) {
    await rebuildHoldings(userId, portfolioId);
    enrichHoldingClassifications(userId).catch((err) =>
      console.warn("[bulk] auto-classification failed:", err)
    );
  }

  if (finalize && inserted > 0 && !skipRebuild) {
    deferTask(async () => {
      try {
        await runBackfillForUser(userId);
        await materializeCurrentSnapshotsForUser(userId);
      } catch (err) {
        console.warn("[bulk] portfolio snapshot pipeline failed:", err);
      }
    });
  }

  /* Chunked import (skipRebuild): rebuild holdings on the server, then same snapshot pipeline */
  if (finalize && inserted > 0 && skipRebuild) {
    deferTask(async () => {
      try {
        await rebuildHoldings(userId, portfolioId);
        await enrichHoldingClassifications(userId).catch(() => {});
        await runBackfillForUser(userId);
        await materializeCurrentSnapshotsForUser(userId);
      } catch (err) {
        console.warn("[bulk] portfolio snapshot pipeline (skipRebuild) failed:", err);
      }
    });
  }

  transactionsOpsTotal.inc({ operation: "add" }, inserted);
  return NextResponse.json(
    { inserted, skipped: skipped + skippedByLimit, holdingsCapped },
    { status: 201 },
  );
});
