"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { formatAnalysisNumber } from "@/lib/company-analysis/format";
import { shouldShowNarrativeSection } from "@/lib/company-analysis/empty-ui";
import { NarrativeBodySkeleton, Pulse } from "../ReportPrimitives";
import type { CompanyAnalysisData } from "../use-company-analysis-report";

export default function AnalysisNarrativePanel({ data }: { data: CompanyAnalysisData }) {
  const { t, language } = useI18n();
  const { report, narrative, narrativePending } = data;
  if (!report) return null;

  const competitiveFallback = [
    report.profile?.sector ? `${t("companyAnalysisSector")}: ${report.profile.sector}` : null,
    report.profile?.industry ? `${t("companyAnalysisIndustry")}: ${report.profile.industry}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const competitiveText = narrative?.competitive?.trim() || competitiveFallback || "";
  const sectorOutlookText = narrative?.sectorOutlook?.trim() || "";
  const risksText = narrative?.risks?.trim() || "";

  const showCompetitive = shouldShowNarrativeSection(narrativePending, competitiveText);
  const showSector = shouldShowNarrativeSection(narrativePending, sectorOutlookText, risksText);
  const showAlternative =
    report.alternative.status !== "unavailable" && Boolean(report.alternative.ticker);

  return (
    <div className="space-y-6">
      {showCompetitive && (
        <section className="card space-y-3 p-6" aria-labelledby="ca-comp">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="ca-comp" className="text-xl font-semibold text-[color:var(--foreground)]">
              {t("companyAnalysisCompetitive")}
            </h2>
            <span className="rounded bg-[color:var(--accent-light)] px-2 py-0.5 text-[11px] font-semibold uppercase text-[color:var(--accent)]">
              {t("companyAnalysisInterpretationBadge")}
            </span>
          </div>
          {competitiveText ? (
            <p className="text-sm leading-relaxed text-[color:var(--foreground)]">{competitiveText}</p>
          ) : (
            <NarrativeBodySkeleton />
          )}
        </section>
      )}

      {showSector && (
        <section className="card space-y-3 p-6" aria-labelledby="ca-sector">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="ca-sector" className="text-xl font-semibold text-[color:var(--foreground)]">
              {t("companyAnalysisSectorOutlook")}
            </h2>
            <span className="rounded bg-[color:var(--accent-light)] px-2 py-0.5 text-[11px] font-semibold uppercase text-[color:var(--accent)]">
              {t("companyAnalysisInterpretationBadge")}
            </span>
            {narrative?.usedWeb ? (
              <span className="rounded bg-[color:var(--surface-soft)] px-2 py-0.5 text-[11px] font-semibold uppercase text-[color:var(--muted)]">
                {t("companyAnalysisWebEnriched")}
              </span>
            ) : null}
          </div>
          {narrativePending && !sectorOutlookText && !risksText ? (
            <>
              <NarrativeBodySkeleton />
              <div className="rounded-lg bg-[color:var(--surface-soft)] p-3">
                <Pulse className="mb-2 h-4 w-28" />
                <NarrativeBodySkeleton />
              </div>
            </>
          ) : (
            <>
              {sectorOutlookText ? (
                <p className="text-sm leading-relaxed text-[color:var(--foreground)]">{sectorOutlookText}</p>
              ) : null}
              {risksText ? (
                <div className="rounded-lg bg-[color:var(--surface-soft)] p-3 text-sm text-[color:var(--foreground)]">
                  <strong>{t("companyAnalysisRisks")}:</strong> {risksText}
                </div>
              ) : null}
            </>
          )}
          <p className="text-xs text-[color:var(--muted)]">{t("aiDisclaimer")}</p>
        </section>
      )}

      {showAlternative && (
        <section
          className="card space-y-4 border-l-4 border-l-[color:var(--accent)] bg-[color:var(--surface-strong)] p-6"
          aria-labelledby="ca-alt"
        >
          <div className="rounded-lg border border-amber-500/40 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
            {t("companyAnalysisAltEditorialBanner")}
          </div>
          <h2 id="ca-alt" className="text-xl font-semibold text-[color:var(--foreground)]">
            {t("companyAnalysisAlternative")}
          </h2>
          <div className="space-y-2 text-sm text-[color:var(--foreground)]">
            <p className="text-2xl font-bold">
              {report.alternative.name || report.alternative.ticker} ({report.alternative.ticker})
            </p>
            {report.alternative.tagline ? (
              <p className="font-semibold text-[color:var(--accent)]">{report.alternative.tagline}</p>
            ) : null}
            {report.alternative.why ? <p>{report.alternative.why}</p> : null}
            {(report.alternative.price != null || report.alternative.distanceTo52wHighPct != null) && (
              <p>
                {report.alternative.price != null && (
                  <>
                    <strong>{t("companyAnalysisQuote")}:</strong>{" "}
                    {formatAnalysisNumber(report.alternative.price, language)}
                    {report.quote?.currency ? ` ${report.quote.currency}` : ""}
                  </>
                )}
                {report.alternative.price != null && report.alternative.distanceTo52wHighPct != null
                  ? " · "
                  : null}
                {report.alternative.distanceTo52wHighPct != null && (
                  <>
                    <strong>{t("companyAnalysisVs52wHigh")}:</strong>{" "}
                    {formatAnalysisNumber(report.alternative.distanceTo52wHighPct, language, { digits: 1 })}%
                  </>
                )}
              </p>
            )}
            <Link
              href={`/analisis/${encodeURIComponent(report.alternative.ticker!)}`}
              className="inline-flex text-[color:var(--accent)] underline-offset-2 hover:underline"
            >
              {t("companyAnalysisAnalyzeAlt")} →
            </Link>
          </div>
          <p className="text-xs text-[color:var(--muted)]">{t("companyAnalysisAltDisclaimer")}</p>
        </section>
      )}
    </div>
  );
}
