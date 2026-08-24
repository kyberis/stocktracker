import {
  findUserById,
  getSnapTradeConnection,
  getSnapTradeConnectionSecret,
  saveSnapTradeConnection,
  trackEvent,
} from "@/lib/db";
import {
  generateConnectionPortalUrl,
  listBrokerageConnections,
  registerUser,
  SnapTradeClientError,
} from "@/lib/snaptrade-client";
import { runSnapTradeFetch } from "@/lib/snaptrade-fetch";
import { canUseBrokerSync, effectivePlan, getSnapTradeConnectionLimit } from "@/lib/subscription";
import type { SubscriptionPlan } from "@/lib/types";
import type { ImportTransactionRow } from "./types";

export type SnapTradeConnectResult =
  | { ok: true; alreadyConnected: true; brokerCount: number }
  | { ok: true; alreadyConnected: false; redirectUrl: string }
  | { ok: false; error: string; upgrade?: boolean; connectionLimitReached?: boolean };

export async function prepareSnapTradeConnect(
  userId: string,
  opts?: { isAdmin?: boolean },
): Promise<SnapTradeConnectResult> {
  const user = await findUserById(userId);
  const plan = effectivePlan((user?.plan || "free") as SubscriptionPlan, user?.plan_expires_at ?? "");
  if (!canUseBrokerSync(plan, user?.plan_expires_at ?? "", { isAdmin: opts?.isAdmin })) {
    return {
      ok: false,
      upgrade: true,
      error: "Broker sync requires a Trefolio subscription. You can still import a CSV.",
    };
  }

  const connectionLimit = getSnapTradeConnectionLimit(plan);
  if (connectionLimit === 0) {
    return {
      ok: false,
      upgrade: true,
      error: "Broker sync requires a Trefolio subscription. You can still import a CSV.",
    };
  }

  try {
    let conn = await getSnapTradeConnection(userId);
    let userSecret = conn ? await getSnapTradeConnectionSecret(userId) : null;
    if (!conn || !userSecret) {
      const registered = await registerUser(userId);
      await saveSnapTradeConnection(userId, registered.snapTradeUserId, registered.userSecret);
      conn = await getSnapTradeConnection(userId);
      userSecret = registered.userSecret;
    }
    if (!conn || !userSecret) {
      return { ok: false, error: "Could not register with SnapTrade." };
    }

    try {
      const brokerageConns = await listBrokerageConnections(conn.snapTradeUserId, userSecret);
      const activeConns = brokerageConns.filter((c) => !c.disabled);
      if (activeConns.length > 0) {
        return { ok: true, alreadyConnected: true, brokerCount: activeConns.length };
      }
      if (activeConns.length >= connectionLimit) {
        return {
          ok: false,
          connectionLimitReached: true,
          error: `Your plan allows up to ${connectionLimit} broker connection${connectionLimit === 1 ? "" : "s"}.`,
        };
      }
    } catch {
      // If we can't check, allow the connection attempt
    }

    const { redirectUrl } = await generateConnectionPortalUrl(conn.snapTradeUserId, userSecret);
    return { ok: true, alreadyConnected: false, redirectUrl };
  } catch (err) {
    const msg = err instanceof SnapTradeClientError ? err.message : "Failed to start SnapTrade connection.";
    trackEvent(userId, "import_error", { method: "broker_sync", reason: "connect_url_failed" });
    return { ok: false, error: msg };
  }
}

export async function fetchSnapTradeImportPreview(
  userId: string,
  portfolioId?: string,
): Promise<
  | { ok: true; transactions: ImportTransactionRow[]; summary: { total: number; buys: number; sells: number; dividends: number; fees: number; duplicatesRemoved: number }; cashImported: number }
  | { ok: false; error: string; needsReconnect?: boolean }
> {
  const result = await runSnapTradeFetch(userId, { portfolioId });
  if (!result.ok) {
    return { ok: false, error: result.error, needsReconnect: result.needsReconnect };
  }
  return {
    ok: true,
    transactions: result.transactions.map((tx) => ({
      date: tx.date,
      type: tx.type,
      ticker: tx.ticker,
      name: tx.name,
      isin: tx.isin,
      shares: tx.shares,
      pricePerShare: tx.pricePerShare,
      totalAmount: tx.totalAmount,
      fees: tx.fees,
      currency: tx.currency,
      assetType: tx.assetType,
      sourceRef: tx.sourceRef,
      brokerName: tx.brokerName,
      exchange: tx.exchange,
    })),
    summary: {
      total: result.summary.total,
      buys: result.summary.buys,
      sells: result.summary.sells,
      dividends: result.summary.dividends,
      fees: result.summary.fees,
      duplicatesRemoved: result.summary.duplicatesRemoved,
    },
    cashImported: result.cashImported,
  };
}
