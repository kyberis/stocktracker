"use client";

import { useI18n } from "@/lib/i18n";
import { formatAnalysisCompact, formatAnalysisDate, formatAnalysisNumber } from "@/lib/company-analysis/format";
import { nextQuarterRowFlags } from "@/lib/company-analysis/empty-ui";
import { Yoy } from "../ReportPrimitives";
import type { CompanyAnalysisData } from "../use-company-analysis-report";

export default function FundamentalsTablePanel({ data }: { data: CompanyAnalysisData }) {
  const { t, language } = useI18n();
  const { report, fundamentals } = data;
  if (!report || !fundamentals) return null;

  const rowLabels: Record<string, string> = {
    revenue: t("companyAnalysisRowRevenue"),
    eps: t("companyAnalysisRowEps"),
    operatingIncome: t("companyAnalysisRowOperatingIncome"),
    netIncome: t("companyAnalysisRowNetIncome"),
    ebitda: t("companyAnalysisRowEbitda"),
    grossMargin: t("companyAnalysisRowGrossMargin"),
  };

  const currency = report.quote?.currency || "USD";
  const { showGuidance: showGuidanceRow, showConsensusRevenue, showConsensusEps, showCard: showNextQuarterCard } =
    nextQuarterRowFlags(fundamentals);
  const lastQuarterRows = fundamentals.rows.filter((row) => row.value != null);

  if (lastQuarterRows.length === 0 && !showNextQuarterCard) {
    return <div className="card p-6 text-sm text-[color:var(--muted)]">{t("companyAnalysisInsidersEmpty")}</div>;
  }

  return (
    <div className={`grid gap-4 ${lastQuarterRows.length > 0 && showNextQuarterCard ? "md:grid-cols-2" : ""}`}>
      {lastQuarterRows.length > 0 && (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[color:var(--border)] bg-[color:var(--surface-soft)]">
                <th className="px-4 py-3 text-left font-semibold">
                  {t("companyAnalysisLastQuarter")}
                  {fundamentals.lastReportDate
                    ? ` (${formatAnalysisDate(fundamentals.lastReportDate, language) ?? fundamentals.lastReportDate})`
                    : ""}
                </th>
                <th className="px-4 py-3 text-right font-semibold">{t("companyAnalysisValue")}</th>
                <th className="px-4 py-3 text-right font-semibold">YoY</th>
              </tr>
            </thead>
            <tbody>
              {lastQuarterRows.map((row) => {
                const valueCell =
                  row.unit === "percent"
                    ? `${formatAnalysisNumber(row.value, language, { digits: 1 })}%`
                    : row.unit === "eps"
                      ? formatAnalysisNumber(row.value, language)
                      : formatAnalysisCompact(row.value, language, currency);
                return (
                  <tr key={row.label} className="border-b border-[color:var(--border)] last:border-0">
                    <td className="px-4 py-2.5">{rowLabels[row.label] ?? row.label}</td>
                    <td className="px-4 py-2.5 text-right">{valueCell}</td>
                    <td className="px-4 py-2.5 text-right">
                      <Yoy value={row.yoyPct} language={language} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {showNextQuarterCard && (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[color:var(--border)] bg-[color:var(--accent-light)]">
                <th className="px-4 py-3 text-left font-semibold">
                  {t("companyAnalysisNextQuarter")}
                  {fundamentals.nextReportDate
                    ? ` (${formatAnalysisDate(fundamentals.nextReportDate, language) ?? fundamentals.nextReportDate})`
                    : ""}
                </th>
                <th className="px-4 py-3 text-right font-semibold">{t("companyAnalysisValue")}</th>
                <th className="px-4 py-3 text-right font-semibold">YoY</th>
              </tr>
            </thead>
            <tbody>
              {showGuidanceRow && (
                <tr className="border-b border-[color:var(--border)]">
                  <td className="px-4 py-2.5">{t("companyAnalysisGuidanceRevenue")}</td>
                  <td className="px-4 py-2.5 text-right">
                    {formatAnalysisCompact(fundamentals.companyGuidanceRevenue, language, currency)}
                    {fundamentals.companyGuidanceSourceUrl ? (
                      <>
                        {" "}
                        <a
                          href={fundamentals.companyGuidanceSourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[color:var(--accent)] underline decoration-dotted"
                        >
                          {t("companyAnalysisSourceLink")}
                        </a>
                      </>
                    ) : null}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Yoy value={fundamentals.companyGuidanceRevenueVarPct} language={language} />
                  </td>
                </tr>
              )}
              {showConsensusRevenue && (
                <tr className="border-b border-[color:var(--border)] last:border-0">
                  <td className="px-4 py-2.5">{t("companyAnalysisConsensusRevenue")}</td>
                  <td className="px-4 py-2.5 text-right">
                    {formatAnalysisCompact(fundamentals.consensusRevenue, language, currency)}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Yoy value={fundamentals.consensusRevenueVarPct} language={language} />
                  </td>
                </tr>
              )}
              {showConsensusEps && (
                <tr>
                  <td className="px-4 py-2.5">{t("companyAnalysisConsensusEps")}</td>
                  <td className="px-4 py-2.5 text-right">
                    {formatAnalysisNumber(fundamentals.consensusEps, language)}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Yoy value={fundamentals.consensusEpsVarPct} language={language} />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {showGuidanceRow && (
            <p className="px-4 pb-3 text-xs text-[color:var(--muted)]">{t("companyAnalysisGuidanceNote")}</p>
          )}
        </div>
      )}
    </div>
  );
}
