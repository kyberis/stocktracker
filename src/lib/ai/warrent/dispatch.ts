import { z } from "zod";
import {
  addCashEntry,
  addTransaction,
  addWatchlistItem,
  countActiveAlerts,
  createAlert,
  findUserById,
  isFeatureEnabled,
  listHoldings,
  removeHolding,
  trackEvent,
  insertAiLog,
} from "@/lib/db";
import { getAlertLimit, getHoldingsLimit } from "@/lib/subscription";
import type { WarrentProposalKind } from "./types";

export const addHoldingDataSchema = z.object({
  ticker: z.string().min(1).max(20),
  name: z.string().optional(),
  shares: z.number().positive(),
  purchasePrice: z.number().nonnegative(),
  displayCurrency: z.string().min(3).max(4).default("EUR"),
  portfolioId: z.string().optional(),
});

export const removeHoldingDataSchema = z.object({
  holdingId: z.string().min(1),
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

export type DispatchResult =
  | { ok: true; entityId?: string; message: string }
  | { ok: false; status: number; error: string; reason?: string };

export async function dispatchProposal(
  userId: string,
  kind: WarrentProposalKind,
  rawData: unknown,
): Promise<DispatchResult> {
  try {
    switch (kind) {
      case "addHolding":
        return await runAddHolding(userId, rawData);
      case "removeHolding":
        return await runRemoveHolding(userId, rawData);
      case "addCash":
        return await runAddCash(userId, rawData);
      case "createAlert":
        return await runCreateAlert(userId, rawData);
      case "addWatchlist":
        return await runAddWatchlist(userId, rawData);
      default:
        return { ok: false, status: 400, error: "Unknown proposal kind" };
    }
  } catch (err) {
    console.error("[warrent/dispatch] failed", kind, err);
    return {
      ok: false,
      status: 500,
      error: err instanceof Error ? err.message : "Unexpected error",
    };
  } finally {
    insertAiLog({
      userId,
      source: "warrent_action",
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
      date: new Date().toISOString().slice(0, 10),
      shares: data.shares,
      pricePerShare: data.purchasePrice,
      totalAmount: data.shares * data.purchasePrice,
      fees: 0,
      taxes: 0,
      currency: data.displayCurrency,
      displayCurrency: data.displayCurrency,
      notes: "Added by Warrent",
    },
    data.portfolioId,
  );
  if (!tx) {
    return { ok: false, status: 409, error: "Duplicate transaction." };
  }

  trackEvent(userId, "warrent_action", { action: "addHolding", ticker: data.ticker });
  return {
    ok: true,
    entityId: tx.id,
    message: `Added ${data.shares} ${data.ticker.toUpperCase()} at ${data.purchasePrice.toFixed(2)} ${data.displayCurrency}.`,
  };
}

async function runRemoveHolding(userId: string, raw: unknown): Promise<DispatchResult> {
  const parsed = removeHoldingDataSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, status: 400, error: "Invalid removeHolding payload" };
  const ok = await removeHolding(userId, parsed.data.holdingId);
  if (!ok) return { ok: false, status: 404, error: "Holding not found." };
  trackEvent(userId, "warrent_action", { action: "removeHolding", holdingId: parsed.data.holdingId });
  return { ok: true, message: "Holding removed." };
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
  trackEvent(userId, "warrent_action", { action: "addCash", name: data.name });
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
  const alert = await createAlert(userId, {
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
  trackEvent(userId, "warrent_action", { action: "createAlert", ticker });
  return { ok: true, entityId: alert.id, message: "Alert created." };
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
  trackEvent(userId, "warrent_action", { action: "addWatchlist", ticker: item.ticker });
  return { ok: true, entityId: item.id, message: `${item.ticker} added to watchlist.` };
}
