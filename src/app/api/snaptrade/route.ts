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
  addCashEntry,
  removeCashEntriesBySourceAndBrokers,
  upsertHoldingsFromPositions,
  trackEvent,
  getSnapTradeBrokerSyncs,
  upsertSnapTradeBrokerSync,
  deleteSnapTradeBrokerSync,
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
  listBrokerages,
  removeBrokerageConnection,
  refreshBrokerageConnection,
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
 *   list-brokerages   — List all brokerages available via SnapTrade
 *   register-user     — Register SnapTrade user and store credentials
 *   connect-url       — Generate Connection Portal redirect URL
 *   reconnect-url     — Generate reconnect portal URL for a disabled connection
 *   fetch             — Pull holdings from all connected accounts
 *   disconnect        — Remove saved SnapTrade connection (all brokers)
 *   disconnect-broker — Remove a single brokerage connection
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

    let allBrokerageConnections: { id: string; brokerageName: string; disabled: boolean; disabledDate: string | null }[] = [];
    let disabledConnections: { id: string; brokerageName: string; disabledDate: string | null }[] = [];
    try {
      const userSecret = await getSnapTradeConnectionSecret(session.userId);
      if (userSecret) {
        const brokerageConns = await listBrokerageConnections(conn.snapTradeUserId, userSecret);
        allBrokerageConnections = brokerageConns.map(({ id, brokerageName, disabled, disabledDate }) => ({
          id, brokerageName, disabled, disabledDate,
        }));
        disabledConnections = brokerageConns
          .filter((c) => c.disabled)
          .map(({ id, brokerageName, disabledDate }) => ({ id, brokerageName, disabledDate }));
      }
    } catch (err) {
      console.warn("[SnapTrade] Failed to check brokerage status during get-connection:", err instanceof Error ? err.message : err);
    }

    const brokerSyncs = await getSnapTradeBrokerSyncs(session.userId);

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
      brokerageConnections: allBrokerageConnections,
      disabledConnections,
      brokerSyncs,
      connectionLimit: getSnapTradeConnectionLimit(userPlan),
      needsAttention: hasDisabled,
      activeBrokerCount: allBrokerageConnections.filter((c) => !c.disabled).length,
    });
  }

  /* ── List available brokerages (no Pro check) ── */
  if (action === "list-brokerages") {
    try {
      const brokerages = await listBrokerages();
      return NextResponse.json({ brokerages });
    } catch (err) {
      const msg = err instanceof SnapTradeClientError ? err.message : "Failed to list brokerages.";
      return NextResponse.json({ error: msg }, { status: 502 });
    }
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
      const allActiveAccounts = accounts.filter((a) => activeBrokerIds.has(a.brokerageAuthorizationId));
      const activeAccounts = allActiveAccounts;

      const brokerSyncs = await getSnapTradeBrokerSyncs(session.userId);
      const syncMap = new Map(
        brokerSyncs
          .filter((s) => s.transactionCount > 0)
          .map((s) => [s.brokerageAuthorizationId, s.lastImportedAt]),
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
            `[SnapTrade] Activities hit 10k limit for account "${acct.name}" (user=${session.userId}, startDate=${startDate || "none"})`,
          );
        }
      }

      // Per-broker refresh: if a broker returned 0 activities across all its
      // accounts and has no sync record yet, trigger a one-time refresh so
      // SnapTrade starts pulling transaction history for that broker.
      const refreshedBrokerIds: string[] = [];
      const allSyncedIds = new Set(brokerSyncs.map((s) => s.brokerageAuthorizationId));
      const brokersWithActivities = new Set(allTransactions.map((tx) => tx.brokerName));
      for (const bId of seenBrokerIds) {
        if (allSyncedIds.has(bId)) continue;
        const brokerInfo = fetchedBrokers.find((b) => b.id === bId);
        if (brokerInfo && brokersWithActivities.has(brokerInfo.name)) continue;
        await refreshBrokerageConnection(conn.snapTradeUserId, userSecret, bId);
        await upsertSnapTradeBrokerSync(session.userId, bId, brokerInfo?.name || "Unknown");
        refreshedBrokerIds.push(bId);
      }

      const existingRefs = await listTransactionSourceRefs(session.userId);
      const deduped = allTransactions.filter(
        (tx) => !tx.sourceRef || !existingRefs.has(tx.sourceRef),
      );

      const allActiveAccountIds = new Set(allActiveAccounts.map((a) => a.id));
      const institutionMap = new Map(allActiveAccounts.map((a) => [a.id, a.institution]));
      const holdingsResult = await fetchAllHoldings(conn.snapTradeUserId, userSecret, allActiveAccountIds, institutionMap);

      // Upsert holdings directly from broker positions — this is the source of
      // truth for what the user currently owns. Transactions are imported
      // separately for tax/performance but don't drive the holdings table.
      if (holdingsResult.holdings.length > 0) {
        await upsertHoldingsFromPositions(session.userId, holdingsResult.holdings, portfolioId);
      }

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
        await removeCashEntriesBySourceAndBrokers(session.userId, "snaptrade", fetchedBrokerPrefixes, portfolioId);

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
              // keep original amount if FX conversion fails
            }
          }
          const label = broker ? `${broker.toUpperCase()} \u2013 ${currency}` : `Cash ${currency}`;
          await addCashEntry(session.userId, {
            name: label,
            amountEUR,
            source: "snaptrade",
            displayCurrency: currency,
            displayAmount,
          }, portfolioId);
          cashImported++;
        }
      }

      for (const broker of fetchedBrokers) {
        const hasTxForBroker = deduped.some((tx) => tx.brokerName === broker.name);
        if (hasTxForBroker) {
          await upsertSnapTradeBrokerSync(session.userId, broker.id, broker.name);
        }
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

      return NextResponse.json({
        transactions: deduped,
        summary,
        cashImported,
        ...(refreshedBrokerIds.length > 0 ? { syncTriggered: true, refreshedBrokerIds } : {}),
      });
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

  /* ── Disconnect single broker ── */
  if (action === "disconnect-broker") {
    const brokerConnectionId = formData.get("brokerConnectionId") as string;
    if (!brokerConnectionId) {
      return NextResponse.json(
        { error: "Missing brokerConnectionId." },
        { status: 400 },
      );
    }

    const conn = await getSnapTradeConnection(session.userId);
    const userSecret = conn ? await getSnapTradeConnectionSecret(session.userId) : null;

    if (!conn || !userSecret) {
      return NextResponse.json(
        { error: "No SnapTrade connection found." },
        { status: 400 },
      );
    }

    try {
      await removeBrokerageConnection(conn.snapTradeUserId, userSecret, brokerConnectionId);
    } catch {
      // Connection may already be removed on SnapTrade side; continue with local cleanup
    }

    await deleteSnapTradeBrokerSync(session.userId, brokerConnectionId);

    trackEvent(session.userId, "snaptrade_disconnect_broker", { brokerConnectionId });

    return NextResponse.json({ disconnected: true, brokerConnectionId });
  }

  /* ── Disconnect all ── */
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
