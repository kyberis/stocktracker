import { isDuplicateAgainstLedger } from "@/lib/transaction-fingerprint";
import {
  addCashEntry,
  addBrokerPortfolioMapping,
  countHoldings,
  ensureSnapTradeBrokerSyncPlaceholder,
  getAllBrokerPortfolioMappings,
  getSnapTradeBrokerSyncs,
  getSnapTradeConnection,
  getSnapTradeConnectionSecret,
  linkUnlinkedTransactionsToHoldings,
  listTransactionContentFingerprints,
  listTransactionSourceRefs,
  listTransactionTradeFingerprints,
  removeCashEntriesBySourceAndBrokers,
  setSnapTradeNeedsAttention,
  trackEvent,
  updateSnapTradeLastSynced,
  upsertHoldingsFromPositions,
  upsertSnapTradeBrokerSync,
} from "@/lib/db";
import {
  fetchActivities,
  fetchAllHoldings,
  listAccounts,
  listBrokerageConnections,
  mergeSnapTradeTransactions,
  refreshBrokerageConnection,
  SnapTradeClientError,
} from "@/lib/snaptrade-client";
import type { ExtractedTransaction } from "@/hooks/import-types";
import { YahooProvider } from "@/lib/api-providers/yahoo";
import { portfolioImportsTotal } from "@/lib/metrics";
import { maybeNotifyFirstSyncHoldings } from "@/lib/snaptrade-first-sync";
import { reconcileSnapTradeMarksAndNotify } from "@/lib/snaptrade-mark-gap-notify";
import { remapNamesakesFromBrokerMarks } from "@/lib/snaptrade-namesake-remap";

export interface SnapTradeFetchOk {
  ok: true;
  transactions: ExtractedTransaction[];
  summary: {
    total: number;
    buys: number;
    sells: number;
    dividends: number;
    fees: number;
    cashBalances: { currency: string; amount: number; broker?: string }[];
    accounts: unknown;
    duplicatesRemoved: number;
    truncatedBrokers: string[];
  };
  cashImported: number;
  positionsSynced: number;
  syncTriggered?: boolean;
  refreshedBrokerIds?: string[];
}

export interface SnapTradeFetchErr {
  ok: false;
  status: number;
  error: string;
  needsReconnect?: boolean;
  disabledConnections?: { id: string; brokerageName: string; disabledDate: string | null }[];
}

export async function runSnapTradeFetch(
  userId: string,
  opts: {
    portfolioId?: string;
    customStartDate?: string;
    brokerDateOverrides?: Record<string, string>;
  } = {},
): Promise<SnapTradeFetchOk | SnapTradeFetchErr> {
  const conn = await getSnapTradeConnection(userId);
  const userSecret = conn ? await getSnapTradeConnectionSecret(userId) : null;
  const portfolioId = opts.portfolioId;
  const customStartDate = opts.customStartDate;
  const brokerDateOverrides = opts.brokerDateOverrides || {};

  if (!conn || !userSecret) {
    return { ok: false, status: 400, error: "No SnapTrade connection found. Please connect a brokerage first." };
  }

  const hadHoldingsBefore = await countHoldings(userId);

  try {
    const brokerageConns = await listBrokerageConnections(conn.snapTradeUserId, userSecret);
    const disabledConns = brokerageConns
      .filter((c) => c.disabled)
      .map(({ id, brokerageName, disabledDate }) => ({ id, brokerageName, disabledDate }));

    if (brokerageConns.every((c) => c.disabled) && disabledConns.length > 0) {
      return {
        ok: false,
        status: 502,
        error: "All brokerage connections have expired. Please reconnect to continue syncing.",
        needsReconnect: true,
        disabledConnections: disabledConns,
      };
    }

    const accounts = await listAccounts(conn.snapTradeUserId, userSecret);
    const activeBrokerIds = new Set(brokerageConns.filter((c) => !c.disabled).map((c) => c.id));
    const allActiveAccounts = accounts.filter((a) => activeBrokerIds.has(a.brokerageAuthorizationId));
    const activeAccounts = allActiveAccounts;

    const brokerSyncs = await getSnapTradeBrokerSyncs(userId);
    const syncMap = new Map(
      brokerSyncs
        .filter((s) => !!s.lastImportedAt)
        .map((s) => [s.brokerageAuthorizationId, s.lastImportedAt]),
    );

    await Promise.allSettled(
      [...activeBrokerIds].map((bId) =>
        refreshBrokerageConnection(conn.snapTradeUserId, userSecret, bId),
      ),
    );

    const allTransactions: ExtractedTransaction[] = [];
    const fetchedBrokers: { id: string; name: string }[] = [];
    const truncatedBrokers: string[] = [];
    const seenBrokerIds = new Set<string>();

    for (const acct of activeAccounts) {
      const brokerId = acct.brokerageAuthorizationId;
      let startDate: string | undefined;
      if (customStartDate) {
        startDate = customStartDate;
      } else if (brokerId in brokerDateOverrides) {
        startDate = brokerDateOverrides[brokerId] || undefined;
      } else {
        startDate = syncMap.get(brokerId) || undefined;
      }
      const result = await fetchActivities({
        userId: conn.snapTradeUserId,
        userSecret,
        accountId: acct.id,
        startDate,
      });
      for (const tx of result.transactions) {
        tx.brokerName = acct.institution;
      }
      allTransactions.push(...result.transactions);

      if (!seenBrokerIds.has(acct.brokerageAuthorizationId)) {
        seenBrokerIds.add(acct.brokerageAuthorizationId);
        fetchedBrokers.push({ id: acct.brokerageAuthorizationId, name: acct.institution });
      }

      if (result.possiblyTruncated) {
        truncatedBrokers.push(`${acct.institution} (${acct.name})`);
        console.warn(
          `[SnapTrade] Activities hit 10k limit for account "${acct.name}" (user=${userId}, startDate=${startDate || "none"})`,
        );
      }
    }

    const refreshedBrokerIds: string[] = [];
    const allSyncedIds = new Set(brokerSyncs.map((s) => s.brokerageAuthorizationId));
    const brokersWithActivities = new Set(allTransactions.map((tx) => tx.brokerName));
    for (const bId of seenBrokerIds) {
      if (allSyncedIds.has(bId)) continue;
      const brokerInfo = fetchedBrokers.find((b) => b.id === bId);
      if (brokerInfo && brokersWithActivities.has(brokerInfo.name)) continue;
      await refreshBrokerageConnection(conn.snapTradeUserId, userSecret, bId);
      await ensureSnapTradeBrokerSyncPlaceholder(userId, bId, brokerInfo?.name || "Unknown");
      refreshedBrokerIds.push(bId);
    }

    const existingRefs = await listTransactionSourceRefs(userId);
    const existingContentFingerprints = await listTransactionContentFingerprints(userId);
    const existingTradeFingerprints = await listTransactionTradeFingerprints(userId);

    const allActiveAccountIds = new Set(allActiveAccounts.map((a) => a.id));
    const institutionMap = new Map(allActiveAccounts.map((a) => [a.id, a.institution]));
    const holdingsResult = await fetchAllHoldings(conn.snapTradeUserId, userSecret, allActiveAccountIds, institutionMap);

    const mergedFresh = mergeSnapTradeTransactions(allTransactions, holdingsResult.orderTransactions);
    const mergedTransactions = mergeSnapTradeTransactions(allTransactions, holdingsResult.orderTransactions, {
      existingFingerprints: existingTradeFingerprints,
    });

    const deduped = mergedTransactions.filter(
      (tx) => !isDuplicateAgainstLedger(tx, existingContentFingerprints, existingRefs, tx.sourceRef),
    );

    if (portfolioId) {
      for (const brokerId of seenBrokerIds) {
        await addBrokerPortfolioMapping(userId, brokerId, portfolioId);
      }
    }

    const brokerPortfolioMap = await getAllBrokerPortfolioMappings(userId);
    const allTargetPortfolioIds = new Set<string>();
    if (portfolioId) allTargetPortfolioIds.add(portfolioId);
    for (const pIds of brokerPortfolioMap.values()) {
      for (const pId of pIds) allTargetPortfolioIds.add(pId);
    }
    const targetPortfolios = allTargetPortfolioIds.size > 0 ? [...allTargetPortfolioIds] : [portfolioId];

    let lastUpserted: Awaited<ReturnType<typeof upsertHoldingsFromPositions>> = [];
    for (const targetPId of targetPortfolios) {
      lastUpserted = await upsertHoldingsFromPositions(userId, holdingsResult.holdings, targetPId, {
        skipStaleCleanup: disabledConns.length > 0,
      });
      await linkUnlinkedTransactionsToHoldings(userId, targetPId);
    }

    lastUpserted = await remapNamesakesFromBrokerMarks(
      userId,
      holdingsResult.holdings,
      lastUpserted,
    ).catch((err) => {
      console.warn(`[SnapTrade] namesake remap failed for user ${userId}:`, err);
      return lastUpserted;
    });

    await reconcileSnapTradeMarksAndNotify(
      userId,
      holdingsResult.holdings,
      lastUpserted,
      holdingsResult.brokerNavEUR,
    ).catch((err) =>
      console.error(`[SnapTrade] mark reconciliation failed for user ${userId}:`, err),
    );

    const summary = {
      total: deduped.length,
      buys: deduped.filter((t) => t.type === "buy").length,
      sells: deduped.filter((t) => t.type === "sell").length,
      dividends: deduped.filter((t) => t.type === "dividend").length,
      fees: deduped.filter((t) => t.type === "fee").length,
      cashBalances: holdingsResult.cashBalances,
      accounts: holdingsResult.accounts,
      duplicatesRemoved: mergedFresh.length - deduped.length,
      truncatedBrokers,
    };

    let cashImported = 0;
    if (holdingsResult.cashBalances.length > 0) {
      const aggregated = new Map<string, { broker: string; currency: string; amount: number }>();
      for (const b of holdingsResult.cashBalances) {
        const key = `${b.broker || ""}::${b.currency}`;
        const existing = aggregated.get(key);
        if (existing) {
          existing.amount += b.amount;
        } else {
          aggregated.set(key, { broker: b.broker || "", currency: b.currency, amount: b.amount });
        }
      }

      const fetchedBrokerPrefixes = [
        ...new Set([...aggregated.values()].map((e) => (e.broker ? e.broker.toUpperCase() : "Cash"))),
      ];

      const yahoo = new YahooProvider();
      const cashEntries: { name: string; amountEUR: number; displayCurrency: string; displayAmount: number }[] = [];
      for (const entry of aggregated.values()) {
        const { broker, currency } = entry;
        const displayAmount = entry.amount;
        let amountEUR = displayAmount;
        if (currency !== "EUR") {
          try {
            const rate = await yahoo.getExchangeRate(currency, "EUR");
            if (rate > 0) amountEUR = +(displayAmount * rate).toFixed(2);
          } catch {
            // keep original amount
          }
        }
        const label = broker ? `${broker.toUpperCase()} \u2013 ${currency}` : `Cash ${currency}`;
        cashEntries.push({ name: label, amountEUR, displayCurrency: currency, displayAmount });
      }

      for (const targetPId of targetPortfolios) {
        await removeCashEntriesBySourceAndBrokers(userId, "snaptrade", fetchedBrokerPrefixes, targetPId);
        for (const ce of cashEntries) {
          await addCashEntry(
            userId,
            {
              name: ce.name,
              amountEUR: ce.amountEUR,
              source: "snaptrade",
              displayCurrency: ce.displayCurrency,
              displayAmount: ce.displayAmount,
            },
            targetPId,
          );
          cashImported++;
        }
      }
    }

    for (const broker of fetchedBrokers) {
      const hasTxForBroker = deduped.some((tx) => tx.brokerName === broker.name);
      if (hasTxForBroker) {
        await upsertSnapTradeBrokerSync(userId, broker.id, broker.name);
      }
    }

    await updateSnapTradeLastSynced(userId);
    if (truncatedBrokers.length > 0) {
      trackEvent(userId, "snaptrade_activities_truncated", {
        brokers: truncatedBrokers.join(","),
      });
    }
    trackEvent(userId, "snaptrade_fetch", {
      accounts: String(activeAccounts.length),
      activities: String(deduped.length),
      cash: String(cashImported),
      incremental: String(brokerSyncs.length > 0),
      truncated: String(truncatedBrokers.length > 0),
    });
    portfolioImportsTotal.inc({ source: "snaptrade", status: "success" });

    if (disabledConns.length === 0) {
      await setSnapTradeNeedsAttention(userId, false);
    }

    maybeNotifyFirstSyncHoldings(userId, hadHoldingsBefore).catch((err) =>
      console.error(`[SnapTrade] first-sync notification failed for user ${userId}:`, err),
    );

    return {
      ok: true,
      transactions: deduped,
      summary,
      cashImported,
      positionsSynced: holdingsResult.holdings.length,
      ...(refreshedBrokerIds.length > 0 ? { syncTriggered: true, refreshedBrokerIds } : {}),
    };
  } catch (err) {
    const msg = err instanceof SnapTradeClientError ? err.message : "Failed to fetch from SnapTrade.";
    portfolioImportsTotal.inc({ source: "snaptrade", status: "error" });

    let disabledConnections: { id: string; brokerageName: string; disabledDate: string | null }[] = [];
    try {
      const brokerageConns = await listBrokerageConnections(conn.snapTradeUserId, userSecret);
      disabledConnections = brokerageConns
        .filter((c) => c.disabled)
        .map(({ id, brokerageName, disabledDate }) => ({ id, brokerageName, disabledDate }));
    } catch (checkErr) {
      console.warn(
        "[SnapTrade] Failed to check disabled status after fetch error:",
        checkErr instanceof Error ? checkErr.message : checkErr,
      );
    }

    if (disabledConnections.length > 0) {
      await setSnapTradeNeedsAttention(userId, true);
    }

    trackEvent(userId, "import_error", {
      method: "broker_sync",
      reason: disabledConnections.length > 0 ? "needs_reconnect" : "fetch_failed",
    });

    return {
      ok: false,
      status: 502,
      error: msg,
      needsReconnect: disabledConnections.length > 0,
      disabledConnections,
    };
  }
}
