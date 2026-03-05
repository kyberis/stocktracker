import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { listHoldings, addTransaction, trackEvent, listCashEntries, addCashEntry, removeCashEntry } from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";
import { portfolioImportsTotal } from "@/lib/metrics";
import { parseDegiroCSV, parseDegiroCashBalances, buildIsinMap, type DegiroTransaction } from "@/lib/degiro-parser";
import { parseSimpleCSV } from "@/lib/simple-csv-parser";
import { YahooProvider } from "@/lib/api-providers/yahoo";

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

function extractUniqueIsins(csv: string): string[] {
  const isins = new Set<string>();
  const lines = csv.split("\n").filter((l) => l.trim());
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    const isin = cols[4]?.replace(/"/g, "").trim() || "";
    if (/^[A-Z]{2}[A-Z0-9]{10}$/.test(isin)) isins.add(isin);
  }
  return Array.from(isins);
}

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

/** POST /api/transactions/import-broker
 *  - action=parse: parse CSV, return preview
 *  - action=import: actually save transactions
 */
export const POST = withMetrics("/api/transactions/import-broker", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  const formData = await req.formData();
  const action = formData.get("action") as string;
  const broker = formData.get("broker") as string;

  if (broker === "degiro") {
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

    const holdings = await listHoldings(session.userId);
    let isinMap = { ...KNOWN_ISINS, ...buildIsinMap(holdings) };

    const allIsins = extractUniqueIsins(csv);
    const unmapped = allIsins.filter((isin) => !isinMap[isin]);
    if (unmapped.length > 0) {
      isinMap = await resolveIsinsViaYahoo(unmapped, isinMap);
    }

    const parsed = parseDegiroCSV(csv, isinMap);

    if (action === "parse") {
      const cashBalances = parseDegiroCashBalances(csv);
      const summary = {
        total: parsed.length,
        buys: parsed.filter((t) => t.type === "buy").length,
        sells: parsed.filter((t) => t.type === "sell").length,
        dividends: parsed.filter((t) => t.type === "dividend").length,
        fees: parsed.filter((t) => t.type === "fee").length,
        unmapped: parsed.filter((t) => !t.ticker && t.isin).map((t) => t.isin).filter((v, i, a) => a.indexOf(v) === i),
        cashBalances,
      };
      return NextResponse.json({ transactions: parsed, summary });
    }

    if (action === "import") {
      // Sort chronologically so buys precede sells for correct holding sync
      const sorted = [...parsed].sort((a, b) => a.date.localeCompare(b.date));
      let imported = 0;
      for (const tx of sorted) {
        const nameUp = tx.name.toUpperCase();
        const assetType = (nameUp.includes("ETF") || nameUp.includes("UCITS")) ? "etf" : "stock";
        await addTransaction(session.userId, {
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
          notes: tx.name || "DEGIRO import",
        });
        imported++;
      }
      // Extract and save cash balances from the Saldo columns
      let cashImported = 0;
      const cashBalances = parseDegiroCashBalances(csv);
      if (cashBalances.length > 0) {
        const existingCash = await listCashEntries(session.userId);
        for (const entry of existingCash) {
          if (entry.name.startsWith("DEGIRO")) {
            await removeCashEntry(session.userId, entry.id);
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
          await addCashEntry(session.userId, {
            name: `DEGIRO – ${balance.currency}`,
            amountEUR,
          });
          cashImported++;
        }
      }

      trackEvent(session.userId, "portfolio_import", { broker: "degiro", count: String(imported) });
      portfolioImportsTotal.inc({ source: "broker", status: "success" });
      return NextResponse.json({ imported, cashImported });
    }

    if (action === "import-cash") {
      const cashBalances = parseDegiroCashBalances(csv);
      if (cashBalances.length === 0) {
        return NextResponse.json({ cashImported: 0 });
      }

      const existingCash = await listCashEntries(session.userId);
      for (const entry of existingCash) {
        if (entry.name.startsWith("DEGIRO")) {
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
          name: `DEGIRO – ${balance.currency}`,
          amountEUR,
        });
        cashImported++;
      }
      return NextResponse.json({ cashImported });
    }
  }

  if (broker === "simple") {
    const file = formData.get("file") as File | null;
    const csvText = formData.get("csv") as string | null;

    let csv = csvText || "";
    if (file && !csv) {
      csv = await file.text();
    }
    if (!csv) {
      return NextResponse.json({ error: "No CSV data provided." }, { status: 400 });
    }

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
      const sorted = [...parsed].sort((a, b) => a.date.localeCompare(b.date));
      let imported = 0;
      for (const tx of sorted) {
        await addTransaction(session.userId, {
          holdingId: "",
          ticker: tx.ticker,
          name: tx.name,
          exchange: inferExchangeFromTicker(tx.ticker),
          isin: "",
          assetType: "stock",
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
          notes: "Simple CSV import",
        });
        imported++;
      }
      trackEvent(session.userId, "portfolio_import", { broker: "simple", count: String(imported) });
      return NextResponse.json({ imported });
    }
  }

  return NextResponse.json({ error: "Unsupported broker or action." }, { status: 400 });
});
