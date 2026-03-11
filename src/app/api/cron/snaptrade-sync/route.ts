import { NextRequest, NextResponse } from "next/server";
import {
  listActiveSnapTradeConnections,
  getSnapTradeConnectionSecret,
  getSnapTradeBrokerSyncs,
  upsertSnapTradeBrokerSync,
  updateSnapTradeLastSynced,
  setSnapTradeNeedsAttention,
  listTransactionSourceRefs,
  listCashEntries,
  addCashEntry,
  removeCashEntry,
  trackEvent,
} from "@/lib/db";
import {
  listBrokerageConnections,
  listAccounts,
  fetchActivities,
  fetchAllHoldings,
} from "@/lib/snaptrade-client";
import { YahooProvider } from "@/lib/api-providers/yahoo";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Cron: auto-sync all active SnapTrade connections every 6 hours.
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

  const connections = await listActiveSnapTradeConnections();
  if (connections.length === 0) {
    return NextResponse.json({ synced: 0, errors: 0 });
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

      if (disabledConns.length > 0) {
        await setSnapTradeNeedsAttention(conn.userId, true);
      }

      if (brokerageConns.every((c) => c.disabled)) {
        trackEvent(conn.userId, "snaptrade_auto_sync_skipped", { reason: "all_disabled" });
        errors++;
        continue;
      }

      const accounts = await listAccounts(conn.snapTradeUserId, userSecret);
      const activeBrokerIds = new Set(brokerageConns.filter((c) => !c.disabled).map((c) => c.id));
      const activeAccounts = accounts.filter((a) => activeBrokerIds.has(a.brokerageAuthorizationId));

      const brokerSyncs = await getSnapTradeBrokerSyncs(conn.userId);
      const syncMap = new Map(brokerSyncs.map((s) => [s.brokerageAuthorizationId, s.lastImportedAt]));

      let totalNewTx = 0;
      const fetchedBrokers: { id: string; name: string }[] = [];
      const seenBrokerIds = new Set<string>();

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
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL
              ? `https://${process.env.VERCEL_URL}`
              : "http://localhost:3000";
            await fetch(`${baseUrl}/api/transactions/bulk`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-cron-user-id": conn.userId,
              },
              body: JSON.stringify({ transactions: bulkPayload, finalize: true }),
            });
          } catch (err) {
            console.error(`[snaptrade-sync] Bulk import failed for user ${conn.userId}:`, err instanceof Error ? err.message : err);
          }
        }
      }

      // Update cash balances
      try {
        const holdingsResult = await fetchAllHoldings(conn.snapTradeUserId, userSecret);
        if (holdingsResult.cashBalances.length > 0) {
          const existingCash = await listCashEntries(conn.userId);
          for (const entry of existingCash) {
            if (entry.name.toUpperCase().startsWith("CASH ")) {
              await removeCashEntry(conn.userId, entry.id);
            }
          }

          const yahoo = new YahooProvider();
          for (const balance of holdingsResult.cashBalances) {
            let amountEUR = balance.amount;
            if (balance.currency !== "EUR") {
              try {
                const rate = await yahoo.getExchangeRate(balance.currency, "EUR");
                if (rate > 0) amountEUR = +(balance.amount * rate).toFixed(2);
              } catch {
                // keep original amount
              }
            }
            await addCashEntry(conn.userId, { name: `Cash ${balance.currency}`, amountEUR });
          }
        }
      } catch (err) {
        console.warn(`[snaptrade-sync] Cash update failed for user ${conn.userId}:`, err instanceof Error ? err.message : err);
      }

      for (const broker of fetchedBrokers) {
        await upsertSnapTradeBrokerSync(conn.userId, broker.id, broker.name);
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

  return NextResponse.json({ synced, errors, total: connections.length });
}
