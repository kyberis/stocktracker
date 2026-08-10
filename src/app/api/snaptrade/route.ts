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
  listTransactionTradeFingerprints,
  addCashEntry,
  removeCashEntriesBySourceAndBrokers,
  upsertHoldingsFromPositions,
  detachSnapTradeHoldings,
  trackEvent,
  getSnapTradeBrokerSyncs,
  upsertSnapTradeBrokerSync,
  ensureSnapTradeBrokerSyncPlaceholder,
  deleteSnapTradeBrokerSync,
  setSnapTradeNeedsAttention,
  getSnapTradeNeedsAttention,
  addBrokerPortfolioMapping,
  getAllBrokerPortfolioMappings,
  removeBrokerPortfolioMappings,
  removeAllBrokerPortfolioMappings,
  mapTransactionsBySourceRef,
} from "@/lib/db";
import {
  registerUser,
  deleteUser,
  generateConnectionPortalUrl,
  fetchAllHoldings,
  fetchActivities,
  mergeSnapTradeTransactions,
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
import { effectivePlan, getSnapTradeConnectionLimit } from "@/lib/subscription";
import { deferTask, retryAsync } from "@/lib/task-runner";
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
    let statusCheckFailed = false;
    try {
      const userSecret = await getSnapTradeConnectionSecret(session.userId);
      if (userSecret) {
        // Transient SnapTrade API errors happen — retry once before giving up,
        // since silently returning empty lists here looks identical to "no
        // brokerage connections" from the client's perspective.
        const brokerageConns = await retryAsync(
          () => listBrokerageConnections(conn.snapTradeUserId, userSecret),
          { attempts: 2, baseDelayMs: 500 },
        );
        allBrokerageConnections = brokerageConns.map(({ id, brokerageName, disabled, disabledDate }) => ({
          id, brokerageName, disabled, disabledDate,
        }));
        disabledConnections = brokerageConns
          .filter((c) => c.disabled)
          .map(({ id, brokerageName, disabledDate }) => ({ id, brokerageName, disabledDate }));
      }
    } catch (err) {
      console.warn("[SnapTrade] Failed to check brokerage status during get-connection:", err instanceof Error ? err.message : err);
      statusCheckFailed = true;
    }

    const brokerSyncs = await getSnapTradeBrokerSyncs(session.userId);

    // Only trust this check's result when the live call actually succeeded —
    // on failure, fall back to the last known persisted value instead of
    // overwriting it with a false "all clear".
    const hasDisabled = statusCheckFailed
      ? await getSnapTradeNeedsAttention(session.userId)
      : disabledConnections.length > 0;
    if (!statusCheckFailed) {
      await setSnapTradeNeedsAttention(session.userId, hasDisabled);
    }

    const userForPlan = await findUserById(session.userId);
    const userPlan = effectivePlan(
      (userForPlan?.plan || session.plan) as SubscriptionPlan,
      userForPlan?.plan_expires_at ?? "",
    );

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
      statusCheckFailed,
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
  const plan = effectivePlan(
    (user?.plan || session.plan) as SubscriptionPlan,
    user?.plan_expires_at ?? "",
  );
  const connectionLimit = getSnapTradeConnectionLimit(plan);
  if (connectionLimit === 0) {
    return NextResponse.json(
      { error: "Broker sync requires a Trefolio subscription.", upgrade: true },
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
      // Only apply incremental startDate when we previously imported txs for
      // this authorization (last_imported_at set). Do NOT use JOIN tx counts —
      // after reconnect, old broker_name rows would incorrectly advance the cursor.
      const syncMap = new Map(
        brokerSyncs
          .filter((s) => !!s.lastImportedAt)
          .map((s) => [s.brokerageAuthorizationId, s.lastImportedAt]),
      );

      // Refresh ALL active broker connections so SnapTrade pulls latest data
      // from each broker before we read positions/activities.
      await Promise.allSettled(
        [...activeBrokerIds].map((bId) =>
          refreshBrokerageConnection(conn.snapTradeUserId, userSecret, bId)
        )
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
      // Do NOT set last_imported_at — that would skip the activity lag window.
      const refreshedBrokerIds: string[] = [];
      const allSyncedIds = new Set(brokerSyncs.map((s) => s.brokerageAuthorizationId));
      const brokersWithActivities = new Set(allTransactions.map((tx) => tx.brokerName));
      for (const bId of seenBrokerIds) {
        if (allSyncedIds.has(bId)) continue;
        const brokerInfo = fetchedBrokers.find((b) => b.id === bId);
        if (brokerInfo && brokersWithActivities.has(brokerInfo.name)) continue;
        await refreshBrokerageConnection(conn.snapTradeUserId, userSecret, bId);
        await ensureSnapTradeBrokerSyncPlaceholder(session.userId, bId, brokerInfo?.name || "Unknown");
        refreshedBrokerIds.push(bId);
      }

      const existingRefs = await listTransactionSourceRefs(session.userId);
      const existingFingerprints = await listTransactionTradeFingerprints(session.userId);

      const allActiveAccountIds = new Set(allActiveAccounts.map((a) => a.id));
      const institutionMap = new Map(allActiveAccounts.map((a) => [a.id, a.institution]));
      const holdingsResult = await fetchAllHoldings(conn.snapTradeUserId, userSecret, allActiveAccountIds, institutionMap);

      // Fill activity lag / empty post-reconnect caches with EXECUTED orders.
      const mergedTransactions = mergeSnapTradeTransactions(
        allTransactions,
        holdingsResult.orderTransactions,
        { existingFingerprints },
      );

      const deduped = mergedTransactions.filter(
        (tx) => !tx.sourceRef || !existingRefs.has(tx.sourceRef),
      );

      // Record broker↔portfolio mapping for the current portfolio so
      // future auto-syncs and manual re-syncs update all linked portfolios.
      if (portfolioId) {
        for (const brokerId of seenBrokerIds) {
          await addBrokerPortfolioMapping(session.userId, brokerId, portfolioId);
        }
      }

      // Collect all portfolios that should receive holdings/cash updates.
      // This includes the current portfolio plus any previously mapped ones.
      const brokerPortfolioMap = await getAllBrokerPortfolioMappings(session.userId);
      const allTargetPortfolioIds = new Set<string>();
      if (portfolioId) allTargetPortfolioIds.add(portfolioId);
      for (const pIds of brokerPortfolioMap.values()) {
        for (const pId of pIds) allTargetPortfolioIds.add(pId);
      }
      const targetPortfolios = allTargetPortfolioIds.size > 0
        ? [...allTargetPortfolioIds]
        : [portfolioId]; // fallback to current/default

      // Upsert holdings directly from broker positions — this is the source of
      // truth for what the user currently owns. Transactions are imported
      // separately for tax/performance but don't drive the holdings table.
      // When any connection is disabled, positions data is incomplete — skip
      // stale cleanup so we don't delete holdings we simply couldn't fetch.
      if (holdingsResult.holdings.length > 0) {
        for (const targetPId of targetPortfolios) {
          await upsertHoldingsFromPositions(session.userId, holdingsResult.holdings, targetPId, {
            skipStaleCleanup: disabledConns.length > 0,
          });
        }
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
              // keep original amount if FX conversion fails
            }
          }
          const label = broker ? `${broker.toUpperCase()} \u2013 ${currency}` : `Cash ${currency}`;
          cashEntries.push({ name: label, amountEUR, displayCurrency: currency, displayAmount });
        }

        for (const targetPId of targetPortfolios) {
          await removeCashEntriesBySourceAndBrokers(session.userId, "snaptrade", fetchedBrokerPrefixes, targetPId);
          for (const ce of cashEntries) {
            await addCashEntry(session.userId, {
              name: ce.name,
              amountEUR: ce.amountEUR,
              source: "snaptrade",
              displayCurrency: ce.displayCurrency,
              displayAmount: ce.displayAmount,
            }, targetPId);
            cashImported++;
          }
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

  /* ── Map imported transactions to additional portfolios ── */
  if (action === "map-transactions") {
    const portfolioId = (formData.get("portfolioId") as string) || undefined;
    const sourceRefsRaw = formData.get("sourceRefs") as string;

    if (!portfolioId || !sourceRefsRaw) {
      return NextResponse.json({ error: "Missing portfolioId or sourceRefs." }, { status: 400 });
    }

    let sourceRefs: string[];
    try {
      sourceRefs = JSON.parse(sourceRefsRaw);
    } catch {
      return NextResponse.json({ error: "Invalid sourceRefs format." }, { status: 400 });
    }

    const brokerPortfolioMap = await getAllBrokerPortfolioMappings(session.userId);
    const additionalPortfolioIds = new Set<string>();
    for (const pIds of brokerPortfolioMap.values()) {
      for (const pId of pIds) {
        if (pId !== portfolioId) additionalPortfolioIds.add(pId);
      }
    }

    let mapped = 0;
    for (const additionalPId of additionalPortfolioIds) {
      await mapTransactionsBySourceRef(session.userId, sourceRefs, additionalPId);
      mapped++;
    }

    return NextResponse.json({ mapped, portfolios: [...additionalPortfolioIds] });
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

    const userId = session.userId;
    const snapTradeUserId = conn.snapTradeUserId;

    deferTask(async () => {
      await detachSnapTradeHoldings(userId);
      try {
        await retryAsync(() =>
          removeBrokerageConnection(snapTradeUserId, userSecret, brokerConnectionId),
        );
      } catch {
        console.warn("[SnapTrade] removeBrokerageConnection failed after retries:", brokerConnectionId);
      }
      await deleteSnapTradeBrokerSync(userId, brokerConnectionId);
      await removeBrokerPortfolioMappings(userId, brokerConnectionId);
      trackEvent(userId, "snaptrade_disconnect_broker", { brokerConnectionId });
    });

    return NextResponse.json({ disconnected: true, brokerConnectionId });
  }

  /* ── Disconnect all ── */
  if (action === "disconnect") {
    const userId = session.userId;

    deferTask(async () => {
      await detachSnapTradeHoldings(userId);
      const conn = await getSnapTradeConnection(userId);
      if (conn) {
        try {
          await retryAsync(() => deleteUser(conn.snapTradeUserId));
        } catch {
          console.warn("[SnapTrade] deleteUser failed after retries:", conn.snapTradeUserId);
        }
        await deleteSnapTradeConnection(userId);
      }
      await removeAllBrokerPortfolioMappings(userId);
    });

    return NextResponse.json({ disconnected: true });
  }

  return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
});
