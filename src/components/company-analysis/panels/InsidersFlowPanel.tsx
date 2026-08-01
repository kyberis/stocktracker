"use client";

import { useI18n } from "@/lib/i18n";
import { formatAnalysisDate } from "@/lib/company-analysis/format";
import type { CompanyAnalysisData } from "../use-company-analysis-report";

/**
 * The raw insider-transactions list lives only in the Intelligence tab
 * (StockIntelligence's own Insider Transactions sub-tab, same FMP
 * getInsiderTransactions() source as report.insiders here) to avoid showing
 * the same trades twice. This panel keeps the AI reading of that data (no
 * Intelligence-tab equivalent) plus congress trading (FMP source with no
 * Intelligence-tab equivalent at all).
 */
export default function InsidersFlowPanel({ data }: { data: CompanyAnalysisData }) {
  const { t, language } = useI18n();
  const { report, narrative } = data;
  if (!report) return null;

  const showCongress = report.congress.status !== "unavailable";
  const showInsiderReading = Boolean(narrative?.insiderReading);
  if (!showInsiderReading && !showCongress) return null;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {showInsiderReading && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-[color:var(--foreground)]">
            {t("companyAnalysisInsiders")}
          </h2>
          <p className="mb-4 text-xs uppercase tracking-wide text-[color:var(--muted)]">
            {t("companyAnalysisInsidersSub")}
          </p>
          <p className="border-l-2 border-[color:var(--accent)] bg-[color:var(--surface-soft)] p-3 text-sm">
            <strong>{t("companyAnalysisReading")}:</strong> {narrative!.insiderReading}
          </p>
        </div>
      )}

      {showCongress && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-[color:var(--foreground)]">
            {t("companyAnalysisCongress")}
          </h2>
          <p className="mb-4 text-xs uppercase tracking-wide text-[color:var(--muted)]">
            {t("companyAnalysisCongressSub")}
          </p>
          {report.congress.items.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[color:var(--border)] bg-[color:var(--surface-soft)] p-6 text-center text-sm text-[color:var(--muted)]">
              <p className="font-semibold text-[color:var(--foreground)]">
                {t("companyAnalysisCongressEmptyTitle")}
              </p>
              <p className="mt-2 text-xs">{t("companyAnalysisCongressEmptyBody")}</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {report.congress.items.map((item, i) => (
                <li key={i} className="border-b border-dashed border-[color:var(--border)] pb-3 last:border-0">
                  <div className="font-semibold text-[color:var(--foreground)]">{item.name}</div>
                  <div className="text-xs uppercase text-[color:var(--muted)]">
                    {item.chamber} · {item.officeOrDistrict} ·{" "}
                    {formatAnalysisDate(item.date, language) ?? item.date}
                  </div>
                  <div className="mt-1 text-sm">
                    {item.transactionType}
                    {item.amountRange ? ` · ${item.amountRange}` : ""}
                  </div>
                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-block text-sm text-[color:var(--accent)]"
                    >
                      {t("companyAnalysisSourceLink")}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
