import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { listHoldings, addTransaction, trackEvent, addCashEntry, removeCashEntriesBySource, listTransactionSourceRefs, listTransactionContentFingerprints, rebuildHoldings, findUserById, findOrCreateBrokerAccount } from "@/lib/db";
import { dedupeParsedAgainstLedger } from "@/lib/transaction-fingerprint";
import { withMetrics } from "@/lib/with-metrics";
import { portfolioImportsTotal } from "@/lib/metrics";
import { buildIsinMap } from "@/lib/degiro-parser";
import { parseSimpleCSV } from "@/lib/simple-csv-parser";
import { getBrokerParser, detectBrokerFormat, type ParsedTransaction } from "@/lib/broker-parsers";
import { YahooProvider } from "@/lib/api-providers/yahoo";
import { enrichHoldingClassifications } from "@/lib/enrich-classifications";
import { deferTask, submitJob, getJobStatus } from "@/lib/task-runner";
import { runBackfillForUser } from "@/lib/backfill-snapshots";
import { materializeCurrentSnapshotsForUser } from "@/lib/cron-portfolio-snapshots";
import { getHoldingsLimit } from "@/lib/subscription";
import type { SubscriptionPlan } from "@/lib/types";
import { inferAssetType } from "@/lib/infer-asset-type";
import { blobToUtf8CsvOrPlainText } from "@/lib/spreadsheet-to-csv";
import {
  auditImportBatch,
  applyTransactionAutoFixes,
  buildQualityReport,
  fetchExchangeRatesForCurrencies,
  fetchQuotesForTickers,
  planHoldingAutoFixes,
  summarizeImportQuality,
} from "@/lib/import-quality";
import { updateHolding } from "@/lib/db/holdings";
import { KNOWN_ISINS } from "@/lib/known-isins";

async function runParseQualityPass(
  parsed: ParsedTransaction[],
  unmapped: string[],
  broker: string,
  reqHeaders?: Headers,
): Promise<ReturnType<typeof buildQualityReport>> {
  const yahoo = new YahooProvider();
  const tickers = parsed
    .filter((t) => t.ticker)
    .map((t) => ({ ticker: t.ticker, exchange: inferExchangeFromTicker(t.ticker) }));
  // Cap quote lookups during preview for large CSVs
  const capped = tickers.slice(0, 40);
  const quotes = await fetchQuotesForTickers(yahoo, capped);
  let rates = await fetchExchangeRatesForCurrencies(yahoo, [
    ...parsed.map((t) => t.currency),
    ...Object.values(quotes).map((q) => q.currency),
  ]);

  let findings = auditImportBatch({
    transactions: parsed,
    quotes,
    exchangeRates: rates,
    unmappedIsins: unmapped,
  });

  // Auto-fetch missing FX once, then re-audit
  if (findings.some((f) => f.code === "missing_fx")) {
    rates = await fetchExchangeRatesForCurrencies(yahoo, [
      ...parsed.map((t) => t.currency),
      ...Object.values(quotes).map((q) => q.currency),
      ...findings.filter((f) => f.code === "missing_fx").map((f) => String(f.evidence.currency || "")),
    ]);
    findings = auditImportBatch({
      transactions: parsed,
      quotes,
      exchangeRates: rates,
      unmappedIsins: unmapped,
    });
    for (const f of findings) {
      if (f.code === "missing_fx") {
        const ccy = String(f.evidence.currency || "");
        const pair = String(f.evidence.pair || "");
        if ((ccy && rates[`EUR${ccy}`]) || (pair && rates[pair])) {
          f.fixed = true;
          f.after = { fetched: true };
        }
      }
    }
  }

  const fixed = applyTransactionAutoFixes(parsed, findings, quotes);
  // mutate caller's array in place
  parsed.length = 0;
  parsed.push(...fixed.transactions);

  const aiSummary = await summarizeImportQuality({
    findings: fixed.findings,
    broker,
    headers: reqHeaders,
  });
  return buildQualityReport(fixed.findings, aiSummary);
}

async function runPostImportHoldingRepair(userId: string, portfolioId?: string): Promise<void> {
  try {
    const holdings = await listHoldings(userId, portfolioId);
    if (holdings.length === 0) return;
    const yahoo = new YahooProvider();
    const quotes = await fetchQuotesForTickers(
      yahoo,
      holdings.map((h) => ({ ticker: h.ticker, exchange: h.exchange })),
    );
    let rates = await fetchExchangeRatesForCurrencies(yahoo, [
      ...holdings.map((h) => h.displayCurrency),
      ...Object.values(quotes).map((q) => q.currency),
    ]);
    let findings = auditImportBatch({
      transactions: [],
      holdings: holdings.map((h) => ({
        id: h.id,
        ticker: h.ticker,
        name: h.name,
        isin: h.isin,
        shares: h.shares,
        purchasePrice: h.purchasePrice,
        displayCurrency: h.displayCurrency,
        exchange: h.exchange,
        valueInEUR: h.valueInEUR,
      })),
      quotes,
      exchangeRates: rates,
    });
    if (findings.some((f) => f.code === "missing_fx")) {
      rates = await fetchExchangeRatesForCurrencies(yahoo, [
        ...holdings.map((h) => h.displayCurrency),
        ...Object.values(quotes).map((q) => q.currency),
      ]);
      findings = auditImportBatch({
        transactions: [],
        holdings: holdings.map((h) => ({
          id: h.id,
          ticker: h.ticker,
          shares: h.shares,
          purchasePrice: h.purchasePrice,
          displayCurrency: h.displayCurrency,
          exchange: h.exchange,
          valueInEUR: h.valueInEUR,
        })),
        quotes,
        exchangeRates: rates,
      });
    }
    const { plans } = planHoldingAutoFixes(holdings, findings, quotes, rates);
    for (const plan of plans) {
      if (Object.keys(plan.updates).length === 0) continue;
      await updateHolding(userId, plan.holdingId, plan.updates);
    }
  } catch (err) {
    console.error("[import-broker] post-import quality repair failed:", err);
  }
}

async function resolveCsvFromFormData(formData: FormData): Promise<string> {
  const csvRaw = formData.get("csv");
  const file = formData.get("file");

  let csv = typeof csvRaw === "string" ? csvRaw : "";
  if (!csv && csvRaw && typeof csvRaw === "object" && typeof (csvRaw as Blob).arrayBuffer === "function") {
    const b = csvRaw as Blob;
    const fname = typeof File !== "undefined" && b instanceof File ? b.name : "";
    csv = await blobToUtf8CsvOrPlainText(b, fname);
  }
  if (!csv && file && typeof file === "object" && typeof (file as Blob).arrayBuffer === "function") {
    const b = file as Blob;
    const fname = typeof File !== "undefined" && b instanceof File ? b.name : "";
    csv = await blobToUtf8CsvOrPlainText(b, fname);
  }
  return csv;
}

const ISIN_LOOKUP_TIMEOUT_MS = 5_000;
const ISIN_BATCH_TIMEOUT_MS = 15_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | undefined> {
  return Promise.race([
    promise,
    new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), ms)),
  ]);
}

async function resolveIsinsViaYahoo(
  unmappedIsins: string[],
  isinMap: Record<string, string>
): Promise<Record<string, string>> {
  if (unmappedIsins.length === 0) return isinMap;
  const yahoo = new YahooProvider();
  const resolved = { ...isinMap };
  const MAX_LOOKUPS = 50;
  const batch = unmappedIsins.slice(0, MAX_LOOKUPS);

  const batchWork = Promise.all(
    batch.map(async (isin) => {
      try {
        const results = await withTimeout(yahoo.search(isin), ISIN_LOOKUP_TIMEOUT_MS);
        if (results && results.length > 0) {
          resolved[isin] = results[0].symbol;
        }
      } catch {
        // Skip — ISIN will remain unmapped
      }
    })
  );

  await withTimeout(batchWork, ISIN_BATCH_TIMEOUT_MS);
  return resolved;
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
  if (suffix === "HK") return "HKG";
  return "";
}

async function buildIsinMapForBroker(
  csv: string,
  userId: string,
  extractIsins?: (csv: string) => string[],
  skipYahoo = false,
  portfolioId?: string,
): Promise<Record<string, string>> {
  const holdings = await listHoldings(userId, portfolioId);
  let isinMap = { ...KNOWN_ISINS, ...buildIsinMap(holdings) };

  if (extractIsins) {
    const allIsins = extractIsins(csv);
    const unmapped = allIsins.filter((isin) => !isinMap[isin]);
    if (unmapped.length > 0 && !skipYahoo) {
      isinMap = await resolveIsinsViaYahoo(unmapped, isinMap);
    }
  }

  return isinMap;
}

async function importTransactions(
  userId: string,
  parsed: ParsedTransaction[],
  broker: string,
  csv: string,
  parseCashBalances?: (csv: string) => { currency: string; amount: number }[],
  plan?: SubscriptionPlan,
  brokerLabel?: string,
  portfolioId?: string,
): Promise<{ imported: number; cashImported: number; holdingsCapped?: number }> {
  const [existingRefs, existingFingerprints] = await Promise.all([
    listTransactionSourceRefs(userId),
    listTransactionContentFingerprints(userId),
  ]);
  const { deduped: toImport } = dedupeParsedAgainstLedger(parsed, existingRefs, existingFingerprints);

  const sorted = [...toImport].sort((a, b) => a.date.localeCompare(b.date));

  const account = await findOrCreateBrokerAccount(userId, broker, brokerLabel || broker.toUpperCase());

  const holdingsLimit = getHoldingsLimit(plan ?? "free");
  let holdingsCapped = 0;
  let allowedTickers: Set<string> | null = null;
  if (holdingsLimit < Infinity) {
    const existing = await listHoldings(userId, portfolioId);
    const existingTickerSet = new Set(existing.map((h) => `${h.ticker}|${h.exchange || ""}`));
    const newTickers = new Set<string>();
    for (const tx of sorted) {
      const key = `${tx.ticker}|${inferExchangeFromTicker(tx.ticker)}`;
      if (!existingTickerSet.has(key)) newTickers.add(key);
    }
    const slotsAvailable = Math.max(0, holdingsLimit - existing.length);
    if (newTickers.size > slotsAvailable) {
      const newArr = [...newTickers];
      const allowed = new Set(newArr.slice(0, slotsAvailable));
      holdingsCapped = newTickers.size - slotsAvailable;
      allowedTickers = new Set([...existingTickerSet, ...allowed]);
    }
  }

  let imported = 0;
  for (const tx of sorted) {
    if (allowedTickers) {
      const key = `${tx.ticker}|${inferExchangeFromTicker(tx.ticker)}`;
      if (!allowedTickers.has(key)) continue;
    }
    const assetType = inferAssetType({ name: tx.name });
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
      notes: tx.name || `${broker} import`,
      sourceRef: tx.sourceRef,
    }, portfolioId);
    if (created) imported++;
  }

  if (imported > 0) {
    await rebuildHoldings(userId, portfolioId);
    await runPostImportHoldingRepair(userId, portfolioId);
  }

  let cashImported = 0;
  if (parseCashBalances) {
    const cashBalances = parseCashBalances(csv);
    if (cashBalances.length > 0) {
      await removeCashEntriesBySource(userId, broker, portfolioId);

      const yahoo = new YahooProvider();
      for (const balance of cashBalances) {
        let amountEUR = balance.amount;
        if (balance.currency !== "EUR") {
          try {
            const rate = await yahoo.getExchangeRate(balance.currency, "EUR");
            if (rate > 0) amountEUR = +(balance.amount * rate).toFixed(2);
          } catch {
            // keep original amount if FX conversion fails
          }
        }
        await addCashEntry(userId, {
          name: `${(brokerLabel || broker).toUpperCase()} – ${balance.currency}`,
          amountEUR,
          source: broker,
          displayCurrency: balance.currency,
          displayAmount: balance.amount,
        }, portfolioId);
        cashImported++;
      }
    }
  }

  trackEvent(userId, "portfolio_import", { broker, count: String(imported) });
  portfolioImportsTotal.inc({ source: "broker", status: "success" });

  await enrichHoldingClassifications(userId).catch(() => {});

  if (imported > 0 || cashImported > 0) {
    deferTask(async () => {
      try {
        await runBackfillForUser(userId);
        await materializeCurrentSnapshotsForUser(userId);
      } catch (err) {
        console.error("[import-broker] snapshot pipeline failed:", err);
      }
    });
  }

  return { imported, cashImported, ...(holdingsCapped > 0 ? { holdingsCapped } : {}) };
}

/** POST /api/transactions/import-broker
 *  - action=parse:       parse CSV, return preview
 *  - action=import:      start async import, return { jobId }
 *  - action=status:      poll job progress
 *  - action=import-cash: import cash balances only
 */
export const POST = withMetrics("/api/transactions/import-broker", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  const formData = await req.formData();
  const action = formData.get("action") as string;
  let broker = formData.get("broker") as string;
  const portfolioId = (formData.get("portfolioId") as string) || undefined;

  /* ── Poll job status ── */
  if (action === "status") {
    const jobId = formData.get("jobId") as string;
    if (!jobId) return NextResponse.json({ error: "Missing jobId" }, { status: 400 });
    const status = getJobStatus(jobId);
    if (!status) return NextResponse.json({ error: "Job not found" }, { status: 404 });
    return NextResponse.json(status);
  }

  /* ── Read CSV / spreadsheet (Excel decoded server-side) ── */
  const csv = await resolveCsvFromFormData(formData);
  if (!csv) {
    portfolioImportsTotal.inc({ source: "broker", status: "error" });
    trackEvent(session.userId, "import_error", { method: "csv", reason: "parse_failed", broker });
    return NextResponse.json({ error: "No CSV data provided." }, { status: 400 });
  }

  const user = await findUserById(session.userId);
  const plan = (user?.plan || session.plan) ?? "free";

  // Auto-detect the broker format when the client didn't send one — the
  // simplified wizard no longer makes the user pick a broker upfront.
  // "simple" is never a detection candidate (its columns are too generic).
  let autoDetected = false;
  if (!broker) {
    const detected = detectBrokerFormat(csv);
    if (detected) {
      broker = detected;
      autoDetected = true;
    }
  }

  /* ── Simple CSV (legacy format) ── */
  if (broker === "simple") {
    const parsed = parseSimpleCSV(csv);

    if (action === "parse") {
      const [existingRefs, existingFingerprints] = await Promise.all([
        listTransactionSourceRefs(session.userId),
        listTransactionContentFingerprints(session.userId),
      ]);
      const { deduped, duplicatesRemoved } = dedupeParsedAgainstLedger(parsed, existingRefs, existingFingerprints);
      const summary = {
        total: deduped.length,
        buys: deduped.filter((t) => t.type === "buy").length,
        sells: deduped.filter((t) => t.type === "sell").length,
        dividends: deduped.filter((t) => t.type === "dividend").length,
        fees: deduped.filter((t) => t.type === "fee").length,
        unmapped: [] as string[],
        duplicatesRemoved,
      };
      return NextResponse.json({ transactions: deduped, summary });
    }

    if (action === "import") {
      const jobId = crypto.randomUUID();
      const userId = session.userId;

      submitJob(jobId, async () => {
        const asParsed: ParsedTransaction[] = parsed.map((tx) => ({
          date: tx.date, type: tx.type, ticker: tx.ticker, name: tx.name,
          isin: tx.isin, shares: tx.shares, pricePerShare: tx.pricePerShare,
          totalAmount: tx.totalAmount, fees: tx.fees, taxes: tx.taxes,
          currency: tx.currency, orderId: tx.orderId, sourceRef: tx.sourceRef,
        }));
        return importTransactions(userId, asParsed, "simple", csv, undefined, plan, "Simple CSV", portfolioId);
      });

      return NextResponse.json({ jobId }, { status: 202 });
    }
  }

  /* ── Registry-based broker parsers ── */
  const parser = getBrokerParser(broker);
  if (!parser) {
    // Client omitted a broker (new simplified wizard) and auto-detection
    // couldn't identify the format — fall back to AI extraction instead of
    // erroring, since the user never chose a format for us to reject.
    if (action === "parse" && !formData.get("broker")) {
      return NextResponse.json({ fallbackToAi: true, reason: "no_match" });
    }
    return NextResponse.json({ error: "Unsupported broker or action." }, { status: 400 });
  }

  /* ── import-cash: handled before transaction parsing to avoid unnecessary
   *    ISIN resolution / Yahoo lookups that could fail and block cash import ── */
  if (action === "import-cash") {
    if (!parser.parseCashBalances) {
      return NextResponse.json({ cashImported: 0 });
    }

    const cashBalances = parser.parseCashBalances(csv);
    if (cashBalances.length === 0) {
      return NextResponse.json({ cashImported: 0 });
    }

    await removeCashEntriesBySource(session.userId, broker, portfolioId);

    const yahoo = new YahooProvider();
    let cashImported = 0;
    for (const balance of cashBalances) {
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
        name: `${parser.label.toUpperCase()} – ${balance.currency}`,
        amountEUR,
        source: broker,
        displayCurrency: balance.currency,
        displayAmount: balance.amount,
      }, portfolioId);
      cashImported++;
    }
    return NextResponse.json({ cashImported });
  }

  let isinMap: Record<string, string>;
  let parsed: ParsedTransaction[];
  try {
    // Resolve ISINs via Yahoo during preview too (bounded to 50 lookups /
    // 15s), not just on final import — otherwise unrecognized ISINs resolve
    // to an empty ticker in the preview and get silently dropped at import
    // time before ever reaching the server.
    isinMap = await buildIsinMapForBroker(csv, session.userId, parser.extractIsins?.bind(parser), false, portfolioId);
    parsed = parser.parse(csv, isinMap);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[import-broker] parse error for ${broker}:`, msg);
    portfolioImportsTotal.inc({ source: "broker", status: "error" });
    trackEvent(session.userId, "import_error", { method: "csv", reason: "parse_failed", broker });
    // Auto-detected format threw while parsing (e.g. a fuzzy match like
    // MyInvestor's alias-based detector guessed wrong) — fall back to AI
    // rather than surfacing a raw parser error for a format the user never
    // chose themselves.
    if (action === "parse" && autoDetected) {
      return NextResponse.json({ fallbackToAi: true, reason: "no_match" });
    }
    return NextResponse.json({ error: `Failed to parse CSV: ${msg}` }, { status: 500 });
  }

  if (action === "parse") {
    const [existingRefs, existingFingerprints] = await Promise.all([
      listTransactionSourceRefs(session.userId),
      listTransactionContentFingerprints(session.userId),
    ]);
    const { deduped, duplicatesRemoved } = dedupeParsedAgainstLedger(parsed, existingRefs, existingFingerprints);
    const cashBalances = parser.parseCashBalances?.(csv) || [];

    const holdingsLimit = getHoldingsLimit(plan);
    let holdingsLimitInfo: { limit: number; currentCount: number; newTickers: number; willBeSkipped: number; skippedTickers: string[] } | undefined;
    if (holdingsLimit < Infinity) {
      const existing = await listHoldings(session.userId, portfolioId);
      const existingTickerSet = new Set(existing.map((h) => `${h.ticker}|${h.exchange || ""}`));
      const newTickerMap = new Map<string, string>();
      for (const tx of deduped) {
        if (tx.type !== "buy" || !tx.ticker) continue;
        const exch = inferExchangeFromTicker(tx.ticker);
        const key = `${tx.ticker}|${exch}`;
        if (!existingTickerSet.has(key) && !newTickerMap.has(key)) {
          newTickerMap.set(key, tx.ticker);
        }
      }
      const slotsAvailable = Math.max(0, holdingsLimit - existing.length);
      if (newTickerMap.size > slotsAvailable) {
        const allNew = [...newTickerMap.values()];
        holdingsLimitInfo = {
          limit: holdingsLimit,
          currentCount: existing.length,
          newTickers: newTickerMap.size,
          willBeSkipped: newTickerMap.size - slotsAvailable,
          skippedTickers: allNew.slice(slotsAvailable),
        };
      }
    }

    const unmapped = deduped
      .filter((t) => !t.ticker && t.isin)
      .map((t) => t.isin)
      .filter((v, i, a) => a.indexOf(v) === i);

    // Mutates deduped in place with safe auto-fixes (GBX units, currency align…)
    let qualityReport: ReturnType<typeof buildQualityReport> | undefined;
    try {
      qualityReport = await runParseQualityPass(deduped, unmapped, broker, req.headers);
    } catch (err) {
      console.error("[import-broker] quality pass failed:", err);
    }

    const summary = {
      total: deduped.length,
      buys: deduped.filter((t) => t.type === "buy").length,
      sells: deduped.filter((t) => t.type === "sell").length,
      dividends: deduped.filter((t) => t.type === "dividend").length,
      fees: deduped.filter((t) => t.type === "fee").length,
      unmapped,
      cashBalances,
      duplicatesRemoved,
      ...(holdingsLimitInfo ? { holdingsLimitInfo } : {}),
      ...(qualityReport ? { quality: qualityReport } : {}),
    };
    return NextResponse.json({
      transactions: deduped,
      summary,
      ...(autoDetected ? { detectedBroker: broker } : {}),
    });
  }

  if (action === "import") {
    const jobId = crypto.randomUUID();
    const userId = session.userId;
    submitJob(jobId, async () => {
      return importTransactions(
        userId,
        parsed,
        broker,
        csv,
        parser.parseCashBalances?.bind(parser),
        plan,
        parser.label,
        portfolioId,
      );
    });

    return NextResponse.json({ jobId }, { status: 202 });
  }

  return NextResponse.json({ error: "Unsupported broker or action." }, { status: 400 });
});
