import { NextRequest, NextResponse } from "next/server";
import { requireFeatureQuota } from "@/lib/auth/guards";
import { refundFeatureQuota } from "@/lib/feature-quotas";
import { listHoldings, listTransactions, listCashEntries, trackEvent, isFeatureEnabled } from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";
import { json401 } from "@/lib/log-unauthorized";

function escapeCsv(val: string): string {
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

export const GET = withMetrics("/api/export/portfolio", async (req: NextRequest) => {
  const { session, error } = await requireFeatureQuota(req, "csv_export");
  if (error) return error;
  if (!session) return json401(req, { source: "api/export/portfolio", reason: "no_session" });

  if (!(await isFeatureEnabled("csv_export_enabled"))) {
    await refundFeatureQuota(session.userId, "csv_export");
    return NextResponse.json({ error: "CSV export is not enabled" }, { status: 403 });
  }

  const url = new URL(req.url);
  const type = url.searchParams.get("type") || "holdings";
  const portfolioId = url.searchParams.get("portfolioId") || undefined;

  if (type === "transactions") {
    const txs = await listTransactions(session.userId, undefined, portfolioId);
    const headers = ["Date", "Ticker", "Name", "Type", "Shares", "Price/Share", "Total", "Fees", "Taxes", "Currency", "Notes"];
    const rows = txs.map((tx) => [
      tx.date,
      tx.ticker,
      tx.name || "",
      tx.type,
      String(tx.shares),
      String(tx.pricePerShare),
      String(tx.totalAmount),
      String(tx.fees),
      String(tx.taxes),
      tx.currency,
      tx.notes || "",
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.map(escapeCsv).join(","))].join("\n");

    trackEvent(session.userId, "csv_exported", { type: "transactions", count: String(txs.length) });

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="trefolio-transactions-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  if (type === "cash") {
    const entries = await listCashEntries(session.userId, portfolioId);
    const headers = ["Name", "Amount (EUR)"];
    const rows = entries.map((e) => [e.name, String(e.amountEUR)]);
    const csv = [headers.join(","), ...rows.map((r) => r.map(escapeCsv).join(","))].join("\n");

    trackEvent(session.userId, "csv_exported", { type: "cash", count: String(entries.length) });

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="trefolio-cash-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  // Default: holdings
  const holdings = await listHoldings(session.userId, portfolioId);
  const headers = ["Ticker", "Name", "Shares", "Purchase Price", "Currency", "Exchange", "Type", "Sector", "Region"];
  const rows = holdings.map((h) => [
    h.ticker,
    h.name,
    String(h.shares),
    String(h.purchasePrice),
    h.displayCurrency,
    h.exchange,
    h.assetType || "stock",
    h.sector || "",
    h.region || "",
  ]);

  const csv = [headers.join(","), ...rows.map((r) => r.map(escapeCsv).join(","))].join("\n");

  trackEvent(session.userId, "csv_exported", { type: "holdings", count: String(holdings.length) });

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="trefolio-holdings-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
});
