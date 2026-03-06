import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { listHoldings, addTransaction, trackEvent, listCashEntries, addCashEntry, removeCashEntry, listTransactionSourceRefs, rebuildHoldings, findUserById } from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";
import { portfolioImportsTotal } from "@/lib/metrics";
import { buildIsinMap } from "@/lib/degiro-parser";
import { parseSimpleCSV } from "@/lib/simple-csv-parser";
import { getBrokerParser, type ParsedTransaction } from "@/lib/broker-parsers";
import { YahooProvider } from "@/lib/api-providers/yahoo";
import { enrichHoldingClassifications } from "@/lib/enrich-classifications";
import { deferTask, submitJob, getJobStatus } from "@/lib/task-runner";
import { PLATFORM_LIMITS } from "@/lib/platform-config";

const KNOWN_ISINS: Record<string, string> = {
  "CA0641491075": "BNS",
  "CA1363851017": "CNQ",
  "VGG273581030": "DESP",
  "NL0013654783": "PRX.AS",
  "IE00B02KXH56": "IJPA.L",
  "IE0031442068": "IUSA.L",
  "IE00B4X9L533": "HMWO.L",
  "IE00B3VVMM84": "VFEM.L",
  "IE00B1TXK627": "IH2O.L",
  "IE00BQT3WG13": "ICGA.DE",
  "IE00BGSF1X88": "IB01.L",
  "US1462805086": "SILA",
  "US00724F1012": "ADBE",
  "US6701002056": "NVO",
  "US8740391003": "TSM",
  "US02079K3059": "GOOGL",
  "US0231351067": "AMZN",
  "US0846707026": "BRK-B",
  "US1667641005": "CVX",
  "US29670G1022": "WTRG",
  "US5007541064": "KHC",
  "US56035L1044": "MAIN",
  "US6374171063": "NNN",
  "US6745991058": "OXY",
  "US7170811035": "PFE",
  "US7561091049": "O",
  "US8299331004": "SIRI",
  "US92343V1044": "VZ",
  "CA21037X1006": "W9C.F",
  "DE000A3H2200": "NA9.DE",
  "DK0062498333": "NOVO-B.CO",
  "ES0148396007": "ITX.MC",
  "GB00BG5NDX91": "SRB.L",
  "IE00B6R52036": "IS0E.DE",
  "IE00BJ5JPG56": "ICGA.DE",
  "IE00B53HP851": "ISF.L",
  "IE00B5BMR087": "SXR8.DE",
  "IE0032077012": "EQQQ.L",
  "IE00B3XXRP09": "VUSA.L",
  "IE00B8GKDB10": "VHYL.L",
  "IE000ZIJ5B20": "WCOS.L",
};

async function resolveIsinsViaYahoo(
  unmappedIsins: string[],
  isinMap: Record<string, string>
): Promise<Record<string, string>> {
  if (unmappedIsins.length === 0) return isinMap;
  const yahoo = new YahooProvider();
  const resolved = { ...isinMap };
  const MAX_LOOKUPS = 15;
  const batch = unmappedIsins.slice(0, MAX_LOOKUPS);

  await Promise.all(
    batch.map(async (isin) => {
      try {
        const results = await yahoo.search(isin);
        if (results.length > 0) {
          resolved[isin] = results[0].symbol;
        }
      } catch {
        // Skip — ISIN will remain unmapped
      }
    })
  );
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
  return "";
}

async function buildIsinMapForBroker(
  csv: string,
  userId: string,
  extractIsins?: (csv: string) => string[],
): Promise<Record<string, string>> {
  const holdings = await listHoldings(userId);
  let isinMap = { ...KNOWN_ISINS, ...buildIsinMap(holdings) };

  if (extractIsins) {
    const allIsins = extractIsins(csv);
    const unmapped = allIsins.filter((isin) => !isinMap[isin]);
    if (unmapped.length > 0) {
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
  isPro?: boolean,
): Promise<{ imported: number; cashImported: number; holdingsCapped?: number }> {
  const existingRefs = await listTransactionSourceRefs(userId);
  const toImport = parsed.filter((tx) => !existingRefs.has(tx.sourceRef));

  const sorted = [...toImport].sort((a, b) => a.date.localeCompare(b.date));

  let holdingsCapped = 0;
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
    const nameUp = (tx.name || "").toUpperCase();
    const assetType = (nameUp.includes("ETF") || nameUp.includes("UCITS")) ? "etf" : "stock";
    await addTransaction(userId, {
      holdingId: "",
      ticker: tx.ticker,
      name: tx.name,
      exchange: inferExchangeFromTicker(tx.ticker),
      isin: tx.isin,
      assetType,
      accountId: "",
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
    });
    imported++;
  }

  if (imported > 0) {
    await rebuildHoldings(userId);
  }

  let cashImported = 0;
  if (parseCashBalances) {
    const cashBalances = parseCashBalances(csv);
    if (cashBalances.length > 0) {
      const existingCash = await listCashEntries(userId);
      const brokerUpper = broker.toUpperCase();
      for (const entry of existingCash) {
        if (entry.name.toUpperCase().startsWith(brokerUpper)) {
          await removeCashEntry(userId, entry.id);
        }
      }

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
          name: `${broker.toUpperCase()} – ${balance.currency}`,
          amountEUR,
        });
        cashImported++;
      }
    }
  }

  trackEvent(userId, "portfolio_import", { broker, count: String(imported) });
  portfolioImportsTotal.inc({ source: "broker", status: "success" });

  await enrichHoldingClassifications(userId).catch(() => {});

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
  const broker = formData.get("broker") as string;

  /* ── Poll job status ── */
  if (action === "status") {
    const jobId = formData.get("jobId") as string;
    if (!jobId) return NextResponse.json({ error: "Missing jobId" }, { status: 400 });
    const status = getJobStatus(jobId);
    if (!status) return NextResponse.json({ error: "Job not found" }, { status: 404 });
    return NextResponse.json(status);
  }

  /* ── Read CSV data ── */
  const file = formData.get("file") as File | null;
  const csvText = formData.get("csv") as string | null;
  let csv = csvText || "";
  if (file && !csv) {
    csv = await file.text();
  }
  if (!csv) {
    portfolioImportsTotal.inc({ source: "broker", status: "error" });
    return NextResponse.json({ error: "No CSV data provided." }, { status: 400 });
  }

  const user = await findUserById(session.userId);
  const isPro = (user?.plan || session.plan) === "pro";

  /* ── Simple CSV (legacy format) ── */
  if (broker === "simple") {
    const parsed = parseSimpleCSV(csv);

    if (action === "parse") {
      const summary = {
        total: parsed.length,
        buys: parsed.filter((t) => t.type === "buy").length,
        sells: parsed.filter((t) => t.type === "sell").length,
        dividends: parsed.filter((t) => t.type === "dividend").length,
        fees: parsed.filter((t) => t.type === "fee").length,
        unmapped: [] as string[],
      };
      return NextResponse.json({ transactions: parsed, summary });
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
        return importTransactions(userId, asParsed, "simple", csv, undefined, isPro);
      });

      return NextResponse.json({ jobId }, { status: 202 });
    }
  }

  /* ── Registry-based broker parsers ── */
  const parser = getBrokerParser(broker);
  if (!parser) {
    return NextResponse.json({ error: "Unsupported broker or action." }, { status: 400 });
  }

  const isinMap = await buildIsinMapForBroker(csv, session.userId, parser.extractIsins?.bind(parser));
  const parsed = parser.parse(csv, isinMap);

  if (action === "parse") {
    const cashBalances = parser.parseCashBalances?.(csv) || [];
    const summary = {
      total: parsed.length,
      buys: parsed.filter((t) => t.type === "buy").length,
      sells: parsed.filter((t) => t.type === "sell").length,
      dividends: parsed.filter((t) => t.type === "dividend").length,
      fees: parsed.filter((t) => t.type === "fee").length,
      unmapped: parsed
        .filter((t) => !t.ticker && t.isin)
        .map((t) => t.isin)
        .filter((v, i, a) => a.indexOf(v) === i),
      cashBalances,
    };
    return NextResponse.json({ transactions: parsed, summary });
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
        isPro,
      );
    });

    return NextResponse.json({ jobId }, { status: 202 });
  }

  if (action === "import-cash") {
    if (!parser.parseCashBalances) {
      return NextResponse.json({ cashImported: 0 });
    }

    const cashBalances = parser.parseCashBalances(csv);
    if (cashBalances.length === 0) {
      return NextResponse.json({ cashImported: 0 });
    }

    const existingCash = await listCashEntries(session.userId);
    const brokerUpper = parser.label.toUpperCase();
    for (const entry of existingCash) {
      if (entry.name.toUpperCase().startsWith(brokerUpper)) {
        await removeCashEntry(session.userId, entry.id);
      }
    }

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
      });
      cashImported++;
    }
    return NextResponse.json({ cashImported });
  }

  return NextResponse.json({ error: "Unsupported broker or action." }, { status: 400 });
});
