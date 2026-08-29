import { z } from "zod";
import {
  addCashEntry,
  addTransaction,
  addTransactionsBulk,
  addWatchlistItem,
  countActiveAlerts,
  createAlert,
  deleteTransactionsForPosition,
  findUserById,
  isFeatureEnabled,
  listHoldings,
  rebuildHoldings,
  removeCashEntriesBySource,
  removeHolding,
  trackEvent,
  insertAiLog,
} from "@/lib/db";
import { getAlertLimit, getHoldingsLimit } from "@/lib/subscription";
import type { WarrenProposalKind } from "./types";
import { YahooProvider } from "@/lib/api-providers/yahoo";
import { inferAssetType } from "@/lib/infer-asset-type";
import { deferTask } from "@/lib/task-runner";
import { runBackfillForUser } from "@/lib/backfill-snapshots";
import { materializeCurrentSnapshotsForUser } from "@/lib/cron-portfolio-snapshots";
import { enrichHoldingClassifications } from "@/lib/enrich-classifications";
import { resolveTickerAgainstHoldings, matchHoldingsToQuery } from "./price-move-intent";

export const addHoldingDataSchema = z.object({
  ticker: z.string().min(1).max(20),
  name: z.string().optional(),
  shares: z.number().positive(),
  purchasePrice: z.number().nonnegative(),
  displayCurrency: z.string().min(3).max(4).default("EUR"),
  purchaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  portfolioId: z.string().optional(),
});

export const removeHoldingDataSchema = z.object({
  holdingId: z.string().min(1),
  ticker: z.string().min(1).optional(),
  portfolioId: z.string().optional(),
});

export const recordTransactionDataSchema = z.object({
  type: z.enum(["buy", "sell", "dividend", "fee"]),
  ticker: z.string().min(1).max(20),
  name: z.string().optional(),
  shares: z.number().positive(),
  pricePerShare: z.number().nonnegative(),
  fees: z.number().optional().default(0),
  taxes: z.number().optional().default(0),
  currency: z.string().min(3).max(4).default("EUR"),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  holdingId: z.string().optional(),
  portfolioId: z.string().optional(),
});

export const addCashDataSchema = z.object({
  name: z.string().min(1).max(100),
  amountEUR: z.number().positive(),
  type: z.enum(["cash", "savings", "pension", "real_estate"]).optional(),
  displayCurrency: z.string().min(3).max(4).optional(),
  portfolioId: z.string().optional(),
});

export const createAlertDataSchema = z.object({
  ticker: z.string().min(1).max(20),
  condition: z.enum(["above", "below"]),
  threshold: z.number(),
  alertType: z.enum(["threshold", "percent_change"]).default("threshold"),
  percentBasis: z.enum(["daily", "purchase"]).optional(),
  percentValue: z.number().optional(),
  currency: z.string().optional(),
  isPortfolioWide: z.boolean().optional(),
  portfolioId: z.string().optional(),
});

export const addWatchlistDataSchema = z.object({
  ticker: z.string().min(1).max(20),
  name: z.string().optional(),
  exchange: z.string().optional(),
});

const importTxRowSchema = z.object({
  date: z.string().min(1),
  type: z.enum(["buy", "sell", "dividend", "fee"]),
  ticker: z.string().min(1),
  name: z.string().optional().default(""),
  isin: z.string().optional(),
  shares: z.number().optional().default(0),
  pricePerShare: z.number().optional().default(0),
  totalAmount: z.number().optional().default(0),
  fees: z.number().optional().default(0),
  taxes: z.number().optional().default(0),
  currency: z.string().optional().default("EUR"),
  assetType: z.enum(["stock", "etf", "fund", "crypto"]).optional(),
  sourceRef: z.string().optional(),
  brokerName: z.string().optional(),
  exchange: z.string().optional(),
});

export const importTransactionsDataSchema = z.object({
  source: z.enum(["broker_csv", "ai_import", "snaptrade_api"]),
  detectedBroker: z.string().optional(),
  transactions: z.array(importTxRowSchema).min(1).max(2000),
  cashBalances: z
    .array(
      z.object({
        currency: z.string().min(1),
        amount: z.number(),
        broker: z.string().optional(),
      }),
    )
    .optional(),
  summary: z
    .object({
      total: z.number().optional(),
      buys: z.number().optional(),
      sells: z.number().optional(),
      dividends: z.number().optional(),
      fees: z.number().optional(),
      duplicatesRemoved: z.number().optional(),
      unmapped: z.array(z.string()).optional(),
    })
    .passthrough(),
  portfolioId: z.string().optional(),
});

export type DispatchResult =
  | { ok: true; entityId?: string; message: string }
  | { ok: false; status: number; error: string; reason?: string };

export async function dispatchProposal(
  userId: string,
  kind: WarrenProposalKind,
  rawData: unknown,
): Promise<DispatchResult> {
  try {
    switch (kind) {
      case "addHolding":
        return await runAddHolding(userId, rawData);
      case "removeHolding":
        return await runRemoveHolding(userId, rawData);
      case "recordTransaction":
        return await runRecordTransaction(userId, rawData);
      case "addCash":
        return await runAddCash(userId, rawData);
      case "createAlert":
        return await runCreateAlert(userId, rawData);
      case "addWatchlist":
        return await runAddWatchlist(userId, rawData);
      case "importTransactions":
        return await runImportTransactions(userId, rawData);
      default:
        return { ok: false, status: 400, error: "Unknown proposal kind" };
    }
  } catch (err) {
    console.error("[warren/dispatch] failed", kind, err);
    return {
      ok: false,
      status: 500,
      error: err instanceof Error ? err.message : "Unexpected error",
    };
  } finally {
    insertAiLog({
      userId,
      source: "warren_action",
      model: "n/a",
      promptSystem: kind,
      promptUser: JSON.stringify(rawData).slice(0, 2000),
    }).catch(() => {});
  }
}

async function runAddHolding(userId: string, raw: unknown): Promise<DispatchResult> {
  const parsed = addHoldingDataSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, status: 400, error: "Invalid addHolding payload" };
  const data = parsed.data;

  const user = await findUserById(userId);
  const plan = user?.plan || "free";
  const limit = getHoldingsLimit(plan);
  if (limit < Infinity) {
    const current = await listHoldings(userId, data.portfolioId);
    const alreadyOwned = current.some((h) => h.ticker.toUpperCase() === data.ticker.toUpperCase());
    if (!alreadyOwned && current.length >= limit) {
      return {
        ok: false,
        status: 403,
        error: `You have reached your plan limit of ${limit} holdings.`,
        reason: "holdings_limit_reached",
      };
    }
  }

  const tx = await addTransaction(
    userId,
    {
      holdingId: "",
      ticker: data.ticker,
      name: data.name || "",
      exchange: "",
      isin: "",
      assetType: "stock",
      accountId: "",
      type: "buy",
      date: data.purchaseDate || new Date().toISOString().slice(0, 10),
      shares: data.shares,
      pricePerShare: data.purchasePrice,
      totalAmount: data.shares * data.purchasePrice,
      fees: 0,
      taxes: 0,
      currency: data.displayCurrency,
      displayCurrency: data.displayCurrency,
      notes: "Added by Warren",
    },
    data.portfolioId,
  );
  if (!tx) {
    return { ok: false, status: 409, error: "Duplicate transaction." };
  }

  trackEvent(userId, "warren_action", { action: "addHolding", ticker: data.ticker });
  return {
    ok: true,
    entityId: tx.id,
    message: `Added ${data.shares} ${data.ticker.toUpperCase()} at ${data.purchasePrice.toFixed(2)} ${data.displayCurrency}.`,
  };
}

async function findHoldingForWarren(
  userId: string,
  opts: { holdingId?: string; ticker?: string; portfolioId?: string },
) {
  const holdings = await listHoldings(userId, opts.portfolioId);
  if (opts.holdingId) {
    const byId = holdings.find((h) => h.id === opts.holdingId);
    if (byId) return byId;
  }
  const query = opts.ticker?.trim();
  if (!query) return undefined;

  const resolved = resolveTickerAgainstHoldings(
    query,
    holdings.map((h) => ({ ticker: h.ticker })),
  );
  const byTicker = holdings.find((h) => h.ticker.toUpperCase() === resolved.toUpperCase());
  if (byTicker) return byTicker;

  const matched = matchHoldingsToQuery(
    holdings.map((h) => ({ ticker: h.ticker, name: h.name })),
    query,
  );
  if (matched[0]) {
    return holdings.find((h) => h.ticker.toUpperCase() === matched[0]!.ticker.toUpperCase());
  }
  return undefined;
}

async function runRemoveHolding(userId: string, raw: unknown): Promise<DispatchResult> {
  const parsed = removeHoldingDataSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, status: 400, error: "Invalid removeHolding payload" };
  const { holdingId, ticker, portfolioId } = parsed.data;

  const target = await findHoldingForWarren(userId, { holdingId, ticker, portfolioId });
  if (!target) {
    return { ok: false, status: 404, error: "Holding not found." };
  }

  await deleteTransactionsForPosition(userId, target.ticker, target.exchange, portfolioId);
  const ok = await removeHolding(userId, target.id);
  if (!ok) return { ok: false, status: 404, error: "Holding not found." };
  trackEvent(userId, "warren_action", { action: "removeHolding", holdingId: target.id });
  return { ok: true, message: `Removed ${target.ticker} from your portfolio records.` };
}

async function runRecordTransaction(userId: string, raw: unknown): Promise<DispatchResult> {
  const parsed = recordTransactionDataSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, status: 400, error: "Invalid recordTransaction payload" };
  const data = parsed.data;
  const portfolioId = data.portfolioId;
  let ticker = data.ticker.toUpperCase();
  let holdingId = data.holdingId || "";

  if (data.type === "sell") {
    const holding = await findHoldingForWarren(userId, {
      holdingId: data.holdingId,
      ticker: data.ticker,
      portfolioId,
    });
    if (!holding) {
      return {
        ok: false,
        status: 404,
        error: `No holding found for ${ticker}. Record the purchase first, or check the ticker.`,
      };
    }
    if (data.shares > holding.shares + 1e-9) {
      return {
        ok: false,
        status: 400,
        error: `Cannot sell ${data.shares} shares — you only hold ${holding.shares} of ${holding.ticker}.`,
      };
    }
    ticker = holding.ticker.toUpperCase();
    holdingId = holding.id;
  }

  if (data.type === "buy") {
    const user = await findUserById(userId);
    const plan = user?.plan || "free";
    const limit = getHoldingsLimit(plan);
    if (limit < Infinity) {
      const current = await listHoldings(userId, portfolioId);
      const alreadyOwned = current.some((h) => h.ticker.toUpperCase() === ticker);
      if (!alreadyOwned && current.length >= limit) {
        return {
          ok: false,
          status: 403,
          error: `You have reached your plan limit of ${limit} holdings.`,
          reason: "holdings_limit_reached",
        };
      }
    }
  }

  const fees = data.fees ?? 0;
  const taxes = data.taxes ?? 0;
  const tx = await addTransaction(
    userId,
    {
      holdingId,
      ticker,
      name: data.name || "",
      exchange: "",
      isin: "",
      assetType: "stock",
      accountId: "",
      type: data.type,
      date: data.date || new Date().toISOString().slice(0, 10),
      shares: data.shares,
      pricePerShare: data.pricePerShare,
      totalAmount: data.shares * data.pricePerShare,
      fees,
      taxes,
      currency: data.currency,
      displayCurrency: data.currency,
      notes: "Recorded by Warren",
    },
    portfolioId,
  );
  if (!tx) {
    return { ok: false, status: 409, error: "Duplicate transaction." };
  }

  trackEvent(userId, "warren_action", {
    action: "recordTransaction",
    type: data.type,
    ticker,
  });
  const verb =
    data.type === "sell"
      ? "Recorded sale"
      : data.type === "buy"
        ? "Recorded purchase"
        : data.type === "dividend"
          ? "Recorded dividend"
          : "Recorded fee";
  return {
    ok: true,
    entityId: tx.id,
    message: `${verb} of ${data.shares} ${ticker} at ${data.pricePerShare.toFixed(2)} ${data.currency}.`,
  };
}

async function runAddCash(userId: string, raw: unknown): Promise<DispatchResult> {
  const parsed = addCashDataSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, status: 400, error: "Invalid addCash payload" };
  const data = parsed.data;
  const entry = await addCashEntry(
    userId,
    {
      name: data.name,
      amountEUR: data.amountEUR,
      type: data.type,
      source: "manual",
      displayCurrency: data.displayCurrency,
      displayAmount: data.amountEUR,
    },
    data.portfolioId,
  );
  trackEvent(userId, "warren_action", { action: "addCash", name: data.name });
  return { ok: true, entityId: entry.id, message: `Added "${data.name}".` };
}

async function runCreateAlert(userId: string, raw: unknown): Promise<DispatchResult> {
  const parsed = createAlertDataSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, status: 400, error: "Invalid createAlert payload" };
  const data = parsed.data;

  if (!(await isFeatureEnabled("alerts_enabled"))) {
    return { ok: false, status: 403, error: "Price alerts are not enabled" };
  }

  const user = await findUserById(userId);
  const plan = user?.plan || "free";
  const limit = getAlertLimit(plan);
  if (limit < Infinity) {
    const active = await countActiveAlerts(userId);
    if (active >= limit) {
      return {
        ok: false,
        status: 403,
        error: `Alert limit reached (${limit}).`,
        reason: "alert_limit_reached",
      };
    }
  }

  const ticker = data.isPortfolioWide ? "__PORTFOLIO__" : data.ticker.toUpperCase();
  const { alert, alreadyExists } = await createAlert(userId, {
    ticker,
    name: data.isPortfolioWide ? "Portfolio-wide" : ticker,
    condition: data.condition,
    threshold: data.threshold,
    currency: data.currency || "",
    alertType: data.alertType,
    percentBasis: data.percentBasis || "",
    percentValue: data.percentValue ?? 0,
    isPortfolioWide: !!data.isPortfolioWide,
    portfolioId: data.portfolioId || "",
  });
  if (!alreadyExists) {
    trackEvent(userId, "warren_action", { action: "createAlert", ticker });
  }
  return {
    ok: true,
    entityId: alert.id,
    message: alreadyExists ? "Alert already exists." : "Alert created.",
  };
}

async function runAddWatchlist(userId: string, raw: unknown): Promise<DispatchResult> {
  const parsed = addWatchlistDataSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, status: 400, error: "Invalid addWatchlist payload" };
  const data = parsed.data;
  const item = await addWatchlistItem(userId, {
    ticker: data.ticker,
    name: data.name || "",
    exchange: data.exchange || "",
  });
  trackEvent(userId, "warren_action", { action: "addWatchlist", ticker: item.ticker });
  return { ok: true, entityId: item.id, message: `${item.ticker} added to watchlist.` };
}

async function runImportTransactions(userId: string, raw: unknown): Promise<DispatchResult> {
  const parsed = importTransactionsDataSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, status: 400, error: "Invalid importTransactions payload" };
  const data = parsed.data;
  const portfolioId = data.portfolioId;
  const note =
    data.source === "snaptrade_api"
      ? "SnapTrade import"
      : data.source === "ai_import"
        ? "AI import"
        : `${data.detectedBroker || "Broker CSV"} import`;

  const CHUNK = 50;
  let inserted = 0;
  let skipped = 0;
  for (let i = 0; i < data.transactions.length; i += CHUNK) {
    const chunk = data.transactions.slice(i, i + CHUNK);
    const payload = chunk
      .filter((tx) => tx.type !== "buy" || !!tx.ticker)
      .map((tx) => ({
        holdingId: "",
        ticker: tx.ticker || tx.isin || (tx.type === "fee" ? "FEE" : "UNKNOWN"),
        name: tx.name || "",
        exchange: tx.exchange || "",
        isin: tx.isin || "",
        assetType:
          tx.assetType === "etf" || tx.assetType === "fund" || tx.assetType === "crypto"
            ? tx.assetType
            : inferAssetType({ name: tx.name }),
        accountId: "",
        type: tx.type,
        date: tx.date,
        shares: tx.shares,
        pricePerShare: tx.pricePerShare,
        totalAmount: tx.totalAmount || tx.shares * tx.pricePerShare,
        fees: tx.fees,
        taxes: tx.taxes || 0,
        currency: tx.currency,
        displayCurrency: tx.currency,
        notes: note,
        sourceRef: tx.sourceRef || "",
        brokerName: tx.brokerName || "",
      }));
    if (payload.length === 0) continue;
    const result = await addTransactionsBulk(userId, payload, portfolioId);
    inserted += result.inserted;
    skipped += result.skipped;
  }

  if (inserted > 0 && data.source !== "snaptrade_api") {
    await rebuildHoldings(userId, portfolioId);
    enrichHoldingClassifications(userId).catch(() => {});
  }

  if (data.source !== "snaptrade_api" && data.cashBalances && data.cashBalances.length > 0) {
    const broker = data.detectedBroker || "broker";
    await removeCashEntriesBySource(userId, broker, portfolioId);
    const yahoo = new YahooProvider();
    for (const balance of data.cashBalances) {
      let amountEUR = balance.amount;
      if (balance.currency !== "EUR") {
        try {
          const rate = await yahoo.getExchangeRate(balance.currency, "EUR");
          if (rate > 0) amountEUR = +(balance.amount * rate).toFixed(2);
        } catch {
          // keep original
        }
      }
      await addCashEntry(
        userId,
        {
          name: `${(balance.broker || broker).toUpperCase()} – ${balance.currency}`,
          amountEUR,
          source: broker,
          displayCurrency: balance.currency,
          displayAmount: balance.amount,
        },
        portfolioId,
      );
    }
  }

  if (inserted > 0) {
    deferTask(async () => {
      try {
        if (data.source === "snaptrade_api") {
          await rebuildHoldings(userId, portfolioId);
          await enrichHoldingClassifications(userId).catch(() => {});
        }
        await runBackfillForUser(userId);
        await materializeCurrentSnapshotsForUser(userId);
      } catch (err) {
        console.warn("[warren/dispatch] import snapshot pipeline failed:", err);
      }
    });
  }

  trackEvent(userId, "warren_action", {
    action: "importTransactions",
    source: data.source,
    inserted: String(inserted),
  });
  return {
    ok: true,
    message:
      inserted === 0
        ? "No new transactions were added (they may already be in your ledger)."
        : `Imported ${inserted} transaction${inserted === 1 ? "" : "s"}${skipped ? ` (${skipped} skipped)` : ""}.`,
  };
}
