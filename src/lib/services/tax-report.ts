import { requireFeatureQuotaByUserId } from "@/lib/auth/guards";
import { listCashEntries, listHoldings, listTransactions, findUserById } from "@/lib/db";
import { ensureInitialized } from "@/lib/db/client";
import { trackEvent } from "@/lib/db/analytics";
import { refundFeatureQuota } from "@/lib/feature-quotas";
import { createProvider } from "@/lib/api-providers";
import { generateTaxReport } from "@/lib/tax/countries";
import { TAX_COUNTRIES, type TaxCountry, type TaxReport, type TaxReportInput } from "@/lib/tax/types";
import type { ExchangeRates } from "@/lib/types";
import type { ServiceResult } from "@/lib/services/service-result";
import { serviceErr } from "@/lib/services/service-result";

const FX_PAIRS = [
  "EURUSD", "EURGBP", "EURCHF", "EURJPY", "EURCAD", "EURAUD", "EURSEK", "EURNOK", "EURDKK", "EURPLN",
];

export interface TaxReportOpts {
  country: TaxCountry;
  taxYear: number;
  portfolioId?: string;
  filingStatus?: "single" | "joint";
  italyRegime?: "dichiarativo" | "amministrato";
  swedenAccountType?: "isk" | "kf" | "regular";
  portugalNhr?: boolean;
  swissCanton?: string;
}

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

async function fetchExchangeRates(): Promise<ExchangeRates> {
  const provider = createProvider("yahoo");
  const out: ExchangeRates = {};
  await Promise.all(
    FX_PAIRS.map(async (pair) => {
      try {
        const rate = await provider.getExchangeRate(pair.slice(0, 3), pair.slice(3));
        if (rate > 0) out[pair] = rate;
      } catch {
        /* tolerate */
      }
    }),
  );
  return out;
}

export async function getTaxReportForUser(
  userId: string,
  opts: TaxReportOpts,
): Promise<ServiceResult<TaxReport & { disclaimer: string }>> {
  if (!TAX_COUNTRIES.includes(opts.country)) {
    return serviceErr(`Unsupported country. Supported: ${TAX_COUNTRIES.join(", ")}`, "invalid_input");
  }
  const taxYear = opts.taxYear;
  if (taxYear < 2000 || taxYear > new Date().getFullYear()) {
    return serviceErr("Invalid tax year", "invalid_input");
  }

  const quota = await requireFeatureQuotaByUserId(userId, "tax_report");
  if (!quota.allowed) {
    if (quota.reason === "user_not_found") return serviceErr("User not found", "user_not_found");
    return serviceErr("Monthly tax report quota exceeded.", "quota_exceeded");
  }

  const user = await findUserById(userId);
  const transactions = await listTransactions(userId, undefined, opts.portfolioId);
  const exchangeRates = await fetchExchangeRates();

  const jan1Date = `${taxYear}-01-01`;
  const dec31Date = `${taxYear}-12-31`;

  let [jan1ValueEUR, dec31ValueEUR] = await Promise.all([
    getSnapshotValue(userId, jan1Date, opts.portfolioId),
    getSnapshotValue(userId, dec31Date, opts.portfolioId),
  ]);

  let jan1Estimated = false;
  let dec31Estimated = false;
  if (jan1ValueEUR == null || dec31ValueEUR == null) {
    const holdings = await listHoldings(userId, opts.portfolioId);
    const holdingsTotal = holdings.reduce((sum, h) => sum + (h.valueInEUR || 0), 0);
    if (holdingsTotal > 0) {
      if (jan1ValueEUR == null) {
        jan1ValueEUR = holdingsTotal;
        jan1Estimated = true;
      }
      if (dec31ValueEUR == null) {
        dec31ValueEUR = holdingsTotal;
        dec31Estimated = true;
      }
    }
  }

  let bankDepositsJan1EUR: number | undefined;
  if (opts.country === "NL") {
    const cashEntries = await listCashEntries(userId, opts.portfolioId);
    const cashTotal = cashEntries.reduce((sum, c) => sum + (c.amountEUR || 0), 0);
    if (cashTotal > 0) bankDepositsJan1EUR = cashTotal;
  }

  const input: TaxReportInput = {
    country: opts.country,
    taxYear,
    transactions,
    exchangeRates,
    baseCurrency: "EUR",
    jan1ValueEUR,
    dec31ValueEUR,
    bankDepositsJan1EUR,
    filingStatus: opts.filingStatus ?? "single",
    italyRegime: opts.italyRegime ?? "dichiarativo",
    swedenAccountType: opts.swedenAccountType ?? "regular",
    portugalNhr: opts.portugalNhr === true,
    swissCanton: opts.swissCanton ?? "ZH",
    jan1Estimated,
    dec31Estimated,
  };

  try {
    const report = generateTaxReport(input);
    trackEvent(userId, "tax_report_generated", {
      country: opts.country,
      taxYear: String(taxYear),
      gainsCount: String(report.realizedGains.length),
      dividendsCount: String(report.dividends.length),
      source: "mcp",
    });
    return {
      ok: true,
      data: {
        ...report,
        disclaimer:
          "Educational tax estimate only — not professional tax advice. Verify with a qualified advisor before filing.",
      },
    };
  } catch (err) {
    await refundFeatureQuota(userId, "tax_report");
    const message = err instanceof Error ? err.message : "Failed to generate tax report";
    return serviceErr(message, "not_configured");
  }
}
