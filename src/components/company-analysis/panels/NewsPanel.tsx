"use client";

import { useI18n } from "@/lib/i18n";
import { formatAnalysisDate } from "@/lib/company-analysis/format";
import type { CompanyAnalysisData } from "../use-company-analysis-report";

export default function NewsPanel({ data }: { data: CompanyAnalysisData }) {
  const { t, language } = useI18n();
  const { report } = data;
  if (!report) return null;

  const showNews = report.news.status !== "unavailable" && report.news.items.length > 0;
  if (!showNews) {
    return (
      <div className="card p-6 text-sm text-[color:var(--muted)]">{t("companyAnalysisInsidersEmpty")}</div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {report.news.items.map((item, i) => (
        <article key={i} className="card flex flex-col border-t-4 border-t-[color:var(--accent)] p-5">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--muted)]">
            {formatAnalysisDate(item.date, language) ?? item.date}
            {item.kind === "earnings" ? ` · ${t("companyAnalysisEarningsBadge")}` : ""}
          </div>
          <h3 className="mb-2 text-base font-semibold text-[color:var(--foreground)]">{item.title}</h3>
          {item.summary ? (
            <p className="mb-3 flex-1 text-sm text-[color:var(--foreground)]">{item.summary}</p>
          ) : null}
          {item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-[color:var(--accent)]"
            >
              {t("companyAnalysisReadMore")} →
            </a>
          )}
        </article>
      ))}
    </div>
  );
}
