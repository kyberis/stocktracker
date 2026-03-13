import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireFeatureAccess } from "@/lib/auth/guards";
import { listTransactions } from "@/lib/db/transactions";
import { listHoldings } from "@/lib/db/holdings";
import { listCashEntries } from "@/lib/db/cash";
import { findUserById } from "@/lib/db/users";
import { ensureInitialized } from "@/lib/db/client";
import { generateTaxReport } from "@/lib/tax/countries";
import { TAX_COUNTRIES, type TaxCountry, type TaxReportInput } from "@/lib/tax/types";
import { trackEvent } from "@/lib/db/analytics";

async function getSnapshotValue(
  userId: string,
  date: string,
  portfolioId?: string,
): Promise<number | undefined> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: portfolioId
      ? `SELECT total_value_eur FROM portfolio_snapshots WHERE user_id = ? AND date <= ? AND portfolio_id = ? ORDER BY date DESC LIMIT 1`
      : `SELECT total_value_eur FROM portfolio_snapshots WHERE user_id = ? AND date <= ? ORDER BY date DESC LIMIT 1`,
    args: portfolioId ? [userId, date, portfolioId] : [userId, date],
  });
  const val = result.rows[0]?.total_value_eur;
  return val != null ? Number(val) : undefined;
}

export async function GET(request: NextRequest) {
  const { session, error } = await requireFeatureAccess(request, "tax-reports");
  if (error || !session) return error!;

  const url = new URL(request.url);
  const taxYear = parseInt(url.searchParams.get("year") || String(new Date().getFullYear() - 1));
  const countryParam = (url.searchParams.get("country") || "").toUpperCase() as TaxCountry;
  const portfolioId = url.searchParams.get("portfolioId") || undefined;
  const filingStatus = (url.searchParams.get("filingStatus") || "single") as "single" | "joint";
  const italyRegime = (url.searchParams.get("italyRegime") || "dichiarativo") as "dichiarativo" | "amministrato";
  const swedenAccountType = (url.searchParams.get("swedenAccountType") || "regular") as "isk" | "kf" | "regular";
  const portugalNhr = url.searchParams.get("portugalNhr") === "true";
  const swissCanton = url.searchParams.get("swissCanton") || "ZH";

  if (!TAX_COUNTRIES.includes(countryParam)) {
    return NextResponse.json(
      { error: "Unsupported country", supported: TAX_COUNTRIES },
      { status: 400 },
    );
  }

  if (taxYear < 2000 || taxYear > new Date().getFullYear()) {
    return NextResponse.json({ error: "Invalid tax year" }, { status: 400 });
  }

  const user = await findUserById(session.userId);
  const transactions = await listTransactions(session.userId, undefined, portfolioId);

  // Fetch exchange rates
  let exchangeRates: Record<string, number> = {};
  try {
    const ratesRes = await fetch(`${url.origin}/api/exchange-rates`);
    if (ratesRes.ok) exchangeRates = await ratesRes.json();
  } catch { /* use empty rates, engine will handle */ }

  const jan1Date = `${taxYear}-01-01`;
  const dec31Date = `${taxYear}-12-31`;

  let [jan1ValueEUR, dec31ValueEUR] = await Promise.all([
    getSnapshotValue(session.userId, jan1Date, portfolioId),
    getSnapshotValue(session.userId, dec31Date, portfolioId),
  ]);

  // Fallback: when no snapshot exists, estimate from current holdings value.
  // This is most relevant for NL Box 3 which depends entirely on Jan 1 value.
  let jan1Estimated = false;
  let dec31Estimated = false;
  if (jan1ValueEUR == null || dec31ValueEUR == null) {
    const holdings = await listHoldings(session.userId, portfolioId);
    const holdingsTotal = holdings.reduce((sum, h) => sum + (h.valueInEUR || 0), 0);
    if (holdingsTotal > 0) {
      if (jan1ValueEUR == null) { jan1ValueEUR = holdingsTotal; jan1Estimated = true; }
      if (dec31ValueEUR == null) { dec31ValueEUR = holdingsTotal; dec31Estimated = true; }
    }
  }

  // For NL Box 3: include cash entries as bank deposits
  let bankDepositsJan1EUR: number | undefined;
  if (countryParam === "NL") {
    const cashEntries = await listCashEntries(session.userId, portfolioId);
    const cashTotal = cashEntries.reduce((sum, c) => sum + (c.amountEUR || 0), 0);
    if (cashTotal > 0) bankDepositsJan1EUR = cashTotal;
  }

  const input: TaxReportInput = {
    country: countryParam,
    taxYear,
    transactions,
    exchangeRates,
    baseCurrency: "EUR",
    jan1ValueEUR,
    dec31ValueEUR,
    bankDepositsJan1EUR,
    brokerName: user?.display_name ? undefined : undefined,
    brokerCountry: undefined,
    filingStatus,
    italyRegime,
    swedenAccountType,
    portugalNhr,
    swissCanton,
    jan1Estimated,
    dec31Estimated,
  };

  try {
    const report = generateTaxReport(input);

    trackEvent(session.userId, "tax_report_generated", {
      country: countryParam,
      taxYear: String(taxYear),
      gainsCount: String(report.realizedGains.length),
      dividendsCount: String(report.dividends.length),
    });

    return NextResponse.json(report);
  } catch (err) {
    console.error("Tax report generation failed:", err);
    return NextResponse.json(
      { error: "Failed to generate tax report" },
      { status: 500 },
    );
  }
}
