"use client";

import { useI18n } from "@/lib/i18n";
import {
  formatAnalysisCompact,
  formatAnalysisDate,
  formatAnalysisNumber,
} from "@/lib/company-analysis/format";
import type { CompanyAnalysisReport } from "@/lib/company-analysis/types";

function formatTer(ratio: number | null, language: string): string | null {
  if (ratio == null || !Number.isFinite(ratio) || ratio < 0) return null;
  const pct = ratio <= 1 ? ratio * 100 : ratio;
  const digits = pct < 0.1 ? 3 : 2;
  const formatted = formatAnalysisNumber(pct, language, { digits });
  return formatted != null ? `${formatted}%` : null;
}

export default function EtfFactsPanel({
  report,
  listingIsin,
}: {
  report: CompanyAnalysisReport;
  listingIsin?: string | null;
}) {
  const { t, language } = useI18n();
  const etf = report.etf;
  const currency = report.quote?.currency || "";
  const isin = etf?.isin || listingIsin || null;
  const aum = etf?.totalAssets ?? report.quote?.marketCap ?? null;
  const aumLabel = formatAnalysisCompact(aum, language, currency);
  const ter = formatTer(etf?.expenseRatio ?? null, language);
  const inception = formatAnalysisDate(etf?.inceptionDate, language);
  const exchange = report.profile?.exchange?.trim() || "";

  const rows: Array<{ label: string; value: string }> = [];
  if (report.ticker) rows.push({ label: t("etfAnalysisTicker"), value: report.ticker });
  if (exchange) rows.push({ label: t("etfAnalysisListing"), value: exchange });
  if (isin) rows.push({ label: t("etfAnalysisIsin"), value: isin });
  if (etf?.fundFamily) rows.push({ label: t("etfAnalysisProvider"), value: etf.fundFamily });
  if (etf?.category) rows.push({ label: t("etfAnalysisCategory"), value: etf.category });
  if (etf?.legalType) rows.push({ label: t("etfAnalysisLegalType"), value: etf.legalType });
  if (aumLabel) rows.push({ label: t("etfAnalysisFundSize"), value: aumLabel });
  if (ter) rows.push({ label: t("etfAnalysisTer"), value: ter });
  if (inception) rows.push({ label: t("etfAnalysisInception"), value: inception });

  if (rows.length === 0) return null;

  return (
    <section className="card space-y-4 p-6" aria-labelledby="etf-facts">
      <div className="space-y-1">
        <h2 id="etf-facts" className="text-xl font-semibold text-[color:var(--foreground)]">
          {t("etfAnalysisFacts")}
        </h2>
        <p className="text-sm text-[color:var(--muted)]">{t("etfAnalysisNotACompany")}</p>
      </div>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {rows.map((row) => (
          <div
            key={row.label}
            className="rounded-xl bg-[color:var(--surface-soft)] px-3 py-2.5"
          >
            <dt className="text-[10px] font-medium uppercase tracking-wider text-[color:var(--muted)]">
              {row.label}
            </dt>
            <dd className="mt-0.5 text-sm font-semibold text-[color:var(--foreground)]">{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
