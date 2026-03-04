import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { listHoldings, addTransaction, trackEvent } from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";
import { portfolioImportsTotal } from "@/lib/metrics";
import { parseDegiroCSV, buildIsinMap, type DegiroTransaction } from "@/lib/degiro-parser";
import { parseSimpleCSV } from "@/lib/simple-csv-parser";

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
  "CA21037X1006": "W9C",
  "DE000A3H2200": "NA9.DE",
  "DK0062498333": "NOVO-B.CO",
  "ES0148396007": "ITX.MC",
  "GB00BG5NDX91": "SRB.L",
  "IE00B6R52036": "IS0E",
  "IE00BJ5JPG56": "ICGA",
};

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
    const isinMap = { ...KNOWN_ISINS, ...buildIsinMap(holdings) };
    const parsed = parseDegiroCSV(csv, isinMap);

    if (action === "parse") {
      const summary = {
        total: parsed.length,
        buys: parsed.filter((t) => t.type === "buy").length,
        sells: parsed.filter((t) => t.type === "sell").length,
        dividends: parsed.filter((t) => t.type === "dividend").length,
        fees: parsed.filter((t) => t.type === "fee").length,
        unmapped: parsed.filter((t) => !t.ticker && t.isin).map((t) => t.isin).filter((v, i, a) => a.indexOf(v) === i),
      };
      return NextResponse.json({ transactions: parsed, summary });
    }

    if (action === "import") {
      let imported = 0;
      for (const tx of parsed) {
        const assetType = tx.name.toUpperCase().includes("ETF") ? "etf" : "stock";
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
      trackEvent(session.userId, "portfolio_import", { broker: "degiro", count: String(imported) });
      portfolioImportsTotal.inc({ source: "broker", status: "success" });
      return NextResponse.json({ imported });
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
      let imported = 0;
      for (const tx of parsed) {
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
