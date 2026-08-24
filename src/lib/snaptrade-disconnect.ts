import {
  deleteSnapTradeBrokerSync,
  detachSnapTradeHoldings,
  getSnapTradeBrokerSyncs,
  listSnapTradeTickersForBroker,
  removeBrokerPortfolioMappings,
  removeCashEntriesBySourceAndBrokers,
  trackEvent,
} from "@/lib/db";
import {
  fetchAllHoldings,
  listAccounts,
  removeBrokerageConnection,
} from "@/lib/snaptrade-client";

export interface DisconnectBrokerInput {
  userId: string;
  snapTradeUserId: string;
  userSecret: string;
  brokerConnectionId: string;
}

/**
 * Resolve which holding tickers belong to a brokerage authorization being
 * disconnected, so we can detach only those lots (not every SnapTrade holding).
 *
 * Prefer live SnapTrade positions for that authorization; fall back to local
 * transaction broker_name / notes when the auth is already gone on SnapTrade.
 */
export async function resolveDisconnectBrokerTickers(input: {
  userId: string;
  snapTradeUserId: string;
  userSecret: string;
  brokerConnectionId: string;
  brokerageName: string;
}): Promise<string[]> {
  const { userId, snapTradeUserId, userSecret, brokerConnectionId, brokerageName } = input;
  const tickers = new Set<string>();

  try {
    const accounts = await listAccounts(snapTradeUserId, userSecret);
    const brokerAccountIds = new Set(
      accounts
        .filter((a) => a.brokerageAuthorizationId === brokerConnectionId)
        .map((a) => a.id)
        .filter(Boolean),
    );
    if (brokerAccountIds.size > 0) {
      const institutionMap = new Map(
        accounts
          .filter((a) => brokerAccountIds.has(a.id))
          .map((a) => [a.id, a.institution] as const),
      );
      const holdings = await fetchAllHoldings(
        snapTradeUserId,
        userSecret,
        brokerAccountIds,
        institutionMap,
      );
      for (const h of holdings.holdings) {
        if (h.ticker) tickers.add(h.ticker.toUpperCase());
      }
    }
  } catch (err) {
    console.warn(
      "[SnapTrade] resolveDisconnectBrokerTickers live positions failed:",
      err instanceof Error ? err.message : err,
    );
  }

  if (tickers.size === 0 && brokerageName) {
    for (const t of await listSnapTradeTickersForBroker(userId, brokerageName)) {
      tickers.add(t);
    }
  }

  return [...tickers];
}

/**
 * Single-broker disconnect: detach only that broker's SnapTrade holdings,
 * remove its cash rows, notify SnapTrade (404 = already gone), and clear local
 * sync / portfolio mappings.
 */
export async function disconnectSnapTradeBroker(input: DisconnectBrokerInput): Promise<void> {
  const { userId, snapTradeUserId, userSecret, brokerConnectionId } = input;

  const syncs = await getSnapTradeBrokerSyncs(userId);
  const thisSync = syncs.find((s) => s.brokerageAuthorizationId === brokerConnectionId);
  const brokerageName = thisSync?.brokerageName || "";
  const otherSyncCount = syncs.filter((s) => s.brokerageAuthorizationId !== brokerConnectionId).length;

  const tickers = await resolveDisconnectBrokerTickers({
    userId,
    snapTradeUserId,
    userSecret,
    brokerConnectionId,
    brokerageName,
  });

  if (tickers.length > 0) {
    await detachSnapTradeHoldings(userId, undefined, { tickers });
  } else if (otherSyncCount === 0) {
    // Sole broker and we could not identify lots — detach all snaptrade rows.
    await detachSnapTradeHoldings(userId);
  } else {
    console.warn(
      `[SnapTrade] disconnect-broker ${brokerConnectionId}: no tickers resolved; leaving other brokers' snaptrade holdings intact`,
    );
  }

  if (brokerageName) {
    const prefix = brokerageName.toUpperCase();
    await removeCashEntriesBySourceAndBrokers(userId, "snaptrade", [prefix]);
  }

  try {
    await removeBrokerageConnection(snapTradeUserId, userSecret, brokerConnectionId);
  } catch (err) {
    console.warn(
      "[SnapTrade] removeBrokerageConnection failed:",
      brokerConnectionId,
      err instanceof Error ? err.message : err,
    );
  }

  await deleteSnapTradeBrokerSync(userId, brokerConnectionId);
  await removeBrokerPortfolioMappings(userId, brokerConnectionId);
  trackEvent(userId, "snaptrade_disconnect_broker", { brokerConnectionId, brokerageName });
}
