import { NextRequest, NextResponse } from "next/server";
import {
  listActiveSnapTradeConnections,
  getSnapTradeConnectionSecret,
  getSnapTradeBrokerSyncs,
  upsertSnapTradeBrokerSync,
  updateSnapTradeLastSynced,
  setSnapTradeNeedsAttention,
  setAllDisabledSince,
  clearAllDisabledSince,
  listTransactionSourceRefs,
  addCashEntry,
  removeCashEntriesBySourceAndBrokers,
  upsertHoldingsFromPositions,
  trackEvent,
  getAllBrokerPortfolioMappings,
  mapTransactionsBySourceRef,
} from "@/lib/db";
import {
  listBrokerageConnections,
  listAccounts,
  fetchActivities,
  fetchAllHoldings,
  refreshBrokerageConnection,
} from "@/lib/snaptrade-client";
import { YahooProvider } from "@/lib/api-providers/yahoo";
import { withCronLogging, verifyCronAuth } from "@/lib/cron-logging";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const runSync = withCronLogging("snaptrade-sync", async () => {
  const connections = await listActiveSnapTradeConnections();
  if (connections.length === 0) {
    return { synced: 0, errors: 0 };
  }

  let synced = 0;
  let errors = 0;

  for (const conn of connections) {
    try {
      const userSecret = await getSnapTradeConnectionSecret(conn.userId);
      if (!userSecret) {
        errors++;
        continue;
      }

      const brokerageConns = await listBrokerageConnections(conn.snapTradeUserId, userSecret);
      const disabledConns = brokerageConns.filter((c) => c.disabled);
      const allDisabled = brokerageConns.length > 0 && brokerageConns.every((c) => c.disabled);

      if (disabledConns.length > 0) {
        await setSnapTradeNeedsAttention(conn.userId, true);
      }

      if (allDisabled) {
        await setAllDisabledSince(conn.userId);
        trackEvent(conn.userId, "snaptrade_auto_sync_skipped", { reason: "all_disabled" });
        errors++;
        continue;
      } else {
        await clearAllDisabledSince(conn.userId);
      }

      const accounts = await listAccounts(conn.snapTradeUserId, userSecret);
      const activeBrokerIds = new Set(brokerageConns.filter((c) => !c.disabled).map((c) => c.id));
      const activeAccounts = accounts.filter((a) => activeBrokerIds.has(a.brokerageAuthorizationId));

      const brokerSyncs = await getSnapTradeBrokerSyncs(conn.userId);
      const syncMap = new Map(
        brokerSyncs
          .filter((s) => s.transactionCount > 0)
          .map((s) => [s.brokerageAuthorizationId, s.lastImportedAt]),
      );

      // Load broker→portfolio mappings so we can sync to all linked portfolios.
      // If no mappings exist (legacy users), undefined falls back to default portfolio.
      const brokerPortfolioMap = await getAllBrokerPortfolioMappings(conn.userId);
      const allMappedPortfolioIds = new Set<string>();
      for (const pIds of brokerPortfolioMap.values()) {
        for (const pId of pIds) allMappedPortfolioIds.add(pId);
      }
      const targetPortfolios: (string | undefined)[] =
        allMappedPortfolioIds.size > 0 ? [...allMappedPortfolioIds] : [undefined];

      // Refresh all active broker connections so SnapTrade pulls latest data.
      await Promise.allSettled(
        [...activeBrokerIds].map((bId) =>
          refreshBrokerageConnection(conn.snapTradeUserId, userSecret, bId)
        )
      );

      let totalNewTx = 0;
      const fetchedBrokers: { id: string; name: string }[] = [];
      const seenBrokerIds = new Set<string>();

      // Collect all new transactions across all accounts
      const allNewTx: Awaited<ReturnType<typeof fetchActivities>>["transactions"][] = [];
      for (const acct of activeAccounts) {
        const startDate = syncMap.get(acct.brokerageAuthorizationId) || undefined;
        const result = await fetchActivities({
          userId: conn.snapTradeUserId,
          userSecret,
          accountId: acct.id,
          startDate,
        });

        if (!seenBrokerIds.has(acct.brokerageAuthorizationId)) {
          seenBrokerIds.add(acct.brokerageAuthorizationId);
          fetchedBrokers.push({ id: acct.brokerageAuthorizationId, name: acct.institution });
        }

        const existingRefs = await listTransactionSourceRefs(conn.userId);
        const newTx = result.transactions.filter(
          (tx) => !tx.sourceRef || !existingRefs.has(tx.sourceRef),
        );
        totalNewTx += newTx.length;

        if (newTx.length > 0) {
          allNewTx.push(newTx);
        }
      }

      // Import transactions to the first portfolio, then map to additional ones
      if (allNewTx.length > 0) {
        const flatTx = allNewTx.flat();
        const bulkPayload = flatTx.map((tx) => ({
          holdingId: "",
          ticker: tx.ticker || (tx.type === "fee" ? "FEE" : "UNKNOWN"),
          name: tx.name,
          exchange: "",
          isin: tx.isin || "",
          assetType:
            tx.name.toUpperCase().includes("ETF") || tx.name.toUpperCase().includes("UCITS")
              ? "etf"
              : "stock",
          accountId: "",
          type: tx.type,
          date: tx.date,
          shares: tx.shares,
          pricePerShare: tx.pricePerShare,
          totalAmount: tx.totalAmount || tx.shares * tx.pricePerShare,
          fees: tx.fees,
          taxes: 0,
          currency: tx.currency,
          displayCurrency: tx.currency,
          notes: "Auto-sync",
          sourceRef: tx.sourceRef || "",
        }));

        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || (process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : "http://localhost:3000");
        const cronHeaders: Record<string, string> = {
          "Content-Type": "application/json",
          "x-cron-user-id": conn.userId,
        };
        if (process.env.CRON_SECRET) {
          cronHeaders["Authorization"] = `Bearer ${process.env.CRON_SECRET}`;
        }

        // Insert into the first target portfolio only
        const primaryPId = targetPortfolios[0];
        try {
          const bulkUrl = primaryPId
            ? `${baseUrl}/api/transactions/bulk?portfolioId=${encodeURIComponent(primaryPId)}`
            : `${baseUrl}/api/transactions/bulk`;
          await fetch(bulkUrl, {
            method: "POST",
            headers: cronHeaders,
            body: JSON.stringify({ transactions: bulkPayload, finalize: true, skipRebuild: true }),
          });
        } catch (err) {
          console.error(`[snaptrade-sync] Bulk import failed for user ${conn.userId} portfolio ${primaryPId || "default"}:`, err instanceof Error ? err.message : err);
        }

        // Map the imported transactions to additional portfolios
        const sourceRefs = flatTx.map((tx) => tx.sourceRef || "").filter(Boolean);
        if (sourceRefs.length > 0) {
          for (const additionalPId of targetPortfolios.slice(1)) {
            if (additionalPId) {
              await mapTransactionsBySourceRef(conn.userId, sourceRefs, additionalPId);
            }
          }
        }
      }

      // Fetch current positions + cash balances
      const allActiveAccountIds = new Set(activeAccounts.map((a) => a.id));
      const institutionMap = new Map(activeAccounts.map((a) => [a.id, a.institution]));
      let holdingsResult: Awaited<ReturnType<typeof fetchAllHoldings>> | null = null;
      try {
        holdingsResult = await fetchAllHoldings(conn.snapTradeUserId, userSecret, allActiveAccountIds, institutionMap);

        // Upsert holdings to all mapped portfolios.
        // When any connection is disabled, positions data is incomplete — skip
        // stale cleanup so we don't delete holdings we simply couldn't fetch.
        if (holdingsResult.holdings.length > 0) {
          for (const targetPId of targetPortfolios) {
            await upsertHoldingsFromPositions(conn.userId, holdingsResult.holdings, targetPId, {
              skipStaleCleanup: disabledConns.length > 0,
            });
          }
        }

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

          const fetchedBrokerPrefixes = [...new Set(
            [...aggregated.values()].map((e) => e.broker ? e.broker.toUpperCase() : "Cash"),
          )];

          const yahoo = new YahooProvider();
          const cashEntries: { name: string; amountEUR: number; displayCurrency: string; displayAmount: number }[] = [];
          for (const entry of aggregated.values()) {
            const { broker, currency } = entry;
            let displayAmount = entry.amount;
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
            await removeCashEntriesBySourceAndBrokers(conn.userId, "snaptrade", fetchedBrokerPrefixes, targetPId);
            for (const ce of cashEntries) {
              await addCashEntry(conn.userId, {
                name: ce.name,
                amountEUR: ce.amountEUR,
                source: "snaptrade",
                displayCurrency: ce.displayCurrency,
                displayAmount: ce.displayAmount,
              }, targetPId);
            }
          }
        }
      } catch (err) {
        console.warn(`[snaptrade-sync] Cash update failed for user ${conn.userId}:`, err instanceof Error ? err.message : err);
      }

      if (totalNewTx > 0) {
        for (const broker of fetchedBrokers) {
          await upsertSnapTradeBrokerSync(conn.userId, broker.id, broker.name);
        }
      }

      await updateSnapTradeLastSynced(conn.userId);

      // Clear needs_attention if all connections are healthy
      if (disabledConns.length === 0) {
        await setSnapTradeNeedsAttention(conn.userId, false);
      }

      trackEvent(conn.userId, "snaptrade_auto_sync", {
        newTransactions: String(totalNewTx),
        brokers: String(fetchedBrokers.length),
      });
      synced++;
    } catch (err) {
      console.error(`[snaptrade-sync] Failed for user ${conn.userId}:`, err instanceof Error ? err.message : err);
      errors++;
    }
  }

  return { synced, errors, total: connections.length };
});

/**
 * Cron: auto-sync all active SnapTrade connections every 1 hour.
 * For each user with an active connection, fetches new activities
 * since their last sync, imports transactions, updates cash balances,
 * and flags connections that need attention (expired credentials).
 */
export async function GET(req: NextRequest) {
  const denied = verifyCronAuth("snaptrade-sync", req.headers.get("authorization"));
  if (denied) return denied;
  return runSync();
}
