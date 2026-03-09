import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth/guards";
import { addTransactionsBulk, rebuildHoldings, listHoldings, findUserById } from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";
import { transactionsOpsTotal } from "@/lib/metrics";
import { parseBody } from "@/lib/api-response";
import { getHoldingsLimit } from "@/lib/subscription";
import { YahooProvider } from "@/lib/api-providers/yahoo";
import { enrichHoldingClassifications } from "@/lib/enrich-classifications";

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
    })
  ).min(1).max(200),
  finalize: z.boolean().optional().default(false),
});

export const POST = withMetrics("/api/transactions/bulk", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  const portfolioId = req.nextUrl.searchParams.get("portfolioId") || undefined;
  const result = await parseBody(req, bulkTransactionSchema);
  if (!result.success) return result.error;

  const { transactions, finalize } = result.data;

  const user = await findUserById(session.userId);
  const plan = (user?.plan || session.plan) ?? "free";
  const holdingsLimit = getHoldingsLimit(plan);

  let holdingsCapped = 0;
  let allowedTickers: Set<string> | null = null;

  if (holdingsLimit < Infinity) {
    const currentHoldings = await listHoldings(session.userId, portfolioId);
    const existingTickers = new Set(
      currentHoldings.map((h) => `${h.ticker}|${h.exchange || ""}`)
    );
    const newTickers = new Set<string>();
    for (const tx of transactions) {
      if (tx.type === "buy") {
        const key = `${tx.ticker.toUpperCase()}|${(tx.exchange || "").toUpperCase()}`;
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

  const uniqueCurrencies = new Set(
    transactions
      .filter((tx) => !tx.exchangeRateEur && tx.currency && tx.currency !== "EUR")
      .map((tx) => tx.currency.toUpperCase())
  );

  const fxRates: Record<string, number> = {};
  if (uniqueCurrencies.size > 0) {
    const yahoo = new YahooProvider();
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
      const key = `${tx.ticker.toUpperCase()}|${(tx.exchange || "").toUpperCase()}`;
      return allowedTickers!.has(key);
    });
  }

  const enriched = filtered.map((tx) => {
    const cur = (tx.currency || "EUR").toUpperCase();
    const exchangeRateEur = tx.exchangeRateEur ?? fxRates[cur];
    return { ...tx, exchangeRateEur };
  });

  const skippedByLimit = transactions.length - filtered.length;
  const { inserted, skipped } = await addTransactionsBulk(session.userId, enriched, portfolioId);

  if (finalize && inserted > 0) {
    await rebuildHoldings(session.userId, portfolioId);
    enrichHoldingClassifications(session.userId).catch((err) =>
      console.warn("[bulk] auto-classification failed:", err)
    );
  }

  transactionsOpsTotal.inc({ operation: "add" }, inserted);
  return NextResponse.json(
    { inserted, skipped: skipped + skippedByLimit, holdingsCapped },
    { status: 201 },
  );
});
