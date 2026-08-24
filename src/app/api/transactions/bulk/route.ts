import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth/guards";
import { addTransactionsBulk, rebuildHoldings, listHoldings, findUserById, listDistinctBuyTickers, trackEvent, listTransactionContentFingerprints } from "@/lib/db";
import { filterNewTransactions } from "@/lib/transaction-fingerprint";
import { baseTickerName } from "@/lib/db/helpers";
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
import { cronBearerAuthorizedFromHeaders } from "@/lib/cron-logging";

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
      // AI / brokers sometimes emit "reit", "equity", etc. — coerce to known types.
      assetType: z.preprocess((val) => {
        const s = String(val || "stock").toLowerCase();
        if (s === "etf") return "etf";
        if (s === "crypto" || s === "cryptocurrency") return "crypto";
        if (s === "fund" || s === "mutualfund" || s === "mutual_fund") return "fund";
        return "stock";
      }, z.enum(["stock", "etf", "crypto", "fund"])).optional().default("stock"),
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
  const isCronAuth = cronUserId && cronBearerAuthorizedFromHeaders(authHeader);

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
    const [currentHoldings, priorBuyTickers] = await Promise.all([
      listHoldings(userId, portfolioId),
      listDistinctBuyTickers(userId, portfolioId),
    ]);
    // Build set of known base tickers (strip exchange suffixes) for stable
    // cross-chunk matching regardless of exchange resolution differences.
    const knownBases = new Set<string>();
    for (const h of currentHoldings) knownBases.add(baseTickerName(h.ticker.toUpperCase()));
    for (const t of priorBuyTickers) knownBases.add(baseTickerName(t));

    const chunkNewBases = new Set<string>();
    const chunkNewRaw = new Set<string>();
    for (const tx of transactions) {
      if (tx.type === "buy") {
        const raw = tx.ticker.toUpperCase();
        const base = baseTickerName(raw);
        if (base && !knownBases.has(base)) {
          chunkNewBases.add(base);
          chunkNewRaw.add(raw);
        }
      }
    }
    const slotsAvailable = Math.max(0, holdingsLimit - knownBases.size);
    if (chunkNewBases.size > slotsAvailable) {
      const allowedBases = new Set([...chunkNewBases].slice(0, slotsAvailable));
      holdingsCapped = chunkNewBases.size - slotsAvailable;
      // Build allowed raw-ticker set for filtering
      const allowedRaw = new Set<string>();
      for (const h of currentHoldings) allowedRaw.add(h.ticker.toUpperCase());
      for (const t of priorBuyTickers) allowedRaw.add(t);
      for (const tx of transactions) {
        if (tx.type === "buy") {
          const raw = tx.ticker.toUpperCase();
          const base = baseTickerName(raw);
          if (knownBases.has(base) || allowedBases.has(base)) allowedRaw.add(raw);
        }
      }
      allowedTickers = allowedRaw;
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
      if (tx.type !== "buy") return true;
      return allowedTickers!.has(tx.ticker.toUpperCase());
    });
  }

  const existingFingerprints = await listTransactionContentFingerprints(userId);
  const skippedByLimit = transactions.length - filtered.length;
  const { kept: dedupedFiltered, removed: duplicatesSkipped } = filterNewTransactions(filtered, existingFingerprints);
  filtered = dedupedFiltered;

  const enriched = filtered.map((tx) => {
    const cur = (tx.currency || "EUR").toUpperCase();
    const exchangeRateEur = tx.exchangeRateEur ?? fxRates[cur];
    return { ...tx, exchange: getExchange(tx), exchangeRateEur };
  });

  const { inserted, skipped } = await addTransactionsBulk(userId, enriched, portfolioId);

  if (finalize && inserted > 0 && !skipRebuild) {
    await rebuildHoldings(userId, portfolioId);
    enrichHoldingClassifications(userId).catch((err) =>
      console.warn("[bulk] auto-classification failed:", err)
    );
    trackEvent(userId, "portfolio_import_committed", {
      inserted: String(inserted),
      skipped: String(skipped + skippedByLimit + duplicatesSkipped),
      portfolioId: portfolioId || "default",
    });
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
    { inserted, skipped: skipped + skippedByLimit + duplicatesSkipped, holdingsCapped },
    { status: 201 },
  );
});
