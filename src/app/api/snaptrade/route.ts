import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import {
  findUserById,
  getSnapTradeConnection,
  getSnapTradeConnectionSecret,
  saveSnapTradeConnection,
  updateSnapTradeLastSynced,
  deleteSnapTradeConnection,
  listTransactionSourceRefs,
  listCashEntries,
  addCashEntry,
  removeCashEntry,
  trackEvent,
  getSnapTradeBrokerSyncs,
  upsertSnapTradeBrokerSync,
} from "@/lib/db";
import {
  registerUser,
  deleteUser,
  generateConnectionPortalUrl,
  fetchAllHoldings,
  fetchActivities,
  listBrokerageConnections,
  SnapTradeClientError,
} from "@/lib/snaptrade-client";
import type { ExtractedTransaction } from "@/hooks/import-types";
import { YahooProvider } from "@/lib/api-providers/yahoo";
import { withMetrics } from "@/lib/with-metrics";
import { portfolioImportsTotal } from "@/lib/metrics";

/**
 * POST /api/snaptrade
 *
 * Actions:
 *   get-connection    — Check if a SnapTrade connection exists + live brokerage status
 *   register-user     — Register SnapTrade user and store credentials
 *   connect-url       — Generate Connection Portal redirect URL
 *   reconnect-url     — Generate reconnect portal URL for a disabled connection
 *   fetch             — Pull holdings from all connected accounts
 *   disconnect        — Remove saved SnapTrade connection
 */
export const POST = withMetrics("/api/snaptrade", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  const formData = await req.formData();
  const action = formData.get("action") as string;

  /* ── Get connection (no Pro check — just metadata + live brokerage status) ── */
  if (action === "get-connection") {
    const conn = await getSnapTradeConnection(session.userId);
    if (!conn) return NextResponse.json({ connected: false });

    let disabledConnections: { id: string; brokerageName: string; disabledDate: string | null }[] = [];
    try {
      const userSecret = await getSnapTradeConnectionSecret(session.userId);
      if (userSecret) {
        const brokerageConns = await listBrokerageConnections(conn.snapTradeUserId, userSecret);
        disabledConnections = brokerageConns
          .filter((c) => c.disabled)
          .map(({ id, brokerageName, disabledDate }) => ({ id, brokerageName, disabledDate }));
      }
    } catch {
      // If we can't reach SnapTrade API, still return local connection info
    }

    return NextResponse.json({
      connected: true,
      snapTradeUserId: conn.snapTradeUserId,
      label: conn.label,
      lastSyncedAt: conn.lastSyncedAt,
      createdAt: conn.createdAt,
      disabledConnections,
    });
  }

  /* ── Pro check for all remaining actions ── */
  const user = await findUserById(session.userId);
  const isPro = (user?.plan || session.plan) === "pro";
  if (!isPro) {
    return NextResponse.json(
      { error: "SnapTrade import requires a Pro subscription.", upgrade: true },
      { status: 403 },
    );
  }

  /* ── Register SnapTrade user ── */
  if (action === "register-user") {
    const existingConn = await getSnapTradeConnection(session.userId);
    if (existingConn) {
      return NextResponse.json({
        registered: true,
        snapTradeUserId: existingConn.snapTradeUserId,
        alreadyExists: true,
      });
    }

    try {
      const { snapTradeUserId, userSecret } = await registerUser(session.userId);
      await saveSnapTradeConnection(session.userId, snapTradeUserId, userSecret);
      return NextResponse.json({ registered: true, snapTradeUserId });
    } catch (err) {
      const msg = err instanceof SnapTradeClientError ? err.message : "Failed to register SnapTrade user.";
      return NextResponse.json({ error: msg }, { status: 502 });
    }
  }

  /* ── Generate Connection Portal URL ── */
  if (action === "connect-url") {
    const conn = await getSnapTradeConnection(session.userId);
    const userSecret = conn ? await getSnapTradeConnectionSecret(session.userId) : null;

    if (!conn || !userSecret) {
      return NextResponse.json(
        { error: "No SnapTrade user found. Please register first." },
        { status: 400 },
      );
    }

    try {
      const { redirectUrl, sessionId } = await generateConnectionPortalUrl(
        conn.snapTradeUserId,
        userSecret,
      );
      return NextResponse.json({ redirectUrl, sessionId });
    } catch (err) {
      const msg = err instanceof SnapTradeClientError ? err.message : "Failed to generate connection URL.";
      return NextResponse.json({ error: msg }, { status: 502 });
    }
  }

  /* ── Generate Reconnect Portal URL for a disabled connection ── */
  if (action === "reconnect-url") {
    const conn = await getSnapTradeConnection(session.userId);
    const userSecret = conn ? await getSnapTradeConnectionSecret(session.userId) : null;

    if (!conn || !userSecret) {
      return NextResponse.json(
        { error: "No SnapTrade user found. Please register first." },
        { status: 400 },
      );
    }

    const connectionId = formData.get("connectionId") as string;
    if (!connectionId) {
      return NextResponse.json(
        { error: "Missing connectionId for reconnection." },
        { status: 400 },
      );
    }

    try {
      const { redirectUrl, sessionId } = await generateConnectionPortalUrl(
        conn.snapTradeUserId,
        userSecret,
        connectionId,
      );
      trackEvent(session.userId, "snaptrade_reconnect", { connectionId });
      return NextResponse.json({ redirectUrl, sessionId });
    } catch (err) {
      const msg = err instanceof SnapTradeClientError ? err.message : "Failed to generate reconnect URL.";
      return NextResponse.json({ error: msg }, { status: 502 });
    }
  }

  /* ── Fetch transaction history + cash from all connected brokers ── */
  if (action === "fetch") {
    const conn = await getSnapTradeConnection(session.userId);
    const userSecret = conn ? await getSnapTradeConnectionSecret(session.userId) : null;
    const portfolioId = (formData.get("portfolioId") as string) || undefined;

    if (!conn || !userSecret) {
      return NextResponse.json(
        { error: "No SnapTrade connection found. Please connect a brokerage first." },
        { status: 400 },
      );
    }

    try {
      const brokerageConns = await listBrokerageConnections(conn.snapTradeUserId, userSecret);
      const activeConns = brokerageConns.filter((c) => !c.disabled);

      const brokerSyncs = await getSnapTradeBrokerSyncs(session.userId);
      const syncMap = new Map(brokerSyncs.map((s) => [s.brokerageAuthorizationId, s.lastImportedAt]));

      // Fetch real transaction history per broker, narrowing by startDate when available
      const allTransactions: ExtractedTransaction[] = [];
      const fetchedBrokers: { id: string; name: string }[] = [];
      const truncatedBrokers: string[] = [];

      for (const bc of activeConns) {
        const lastImported = syncMap.get(bc.id);
        const result = await fetchActivities({
          userId: conn.snapTradeUserId,
          userSecret,
          brokerageAuthorizationId: bc.id,
          startDate: lastImported || undefined,
        });
        allTransactions.push(...result.transactions);
        fetchedBrokers.push({ id: bc.id, name: bc.brokerageName });

        if (result.possiblyTruncated) {
          truncatedBrokers.push(bc.brokerageName);
          console.warn(
            `[SnapTrade] Activities response hit 10k limit for broker "${bc.brokerageName}" (user=${session.userId}, startDate=${lastImported || "none"})`,
          );
        }
      }

      // Dedup against already-imported sourceRefs
      const existingRefs = await listTransactionSourceRefs(session.userId);
      const deduped = allTransactions.filter(
        (tx) => !tx.sourceRef || !existingRefs.has(tx.sourceRef),
      );

      // Cash balances still come from the holdings snapshot
      const holdingsResult = await fetchAllHoldings(conn.snapTradeUserId, userSecret);

      const summary = {
        total: deduped.length,
        buys: deduped.filter((t) => t.type === "buy").length,
        sells: deduped.filter((t) => t.type === "sell").length,
        dividends: deduped.filter((t) => t.type === "dividend").length,
        fees: deduped.filter((t) => t.type === "fee").length,
        cashBalances: holdingsResult.cashBalances,
        accounts: holdingsResult.accounts,
        duplicatesRemoved: allTransactions.length - deduped.length,
        truncatedBrokers,
      };

      let cashImported = 0;
      if (holdingsResult.cashBalances.length > 0) {
        const existingCash = await listCashEntries(session.userId, portfolioId);
        for (const entry of existingCash) {
          if (entry.name.toUpperCase().startsWith("CASH ")) {
            await removeCashEntry(session.userId, entry.id);
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
              // keep original amount if FX conversion fails
            }
          }
          await addCashEntry(session.userId, {
            name: `Cash ${balance.currency}`,
            amountEUR,
          }, portfolioId);
          cashImported++;
        }
      }

      // Persist per-broker sync timestamps
      for (const broker of fetchedBrokers) {
        await upsertSnapTradeBrokerSync(session.userId, broker.id, broker.name);
      }

      await updateSnapTradeLastSynced(session.userId);
      if (truncatedBrokers.length > 0) {
        trackEvent(session.userId, "snaptrade_activities_truncated", {
          brokers: truncatedBrokers.join(","),
        });
      }
      trackEvent(session.userId, "snaptrade_fetch", {
        accounts: String(holdingsResult.accounts.length),
        activities: String(deduped.length),
        cash: String(cashImported),
        incremental: String(brokerSyncs.length > 0),
        truncated: String(truncatedBrokers.length > 0),
      });
      portfolioImportsTotal.inc({ source: "snaptrade", status: "success" });

      return NextResponse.json({ transactions: deduped, summary, cashImported });
    } catch (err) {
      const msg = err instanceof SnapTradeClientError ? err.message : "Failed to fetch from SnapTrade.";
      portfolioImportsTotal.inc({ source: "snaptrade", status: "error" });

      let disabledConnections: { id: string; brokerageName: string; disabledDate: string | null }[] = [];
      try {
        const brokerageConns = await listBrokerageConnections(conn.snapTradeUserId, userSecret);
        disabledConnections = brokerageConns
          .filter((c) => c.disabled)
          .map(({ id, brokerageName, disabledDate }) => ({ id, brokerageName, disabledDate }));
      } catch {
        // best-effort check
      }

      return NextResponse.json(
        { error: msg, needsReconnect: disabledConnections.length > 0, disabledConnections },
        { status: 502 },
      );
    }
  }

  /* ── Disconnect ── */
  if (action === "disconnect") {
    const conn = await getSnapTradeConnection(session.userId);
    if (conn) {
      try {
        await deleteUser(conn.snapTradeUserId);
      } catch {
        // SnapTrade user may already be deleted; continue with local cleanup
      }
      await deleteSnapTradeConnection(session.userId);
    }
    return NextResponse.json({ disconnected: true });
  }

  return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
});
