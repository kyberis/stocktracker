"use client";

import dynamic from "next/dynamic";
import { useI18n } from "@/lib/i18n";
import {
  formatAnalysisCompact,
  formatAnalysisDate,
  formatAnalysisNumber,
} from "@/lib/company-analysis/format";
import { shouldShowNarrativeSection } from "@/lib/company-analysis/empty-ui";
import { NarrativeBodySkeleton, StatCard, Yoy } from "../ReportPrimitives";
import type { CompanyAnalysisData } from "../use-company-analysis-report";

const CompanyAnalysisChart = dynamic(() => import("../CompanyAnalysisChart"), { ssr: false });

export default function SummaryPanel({ data }: { data: CompanyAnalysisData }) {
  const { t, language } = useI18n();
  const { report, narrative, fundamentals, narrativePending } = data;
  if (!report || !fundamentals) return null;

  const isEtf = report.instrumentKind === "etf";
  const currency = report.quote?.currency || "USD";
  const aliasNote = report.symbolUsed && report.symbolUsed !== report.ticker
    ? report.symbolUsed
    : null;
  const priceFormatted = formatAnalysisNumber(report.quote?.price, language);
  const priceStr = priceFormatted != null ? `${priceFormatted} ${currency}` : null;
  const mcap = formatAnalysisCompact(report.quote?.marketCap, language, currency);
  const distPct = report.technicals.distanceToCloseHigh12mPct;
  const distFormatted = distPct != null ? formatAnalysisNumber(distPct, language, { digits: 1 }) : null;

  const descriptionText = narrative?.description?.trim() || report.profile?.description?.trim() || "";
  const showBusiness = shouldShowNarrativeSection(narrativePending, descriptionText);

  const showQuoteCard = priceStr != null;
  const showMcapCard = mcap != null;
  const showRevenueCard = !isEtf && (fundamentals.lastRevenueYoyPct != null || fundamentals.lastRevenue != null);
  const showEpsCard = !isEtf && fundamentals.lastEps != null;
  const showDistCard = distFormatted != null;

  return (
    <div className="space-y-6">
      {aliasNote && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>
            {t("companyAnalysisAliasNote").replace("{symbol}", aliasNote)}
          </span>
        </div>
      )}
      {(showQuoteCard || showMcapCard || showRevenueCard || showEpsCard || showDistCard) && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {showQuoteCard && (
            <StatCard
              label={t("companyAnalysisQuote")}
              value={priceStr}
              noSnippet
              sub={
                report.quote?.changePercent != null ? (
                  <Yoy value={report.quote.changePercent} language={language} />
                ) : undefined
              }
            />
          )}
          {showMcapCard && (
            <StatCard
              label={isEtf ? t("etfAnalysisFundSize") : t("companyAnalysisMarketCap")}
              value={mcap}
              noSnippet
            />
          )}
          {showRevenueCard && (
            <StatCard
              label={t("companyAnalysisRevenueYoy")}
              value={
                fundamentals.lastRevenueYoyPct != null ? (
                  <Yoy value={fundamentals.lastRevenueYoyPct} language={language} />
                ) : (
                  formatAnalysisCompact(fundamentals.lastRevenue, language, currency) ?? "—"
                )
              }
              sub={
                fundamentals.lastRevenueYoyPct != null
                  ? formatAnalysisCompact(fundamentals.lastRevenue, language, currency) ?? undefined
                  : undefined
              }
            />
          )}
          {showEpsCard && (
            <StatCard
              label={t("companyAnalysisEps")}
              value={formatAnalysisNumber(fundamentals.lastEps, language)}
              sub={
                fundamentals.lastEpsVsConsensusPct != null
                  ? `${t("companyAnalysisVsConsensus")}: ${formatAnalysisNumber(fundamentals.lastEpsVsConsensusPct, language, { digits: 1 })}%`
                  : fundamentals.lastEpsSourceUrl
                    ? t("companyAnalysisWebEnriched")
                    : undefined
              }
            />
          )}
          {showDistCard && (
            <StatCard
              label={t("companyAnalysisVsCloseHigh12m")}
              value={`${distFormatted}%`}
              sub={
                report.technicals.closeHigh12m != null
                  ? `${formatAnalysisNumber(report.technicals.closeHigh12m, language)} (${formatAnalysisDate(report.technicals.closeHigh12mDate, language) ?? ""})`
                  : undefined
              }
            />
          )}
        </div>
      )}

      <section className="card p-4" aria-labelledby="ca-chart">
        <h2 id="ca-chart" className="mb-3 text-xl font-semibold text-[color:var(--foreground)]">
          {t("companyAnalysisChart")}
        </h2>
        <CompanyAnalysisChart ticker={report.ticker} exchange={report.profile?.exchange || ""} />
      </section>

      {showBusiness && (
        <section className="card space-y-3 p-6" aria-labelledby="ca-desc">
          <h2 id="ca-desc" className="text-xl font-semibold text-[color:var(--foreground)]">
            {t(isEtf ? "etfAnalysisObjective" : "companyAnalysisBusiness")}
          </h2>
          {descriptionText ? (
            <p className="text-sm leading-relaxed text-[color:var(--foreground)]">{descriptionText}</p>
          ) : (
            <NarrativeBodySkeleton />
          )}
          <p className="text-xs text-[color:var(--muted)]">{t("aiDisclaimer")}</p>
        </section>
      )}

      <section className="grid gap-4 md:grid-cols-2" aria-labelledby="ca-tech">
        <div className="card bg-[color:var(--surface-strong)] p-6 text-[color:var(--foreground)]">
          <h2 id="ca-tech" className="text-lg font-semibold">
            {t("companyAnalysisTechnical")}
          </h2>
          {distFormatted != null ? (
            <>
              <p className="mt-4 text-5xl font-bold text-[color:var(--accent)]">
                {distFormatted}
                <span className="ml-1 text-2xl font-normal opacity-70">%</span>
              </p>
              <p className="mt-1 text-xs uppercase tracking-wide text-[color:var(--muted)]">
                {t("companyAnalysisVsCloseHigh12mHint")}
              </p>
            </>
          ) : null}
          <ul className="mt-4 space-y-2 text-sm">
            {priceStr != null && (
              <li className="flex justify-between gap-2 border-t border-[color:var(--border)] pt-2">
                <span>{t("companyAnalysisQuote")}</span>
                <strong>{priceStr}</strong>
              </li>
            )}
            {report.technicals.closeHigh12m != null && (
              <li className="flex justify-between gap-2 border-t border-[color:var(--border)] pt-2">
                <span>{t("companyAnalysisCloseHigh12m")}</span>
                <strong>{formatAnalysisNumber(report.technicals.closeHigh12m, language)}</strong>
              </li>
            )}
            {report.technicals.fiftyTwoWeekHigh != null && (
              <li className="flex justify-between gap-2 border-t border-[color:var(--border)] pt-2">
                <span>52w high</span>
                <strong>{formatAnalysisNumber(report.technicals.fiftyTwoWeekHigh, language)}</strong>
              </li>
            )}
            {report.technicals.fiftyTwoWeekLow != null && (
              <li className="flex justify-between gap-2 border-t border-[color:var(--border)] pt-2">
                <span>52w low</span>
                <strong>{formatAnalysisNumber(report.technicals.fiftyTwoWeekLow, language)}</strong>
              </li>
            )}
            {(report.technicals.ma50 != null || report.technicals.ma200 != null) && (
              <li className="flex justify-between gap-2 border-t border-[color:var(--border)] pt-2">
                <span>MA50 / MA200</span>
                <strong>
                  {(formatAnalysisNumber(report.technicals.ma50, language) ?? "—") +
                    " / " +
                    (formatAnalysisNumber(report.technicals.ma200, language) ?? "—")}
                </strong>
              </li>
            )}
          </ul>
        </div>
        <div className="card border-l-4 border-l-[color:var(--accent)] p-6">
          <h3 className="text-lg font-semibold text-[color:var(--foreground)]">
            {t("companyAnalysisTechnicalReading")}
          </h3>
          <ul className="mt-3 space-y-3 text-sm text-[color:var(--foreground)]">
            {report.technicals.support != null && (
              <li>
                <strong>{t("companyAnalysisSupport")}:</strong>{" "}
                {formatAnalysisNumber(report.technicals.support, language)}
              </li>
            )}
            {report.technicals.resistance != null && (
              <li>
                <strong>{t("companyAnalysisResistance")}:</strong>{" "}
                {formatAnalysisNumber(report.technicals.resistance, language)}
              </li>
            )}
            {report.technicals.nextCatalystDate && (
              <li>
                <strong>{t("companyAnalysisNextCatalyst")}:</strong>{" "}
                {formatAnalysisDate(report.technicals.nextCatalystDate, language) ??
                  report.technicals.nextCatalystDate}
              </li>
            )}
            {narrative?.technicalReading ? (
              <li>{narrative.technicalReading}</li>
            ) : narrativePending ? (
              <li>
                <NarrativeBodySkeleton />
              </li>
            ) : (
              <li className="text-[color:var(--muted)]">{t("aiDisclaimer")}</li>
            )}
          </ul>
        </div>
      </section>
    </div>
  );
}
