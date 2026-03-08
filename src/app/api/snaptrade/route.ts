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
} from "@/lib/db";
import {
  registerUser,
  deleteUser,
  generateConnectionPortalUrl,
  fetchAllHoldings,
  SnapTradeClientError,
} from "@/lib/snaptrade-client";
import { YahooProvider } from "@/lib/api-providers/yahoo";
import { withMetrics } from "@/lib/with-metrics";
import { portfolioImportsTotal } from "@/lib/metrics";

/**
 * POST /api/snaptrade
 *
 * Actions:
 *   get-connection    — Check if a SnapTrade connection exists (no Pro check)
 *   register-user     — Register SnapTrade user and store credentials
 *   connect-url       — Generate Connection Portal redirect URL
 *   save-connection   — Store SnapTrade connection after OAuth flow
 *   fetch             — Pull holdings from all connected accounts
 *   disconnect        — Remove saved SnapTrade connection
 */
export const POST = withMetrics("/api/snaptrade", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  const formData = await req.formData();
  const action = formData.get("action") as string;

  /* ── Get connection (no Pro check — just metadata) ── */
  if (action === "get-connection") {
    const conn = await getSnapTradeConnection(session.userId);
    if (!conn) return NextResponse.json({ connected: false });
    return NextResponse.json({
      connected: true,
      snapTradeUserId: conn.snapTradeUserId,
      label: conn.label,
      lastSyncedAt: conn.lastSyncedAt,
      createdAt: conn.createdAt,
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

  /* ── Fetch holdings from all connected accounts ── */
  if (action === "fetch") {
    const conn = await getSnapTradeConnection(session.userId);
    const userSecret = conn ? await getSnapTradeConnectionSecret(session.userId) : null;

    if (!conn || !userSecret) {
      return NextResponse.json(
        { error: "No SnapTrade connection found. Please connect a brokerage first." },
        { status: 400 },
      );
    }

    try {
      const result = await fetchAllHoldings(conn.snapTradeUserId, userSecret);

      const existingRefs = await listTransactionSourceRefs(session.userId);
      const deduped = result.transactions.filter(
        (tx) => !tx.sourceRef || !existingRefs.has(tx.sourceRef),
      );

      const summary = {
        total: deduped.length,
        buys: deduped.filter((t) => t.type === "buy").length,
        sells: deduped.filter((t) => t.type === "sell").length,
        dividends: deduped.filter((t) => t.type === "dividend").length,
        fees: deduped.filter((t) => t.type === "fee").length,
        cashBalances: result.cashBalances,
        accounts: result.accounts,
        duplicatesRemoved: result.transactions.length - deduped.length,
      };

      let cashImported = 0;
      if (result.cashBalances.length > 0) {
        const existingCash = await listCashEntries(session.userId);
        for (const entry of existingCash) {
          if (entry.name.toUpperCase().startsWith("CASH ")) {
            await removeCashEntry(session.userId, entry.id);
          }
        }

        const yahoo = new YahooProvider();
        for (const balance of result.cashBalances) {
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
          });
          cashImported++;
        }
      }

      await updateSnapTradeLastSynced(session.userId);
      trackEvent(session.userId, "snaptrade_fetch", { accounts: String(result.accounts.length), positions: String(deduped.length), cash: String(cashImported) });
      portfolioImportsTotal.inc({ source: "snaptrade", status: "success" });

      return NextResponse.json({ transactions: deduped, summary, cashImported });
    } catch (err) {
      const msg = err instanceof SnapTradeClientError ? err.message : "Failed to fetch holdings from SnapTrade.";
      portfolioImportsTotal.inc({ source: "snaptrade", status: "error" });
      return NextResponse.json({ error: msg }, { status: 502 });
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
