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
  setSnapTradeNeedsAttention,
  getSnapTradeNeedsAttention,
} from "@/lib/db";
import {
  registerUser,
  deleteUser,
  generateConnectionPortalUrl,
  fetchAllHoldings,
  fetchActivities,
  listBrokerageConnections,
  listAccounts,
  SnapTradeClientError,
} from "@/lib/snaptrade-client";
import type { ExtractedTransaction } from "@/hooks/import-types";
import { YahooProvider } from "@/lib/api-providers/yahoo";
import { withMetrics } from "@/lib/with-metrics";
import { portfolioImportsTotal } from "@/lib/metrics";
import { getSnapTradeConnectionLimit } from "@/lib/subscription";
import type { SubscriptionPlan } from "@/lib/types";

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
    } catch (err) {
      console.warn("[SnapTrade] Failed to check brokerage status during get-connection:", err instanceof Error ? err.message : err);
    }

    const brokerSyncs = await getSnapTradeBrokerSyncs(session.userId);

    // Sync the needs_attention flag based on live brokerage status
    const hasDisabled = disabledConnections.length > 0;
    await setSnapTradeNeedsAttention(session.userId, hasDisabled);

    const userForPlan = await findUserById(session.userId);
    const userPlan = (userForPlan?.plan || session.plan) as SubscriptionPlan;

    return NextResponse.json({
      connected: true,
      snapTradeUserId: conn.snapTradeUserId,
      label: conn.label,
      lastSyncedAt: conn.lastSyncedAt,
      createdAt: conn.createdAt,
      disabledConnections,
      brokerSyncs,
      connectionLimit: getSnapTradeConnectionLimit(userPlan),
      needsAttention: hasDisabled,
    });
  }

  /* ── Tier check: Free users cannot access broker sync ── */
  const user = await findUserById(session.userId);
  const plan = (user?.plan || session.plan) as SubscriptionPlan;
  const connectionLimit = getSnapTradeConnectionLimit(plan);
  if (connectionLimit === 0) {
    return NextResponse.json(
      { error: "Broker sync requires a Bifolio or Trefolio subscription.", upgrade: true },
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

    // Enforce tier-based connection limit
    try {
      const brokerageConns = await listBrokerageConnections(conn.snapTradeUserId, userSecret);
      const activeConns = brokerageConns.filter((c) => !c.disabled);
      if (activeConns.length >= connectionLimit) {
        return NextResponse.json(
          { error: `Your plan allows up to ${connectionLimit} broker connection${connectionLimit === 1 ? "" : "s"}. Upgrade to Trefolio for unlimited connections.`, connectionLimitReached: true },
          { status: 403 },
        );
      }
    } catch {
      // If we can't check, allow the connection attempt
    }

    try {
      const customRedirect = (formData.get("customRedirect") as string) || undefined;
      const { redirectUrl, sessionId } = await generateConnectionPortalUrl(
        conn.snapTradeUserId,
        userSecret,
        undefined,
        customRedirect,
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
      const customRedirect = (formData.get("customRedirect") as string) || undefined;
      const { redirectUrl, sessionId } = await generateConnectionPortalUrl(
        conn.snapTradeUserId,
        userSecret,
        connectionId,
        customRedirect,
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
    const customStartDate = (formData.get("startDate") as string) || undefined;
    let brokerDateOverrides: Record<string, string> = {};
    try {
      const raw = formData.get("brokerStartDates") as string;
      if (raw) brokerDateOverrides = JSON.parse(raw);
    } catch { /* ignore parse errors */ }

    if (!conn || !userSecret) {
      return NextResponse.json(
        { error: "No SnapTrade connection found. Please connect a brokerage first." },
        { status: 400 },
      );
    }

    try {
      const brokerageConns = await listBrokerageConnections(conn.snapTradeUserId, userSecret);
      const disabledConns = brokerageConns
        .filter((c) => c.disabled)
        .map(({ id, brokerageName, disabledDate }) => ({ id, brokerageName, disabledDate }));

      if (brokerageConns.every((c) => c.disabled) && disabledConns.length > 0) {
        return NextResponse.json(
          {
            error: "All brokerage connections have expired. Please reconnect to continue syncing.",
            needsReconnect: true,
            disabledConnections: disabledConns,
          },
          { status: 502 },
        );
      }

      const accounts = await listAccounts(conn.snapTradeUserId, userSecret);
      const activeBrokerIds = new Set(brokerageConns.filter((c) => !c.disabled).map((c) => c.id));
      const activeAccounts = accounts.filter((a) => activeBrokerIds.has(a.brokerageAuthorizationId));

      const brokerSyncs = await getSnapTradeBrokerSyncs(session.userId);
      const syncMap = new Map(brokerSyncs.map((s) => [s.brokerageAuthorizationId, s.lastImportedAt]));

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
        allTransactions.push(...result.transactions);

        if (!seenBrokerIds.has(acct.brokerageAuthorizationId)) {
          seenBrokerIds.add(acct.brokerageAuthorizationId);
          fetchedBrokers.push({ id: acct.brokerageAuthorizationId, name: acct.institution });
        }

        if (result.possiblyTruncated) {
          truncatedBrokers.push(`${acct.institution} (${acct.name})`);
          console.warn(
            `[SnapTrade] Activities hit 10k limit for account "${acct.name}" (user=${session.userId}, startDate=${startDate || "none"})`,
          );
        }
      }

      const existingRefs = await listTransactionSourceRefs(session.userId);
      const deduped = allTransactions.filter(
        (tx) => !tx.sourceRef || !existingRefs.has(tx.sourceRef),
      );

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
        accounts: String(activeAccounts.length),
        activities: String(deduped.length),
        cash: String(cashImported),
        incremental: String(brokerSyncs.length > 0),
        truncated: String(truncatedBrokers.length > 0),
      });
      portfolioImportsTotal.inc({ source: "snaptrade", status: "success" });

      // Clear needs_attention if no disabled connections remain
      if (disabledConns.length === 0) {
        await setSnapTradeNeedsAttention(session.userId, false);
      }

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
      } catch (checkErr) {
        console.warn("[SnapTrade] Failed to check disabled status after fetch error:", checkErr instanceof Error ? checkErr.message : checkErr);
      }

      if (disabledConnections.length > 0) {
        await setSnapTradeNeedsAttention(session.userId, true);
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
