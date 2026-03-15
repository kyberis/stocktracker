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
  trackEvent,
} from "@/lib/db";
import {
  listBrokerageConnections,
  listAccounts,
  fetchActivities,
  fetchAllHoldings,
} from "@/lib/snaptrade-client";
import { YahooProvider } from "@/lib/api-providers/yahoo";
import { withCronLogging } from "@/lib/cron-logging";

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

      let totalNewTx = 0;
      const fetchedBrokers: { id: string; name: string }[] = [];
      const seenBrokerIds = new Set<string>();
      const allActivityTickers = new Set<string>();

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

        for (const tx of result.transactions) {
          allActivityTickers.add(tx.ticker);
        }

        const existingRefs = await listTransactionSourceRefs(conn.userId);
        const newTx = result.transactions.filter(
          (tx) => !tx.sourceRef || !existingRefs.has(tx.sourceRef),
        );
        totalNewTx += newTx.length;

        if (newTx.length > 0) {
          const bulkPayload = newTx.map((tx) => ({
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

          try {
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
            await fetch(`${baseUrl}/api/transactions/bulk`, {
              method: "POST",
              headers: cronHeaders,
              body: JSON.stringify({ transactions: bulkPayload, finalize: true }),
            });
          } catch (err) {
            console.error(`[snaptrade-sync] Bulk import failed for user ${conn.userId}:`, err instanceof Error ? err.message : err);
          }
        }
      }

      // Fetch current positions + cash balances
      const institutionMap = new Map(activeAccounts.map((a) => [a.id, a.institution]));
      let holdingsResult: Awaited<ReturnType<typeof fetchAllHoldings>> | null = null;
      try {
        holdingsResult = await fetchAllHoldings(conn.snapTradeUserId, userSecret, undefined, institutionMap);

        // Fallback: import synthetic transactions for positions with no activities
        const existingRefsForFallback = await listTransactionSourceRefs(conn.userId);
        const fallbackTx = holdingsResult.transactions.filter(
          (tx) => !allActivityTickers.has(tx.ticker) &&
            (!tx.sourceRef || !existingRefsForFallback.has(tx.sourceRef)),
        );
        if (fallbackTx.length > 0) {
          const bulkPayload = fallbackTx.map((tx) => ({
            holdingId: "",
            ticker: tx.ticker,
            name: tx.name,
            exchange: "",
            isin: "",
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
            currency: tx.currency,
            displayCurrency: tx.currency,
            notes: "Auto-sync (position fallback)",
            sourceRef: tx.sourceRef || "",
          }));
          try {
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
            await fetch(`${baseUrl}/api/transactions/bulk`, {
              method: "POST",
              headers: cronHeaders,
              body: JSON.stringify({ transactions: bulkPayload, finalize: true }),
            });
            totalNewTx += fallbackTx.length;
          } catch (err) {
            console.error(`[snaptrade-sync] Position fallback import failed for user ${conn.userId}:`, err instanceof Error ? err.message : err);
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
          await removeCashEntriesBySourceAndBrokers(conn.userId, "snaptrade", fetchedBrokerPrefixes);

          const yahoo = new YahooProvider();
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
            await addCashEntry(conn.userId, {
              name: label,
              amountEUR,
              source: "snaptrade",
              displayCurrency: currency,
              displayAmount,
            });
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
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runSync();
}
