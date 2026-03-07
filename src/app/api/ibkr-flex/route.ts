import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import {
  findUserById,
  getIbkrConnection,
  getIbkrConnectionToken,
  saveIbkrConnection,
  updateIbkrLastSynced,
  deleteIbkrConnection,
  listHoldings,
  listTransactionSourceRefs,
  addTransaction,
  rebuildHoldings,
  findOrCreateBrokerAccount,
  trackEvent,
} from "@/lib/db";
import { buildIsinMap } from "@/lib/degiro-parser";
import { getBrokerParser, type ParsedTransaction } from "@/lib/broker-parsers";
import { YahooProvider } from "@/lib/api-providers/yahoo";
import { enrichHoldingClassifications } from "@/lib/enrich-classifications";
import { fetchFlexReport, FlexServiceError } from "@/lib/ibkr-flex-client";
import { submitJob, getJobStatus } from "@/lib/task-runner";
import { withMetrics } from "@/lib/with-metrics";
import { portfolioImportsTotal } from "@/lib/metrics";
import { PLATFORM_LIMITS } from "@/lib/platform-config";

const KNOWN_ISINS: Record<string, string> = {
  CA0641491075: "BNS", CA1363851017: "CNQ", VGG273581030: "DESP",
  NL0013654783: "PRX.AS", US00724F1012: "ADBE", US6701002056: "NVO",
  US02079K3059: "GOOGL", US0231351067: "AMZN", US0846707026: "BRK-B",
};

const ISIN_LOOKUP_TIMEOUT_MS = 5_000;
const ISIN_BATCH_TIMEOUT_MS = 15_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | undefined> {
  return Promise.race([
    promise,
    new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), ms)),
  ]);
}

function inferExchangeFromTicker(ticker: string): string {
  if (!ticker) return "";
  const parts = ticker.split(".");
  if (parts.length < 2) return "NASDAQ";
  const suffix = parts[1].toUpperCase();
  if (suffix === "AS") return "AMS";
  if (suffix === "MC") return "MAD";
  if (suffix === "L") return "LSE";
  if (suffix === "DE" || suffix === "F") return "XET";
  if (suffix === "CO") return "OMK";
  if (suffix === "TO") return "TSE";
  return "";
}

async function resolveIsinsViaYahoo(
  unmappedIsins: string[],
  isinMap: Record<string, string>,
): Promise<Record<string, string>> {
  if (unmappedIsins.length === 0) return isinMap;
  const yahoo = new YahooProvider();
  const resolved = { ...isinMap };
  const batch = unmappedIsins.slice(0, 50);

  const batchWork = Promise.all(
    batch.map(async (isin) => {
      try {
        const results = await withTimeout(yahoo.search(isin), ISIN_LOOKUP_TIMEOUT_MS);
        if (results && results.length > 0) resolved[isin] = results[0].symbol;
      } catch { /* skip */ }
    }),
  );

  await withTimeout(batchWork, ISIN_BATCH_TIMEOUT_MS);
  return resolved;
}

async function importTransactions(
  userId: string,
  parsed: ParsedTransaction[],
  isPro: boolean,
): Promise<{ imported: number }> {
  const existingRefs = await listTransactionSourceRefs(userId);
  const toImport = parsed.filter((tx) => !existingRefs.has(tx.sourceRef));
  const sorted = [...toImport].sort((a, b) => a.date.localeCompare(b.date));

  const account = await findOrCreateBrokerAccount(userId, "interactive_brokers", "Interactive Brokers");

  let allowedTickers: Set<string> | null = null;
  if (!isPro) {
    const existing = await listHoldings(userId);
    const existingTickerSet = new Set(existing.map((h) => `${h.ticker}|${h.exchange || ""}`));
    const newTickers = new Set<string>();
    for (const tx of sorted) {
      const key = `${tx.ticker}|${inferExchangeFromTicker(tx.ticker)}`;
      if (!existingTickerSet.has(key)) newTickers.add(key);
    }
    const slotsAvailable = Math.max(0, PLATFORM_LIMITS.FREE_HOLDINGS_LIMIT - existing.length);
    if (newTickers.size > slotsAvailable) {
      const allowed = new Set([...newTickers].slice(0, slotsAvailable));
      allowedTickers = new Set([...existingTickerSet, ...allowed]);
    }
  }

  let imported = 0;
  for (const tx of sorted) {
    if (allowedTickers) {
      const key = `${tx.ticker}|${inferExchangeFromTicker(tx.ticker)}`;
      if (!allowedTickers.has(key)) continue;
    }
    const nameUp = (tx.name || "").toUpperCase();
    const assetType = (nameUp.includes("ETF") || nameUp.includes("UCITS")) ? "etf" : "stock";
    const created = await addTransaction(userId, {
      holdingId: "",
      ticker: tx.ticker,
      name: tx.name,
      exchange: inferExchangeFromTicker(tx.ticker),
      isin: tx.isin,
      assetType,
      accountId: account.id,
      type: tx.type,
      date: tx.date,
      shares: tx.shares,
      pricePerShare: tx.pricePerShare,
      totalAmount: tx.totalAmount,
      fees: tx.fees,
      taxes: tx.taxes,
      currency: tx.currency,
      displayCurrency: tx.currency,
      exchangeRateEur: tx.exchangeRateEur,
      notes: tx.name || "IBKR Flex import",
      sourceRef: tx.sourceRef,
    });
    if (created) imported++;
  }

  if (imported > 0) await rebuildHoldings(userId);

  trackEvent(userId, "portfolio_import", { broker: "ibkr_flex_api", count: String(imported) });
  portfolioImportsTotal.inc({ source: "broker", status: "success" });

  await enrichHoldingClassifications(userId).catch(() => {});

  return { imported };
}

/**
 * POST /api/ibkr-flex
 *
 * Actions:
 *   fetch            — Fetch portfolio via Flex API, return parsed preview
 *   import           — Fetch + import as async job
 *   status           — Poll job progress
 *   save-connection  — Store encrypted token + queryId
 *   delete-connection— Remove saved credentials
 *   get-connection   — Check if a connection exists (metadata only)
 */
export const POST = withMetrics("/api/ibkr-flex", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  const formData = await req.formData();
  const action = formData.get("action") as string;

  /* ── Get connection (no Pro check — just metadata) ── */
  if (action === "get-connection") {
    const conn = await getIbkrConnection(session.userId);
    if (!conn) return NextResponse.json({ connected: false });
    return NextResponse.json({
      connected: true,
      queryId: conn.queryId,
      label: conn.label,
      lastSyncedAt: conn.lastSyncedAt,
      createdAt: conn.createdAt,
    });
  }

  /* ── Poll job status ── */
  if (action === "status") {
    const jobId = formData.get("jobId") as string;
    if (!jobId) return NextResponse.json({ error: "Missing jobId" }, { status: 400 });
    const status = getJobStatus(jobId);
    if (!status) return NextResponse.json({ error: "Job not found" }, { status: 404 });
    return NextResponse.json(status);
  }

  /* ── Pro check for all remaining actions ── */
  const user = await findUserById(session.userId);
  const isPro = (user?.plan || session.plan) === "pro";
  if (!isPro) {
    return NextResponse.json(
      { error: "IBKR API import requires a Pro subscription.", upgrade: true },
      { status: 403 },
    );
  }

  /* ── Delete connection ── */
  if (action === "delete-connection") {
    await deleteIbkrConnection(session.userId);
    return NextResponse.json({ deleted: true });
  }

  /* ── Save connection ── */
  if (action === "save-connection") {
    const token = formData.get("token") as string;
    const queryId = formData.get("queryId") as string;
    const label = (formData.get("label") as string) || "";
    if (!token || !queryId) {
      return NextResponse.json({ error: "Token and Query ID are required." }, { status: 400 });
    }
    const conn = await saveIbkrConnection(session.userId, token, queryId, label);
    return NextResponse.json({
      saved: true,
      queryId: conn.queryId,
      label: conn.label,
      lastSyncedAt: conn.lastSyncedAt,
    });
  }

  /* ── Fetch / Import — get token + queryId ── */
  let token = formData.get("token") as string;
  let queryId = formData.get("queryId") as string;
  const useSaved = formData.get("useSaved") === "true";

  if (useSaved || (!token && !queryId)) {
    const savedToken = await getIbkrConnectionToken(session.userId);
    const conn = await getIbkrConnection(session.userId);
    if (!savedToken || !conn) {
      return NextResponse.json(
        { error: "No saved IBKR connection found. Please provide token and Query ID." },
        { status: 400 },
      );
    }
    token = savedToken;
    queryId = conn.queryId;
  }

  if (!token || !queryId) {
    return NextResponse.json({ error: "Token and Query ID are required." }, { status: 400 });
  }

  /* ── Fetch from Flex Web Service ── */
  if (action === "fetch" || action === "import") {
    let csv: string;
    try {
      const result = await fetchFlexReport(token, queryId);
      csv = result.data;
    } catch (err) {
      const message = err instanceof FlexServiceError ? err.message : "Failed to fetch from IBKR.";
      portfolioImportsTotal.inc({ source: "broker", status: "error" });
      return NextResponse.json({ error: message }, { status: 502 });
    }

    if (!csv || csv.trim().length === 0) {
      return NextResponse.json({ error: "IBKR returned an empty statement." }, { status: 502 });
    }

    const parser = getBrokerParser("interactive_brokers")!;
    let isinMap: Record<string, string> = { ...KNOWN_ISINS };
    const holdings = await listHoldings(session.userId);
    isinMap = { ...isinMap, ...buildIsinMap(holdings) };

    if (parser.extractIsins) {
      const allIsins = parser.extractIsins(csv);
      const unmapped = allIsins.filter((isin) => !isinMap[isin]);
      if (unmapped.length > 0 && action !== "fetch") {
        isinMap = await resolveIsinsViaYahoo(unmapped, isinMap);
      }
    }

    let parsed: ParsedTransaction[];
    try {
      parsed = parser.parse(csv, isinMap);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[ibkr-flex] parse error:", msg);
      return NextResponse.json({ error: `Failed to parse IBKR statement: ${msg}` }, { status: 500 });
    }

    if (parsed.length === 0 && csv.length > 100) {
      const isFlexQuery = csv.trimStart().startsWith('"ClientAccountID"');
      if (isFlexQuery) {
        return NextResponse.json(
          { error: "Your Flex Query returned data but contains no trades or dividends. Please edit your Flex Query in IBKR Client Portal and add the Trades, Dividends, and Withholding Tax sections, then try again." },
          { status: 422 },
        );
      }
    }

    if (action === "fetch") {
      const existingRefs = await listTransactionSourceRefs(session.userId);
      const deduped = parsed.filter((tx) => !tx.sourceRef || !existingRefs.has(tx.sourceRef));
      const summary = {
        total: deduped.length,
        buys: deduped.filter((t) => t.type === "buy").length,
        sells: deduped.filter((t) => t.type === "sell").length,
        dividends: deduped.filter((t) => t.type === "dividend").length,
        fees: deduped.filter((t) => t.type === "fee").length,
        unmapped: deduped
          .filter((t) => !t.ticker && t.isin)
          .map((t) => t.isin)
          .filter((v, i, a) => a.indexOf(v) === i),
        duplicatesRemoved: parsed.length - deduped.length,
      };
      return NextResponse.json({ transactions: deduped, summary });
    }

    // action === "import"
    const jobId = crypto.randomUUID();
    const userId = session.userId;
    const saveConnection = formData.get("saveConnection") === "true";

    submitJob(jobId, async () => {
      const result = await importTransactions(userId, parsed, isPro);
      await updateIbkrLastSynced(userId);
      if (saveConnection) {
        await saveIbkrConnection(userId, token, queryId);
      }
      return result;
    });

    return NextResponse.json({ jobId }, { status: 202 });
  }

  return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
});
