import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import {
  findUserById,
  getSnapTradeConnection,
  getSnapTradeConnectionSecret,
  saveSnapTradeConnection,
  deleteSnapTradeConnection,
  detachSnapTradeHoldings,
  trackEvent,
  getSnapTradeBrokerSyncs,
  setSnapTradeNeedsAttention,
  getSnapTradeNeedsAttention,
  getAllBrokerPortfolioMappings,
  removeAllBrokerPortfolioMappings,
  mapTransactionsBySourceRef,
} from "@/lib/db";
import {
  registerUser,
  deleteUser,
  generateConnectionPortalUrl,
  listBrokerageConnections,
  listBrokerages,
  SnapTradeClientError,
} from "@/lib/snaptrade-client";
import { disconnectSnapTradeBroker } from "@/lib/snaptrade-disconnect";
import { runSnapTradeFetch } from "@/lib/snaptrade-fetch";
import { withMetrics } from "@/lib/with-metrics";
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
      trackEvent(session.userId, "import_error", { method: "broker_sync", reason: "register_failed" });
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
      const broker = ((formData.get("broker") as string) || "").trim() || undefined;
      const { redirectUrl, sessionId } = await generateConnectionPortalUrl(
        conn.snapTradeUserId,
        userSecret,
        undefined,
        customRedirect,
        broker,
      );
      return NextResponse.json({ redirectUrl, sessionId });
    } catch (err) {
      const msg = err instanceof SnapTradeClientError ? err.message : "Failed to generate connection URL.";
      trackEvent(session.userId, "import_error", { method: "broker_sync", reason: "connect_url_failed" });
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
      trackEvent(session.userId, "import_error", { method: "broker_sync", reason: "reconnect_failed" });
      return NextResponse.json({ error: msg }, { status: 502 });
    }
  }

  /* ── Fetch transaction history + cash from all connected brokers ── */
  if (action === "fetch") {
    const portfolioId = (formData.get("portfolioId") as string) || undefined;
    const customStartDate = (formData.get("startDate") as string) || undefined;
    let brokerDateOverrides: Record<string, string> = {};
    try {
      const raw = formData.get("brokerStartDates") as string;
      if (raw) brokerDateOverrides = JSON.parse(raw);
    } catch { /* ignore parse errors */ }

    const result = await runSnapTradeFetch(session.userId, {
      portfolioId,
      customStartDate,
      brokerDateOverrides,
    });
    if (!result.ok) {
      return NextResponse.json(
        {
          error: result.error,
          needsReconnect: result.needsReconnect,
          disabledConnections: result.disabledConnections,
        },
        { status: result.status },
      );
    }
    return NextResponse.json({
      transactions: result.transactions,
      summary: result.summary,
      cashImported: result.cashImported,
      positionsSynced: result.positionsSynced,
      ...(result.refreshedBrokerIds?.length
        ? { syncTriggered: true, refreshedBrokerIds: result.refreshedBrokerIds }
        : {}),
    });
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
      await disconnectSnapTradeBroker({
        userId,
        snapTradeUserId,
        userSecret,
        brokerConnectionId,
      });
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
