"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useI18n } from "@/lib/i18n";
import type { CompanyAnalysisReport as Report } from "@/lib/company-analysis/types";
import {
  applyWebNumericEnrichment,
  collectWebSources,
  type WebNumericEnrichment,
} from "@/lib/company-analysis/apply-web-enrichment";
import {
  formatAnalysisCompact,
  formatAnalysisDate,
  formatAnalysisDateTime,
  formatAnalysisNumber,
} from "@/lib/company-analysis/format";
import {
  nextQuarterRowFlags,
  shouldShowNarrativeSection,
} from "@/lib/company-analysis/empty-ui";

const CompanyAnalysisChart = dynamic(
  () => import("@/components/company-analysis/CompanyAnalysisChart"),
  { ssr: false },
);

function Pulse({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-[color:var(--surface-soft)] ${className}`}
      aria-hidden
    />
  );
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-4">
      <div className="text-[11px] uppercase tracking-wide text-[color:var(--muted)]">{label}</div>
      <div className="mt-1 text-xl font-semibold text-[color:var(--foreground)]">{value}</div>
      {sub != null && <div className="mt-0.5 text-xs text-[color:var(--muted)]">{sub}</div>}
    </div>
  );
}

function Yoy({ value, language }: { value: number | null; language: string }) {
  if (value == null) {
    return <span className="text-[color:var(--muted)]">—</span>;
  }
  const formatted = formatAnalysisNumber(value, language, { digits: 1 });
  const cls =
    value >= 0
      ? "text-emerald-600 dark:text-emerald-400 font-semibold"
      : "text-red-500 dark:text-red-400 font-semibold";
  return <span className={cls}>{formatted}%</span>;
}

function InsiderTag({ tag, label }: { tag: string; label: string }) {
  if (tag === "tag-buy") {
    return (
      <span className="rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-bold uppercase text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
        {label}
      </span>
    );
  }
  if (tag === "tag-sell") {
    return (
      <span className="rounded bg-red-50 px-2 py-0.5 text-[11px] font-bold uppercase text-red-600 dark:bg-red-500/10 dark:text-red-400">
        {label}
      </span>
    );
  }
  return (
    <span className="rounded bg-gray-100 px-2 py-0.5 text-[11px] font-bold uppercase text-gray-600 dark:bg-slate-500/10 dark:text-slate-400">
      {label}
    </span>
  );
}

function ReportLoadingSkeleton({ label }: { label: string }) {
  return (
    <div
      className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6"
      role="status"
      aria-live="polite"
    >
      <p className="sr-only">{label}</p>
      <div className="flex gap-3">
        <Pulse className="h-9 w-24 rounded-full" />
        <Pulse className="h-9 w-32 rounded-full" />
      </div>
      <header className="card space-y-4 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <Pulse className="h-9 w-56" />
            <Pulse className="h-4 w-40" />
          </div>
          <Pulse className="h-9 w-28 rounded-full" />
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-4 space-y-2"
            >
              <Pulse className="h-3 w-16" />
              <Pulse className="h-7 w-24" />
              <Pulse className="h-3 w-12" />
            </div>
          ))}
        </div>
      </header>
      <div className="card space-y-3 p-4">
        <Pulse className="h-6 w-32" />
        <Pulse className="h-56 w-full rounded-[16px]" />
      </div>
      <div className="card space-y-3 p-6">
        <Pulse className="h-6 w-40" />
        <Pulse className="h-4 w-full" />
        <Pulse className="h-4 w-5/6" />
        <Pulse className="h-4 w-2/3" />
      </div>
      <div className="card space-y-3 p-6">
        <Pulse className="h-6 w-48" />
        <Pulse className="h-4 w-full" />
        <Pulse className="h-4 w-4/5" />
      </div>
      <div className="card space-y-3 p-6">
        <Pulse className="h-6 w-56" />
        <Pulse className="h-4 w-full" />
        <Pulse className="h-16 w-full rounded-lg" />
      </div>
      <p className="text-sm text-[color:var(--muted)]" aria-hidden>
        {label}
      </p>
    </div>
  );
}

function NarrativeBodySkeleton() {
  return (
    <div className="space-y-2" aria-hidden>
      <Pulse className="h-4 w-full" />
      <Pulse className="h-4 w-11/12" />
      <Pulse className="h-4 w-4/5" />
    </div>
  );
}

export default function CompanyAnalysisReportView({ ticker }: { ticker: string }) {
  const { t, language } = useI18n();
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [narrativeLoading, setNarrativeLoading] = useState(false);
  const [narrative, setNarrative] = useState<
    (WebNumericEnrichment & {
      description?: string;
      competitive?: string;
      sectorOutlook?: string;
      risks?: string;
      technicalReading?: string;
      insiderReading?: string;
    }) | null
  >(null);
  const freshNarrativeRef = useRef(false);

  const load = useCallback(
    async (opts?: { fresh?: boolean }) => {
      const fresh = opts?.fresh === true;
      if (fresh) {
        setRegenerating(true);
        setNarrative(null);
        freshNarrativeRef.current = true;
      } else {
        setLoading(true);
      }
      setError(null);
      try {
        const qs = new URLSearchParams({ symbol: ticker });
        if (fresh) qs.set("fresh", "1");
        const res = await fetch(`/api/company-analysis?${qs.toString()}`);
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || t("companyAnalysisLoadError"));
          if (!fresh) setReport(null);
          freshNarrativeRef.current = false;
          return;
        }
        setReport(data as Report);
      } catch {
        setError(t("companyAnalysisLoadError"));
        if (!fresh) setReport(null);
        freshNarrativeRef.current = false;
      } finally {
        setLoading(false);
        if (!fresh) setRegenerating(false);
      }
    },
    [ticker, t],
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!report) return;
    let cancelled = false;
    const fresh = freshNarrativeRef.current;
    freshNarrativeRef.current = false;
    (async () => {
      setNarrativeLoading(true);
      try {
        const res = await fetch("/api/company-analysis/narrative", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            language,
            ticker: report.ticker,
            fresh,
            profile: report.profile,
            quote: report.quote,
            fundamentals: report.fundamentals,
            technicals: report.technicals,
            insiders: report.insiders,
            alternative: report.alternative,
          }),
        });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled) setNarrative(data);
      } catch {
        /* narrative is optional */
      } finally {
        if (!cancelled) {
          setNarrativeLoading(false);
          setRegenerating(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [report, language]);

  const fundamentals = useMemo(
    () =>
      report
        ? applyWebNumericEnrichment(report.fundamentals, narrative)
        : null,
    [report, narrative],
  );
  const sources = useMemo(() => {
    if (!report) return [];
    const web = collectWebSources(narrative);
    const seen = new Set(report.sources.map((s) => s.url));
    const merged = [...report.sources];
    for (const s of web) {
      if (seen.has(s.url)) continue;
      seen.add(s.url);
      merged.push(s);
    }
    return merged;
  }, [report, narrative]);

  if (loading) {
    return <ReportLoadingSkeleton label={t("loading")} />;
  }

  if (error || !report || !fundamentals) {
    return (
      <div className="card space-y-3 p-6">
        <p className="text-[color:var(--foreground)]">{error || t("companyAnalysisLoadError")}</p>
        <Link href="/analisis" className="btn-secondary inline-flex">
          {t("companyAnalysisBack")}
        </Link>
      </div>
    );
  }

  const currency = report.quote?.currency || "USD";
  const name = report.profile?.name || report.ticker;
  const priceFormatted = formatAnalysisNumber(report.quote?.price, language);
  const priceStr =
    priceFormatted != null ? `${priceFormatted} ${currency}` : null;
  const mcap = formatAnalysisCompact(report.quote?.marketCap, language, currency);
  const distPct = report.technicals.distanceToCloseHigh12mPct;
  const distFormatted =
    distPct != null
      ? formatAnalysisNumber(distPct, language, { digits: 1 })
      : null;
  const generatedAt =
    formatAnalysisDateTime(report.generatedAt || report.updatedAt, language);

  const narrativePending = narrativeLoading || regenerating;
  const descriptionText =
    narrative?.description?.trim() || report.profile?.description?.trim() || "";
  const competitiveFallback = [
    report.profile?.sector ? `${t("companyAnalysisSector")}: ${report.profile.sector}` : null,
    report.profile?.industry
      ? `${t("companyAnalysisIndustry")}: ${report.profile.industry}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const competitiveText =
    narrative?.competitive?.trim() || competitiveFallback || "";
  const sectorOutlookText = narrative?.sectorOutlook?.trim() || "";
  const risksText = narrative?.risks?.trim() || "";

  const showBusiness = shouldShowNarrativeSection(
    narrativePending,
    descriptionText,
  );
  const showCompetitive = shouldShowNarrativeSection(
    narrativePending,
    competitiveText,
  );
  const showSector = shouldShowNarrativeSection(
    narrativePending,
    sectorOutlookText,
    risksText,
  );

  const {
    showGuidance: showGuidanceRow,
    showConsensusRevenue,
    showConsensusEps,
    showCard: showNextQuarterCard,
  } = nextQuarterRowFlags(fundamentals);

  const lastQuarterRows = fundamentals.rows.filter((row) => row.value != null);
  const showFundamentals =
    fundamentals.status !== "unavailable" &&
    (lastQuarterRows.length > 0 || showNextQuarterCard);

  const showNews =
    report.news.status !== "unavailable" && report.news.items.length > 0;
  const showInsiders = report.insiders.status !== "unavailable";
  const showCongress = report.congress.status !== "unavailable";
  const showFlow = showInsiders || showCongress;
  const showAlternative =
    report.alternative.status !== "unavailable" && Boolean(report.alternative.ticker);

  const showQuoteCard = priceStr != null;
  const showMcapCard = mcap != null;
  const showRevenueCard =
    fundamentals.lastRevenueYoyPct != null || fundamentals.lastRevenue != null;
  const showEpsCard = fundamentals.lastEps != null;
  const showDistCard = distFormatted != null;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/analisis" className="btn-secondary text-sm">
          {t("companyAnalysisBack")}
        </Link>
        <Link
          href={`/stock/${encodeURIComponent(report.ticker)}`}
          className="text-sm text-[color:var(--accent)] underline-offset-2 hover:underline"
        >
          {t("companyAnalysisOpenAsset")}
        </Link>
      </div>

      <header className="card space-y-4 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight text-[color:var(--foreground)]">
                {name}
              </h1>
              <span className="rounded-lg border border-[color:var(--accent)] px-2.5 py-1 text-sm font-semibold text-[color:var(--accent)]">
                {(report.profile?.exchange || "—") + " · " + report.ticker}
              </span>
            </div>
            <p className="mt-2 text-sm text-[color:var(--muted)]">
              {t("companyAnalysisGeneratedAt")}{" "}
              {generatedAt ?? "—"}
              {report.cached ? ` · ${t("companyAnalysisCached")}` : ""}
              {narrativePending ? ` · ${t("companyAnalysisRegenerating")}` : ""}
            </p>
          </div>
          <button
            type="button"
            className="btn-secondary text-sm shrink-0"
            disabled={loading || regenerating || narrativeLoading}
            onClick={() => load({ fresh: true })}
            title={t("companyAnalysisRegenerateHint")}
          >
            {regenerating || narrativeLoading
              ? t("companyAnalysisRegenerating")
              : t("companyAnalysisRegenerate")}
          </button>
        </div>
        {(showQuoteCard ||
          showMcapCard ||
          showRevenueCard ||
          showEpsCard ||
          showDistCard) && (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {showQuoteCard && (
              <StatCard
                label={t("companyAnalysisQuote")}
                value={priceStr}
                sub={
                  report.quote?.changePercent != null ? (
                    <Yoy value={report.quote.changePercent} language={language} />
                  ) : undefined
                }
              />
            )}
            {showMcapCard && (
              <StatCard label={t("companyAnalysisMarketCap")} value={mcap} />
            )}
            {showRevenueCard && (
              <StatCard
                label={t("companyAnalysisRevenueYoy")}
                value={
                  fundamentals.lastRevenueYoyPct != null ? (
                    <Yoy value={fundamentals.lastRevenueYoyPct} language={language} />
                  ) : (
                    formatAnalysisCompact(fundamentals.lastRevenue, language, currency) ??
                    "—"
                  )
                }
                sub={
                  fundamentals.lastRevenueYoyPct != null
                    ? formatAnalysisCompact(fundamentals.lastRevenue, language, currency) ??
                      undefined
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
      </header>

      <section className="card p-4" aria-labelledby="ca-chart">
        <h2 id="ca-chart" className="mb-3 text-xl font-semibold text-[color:var(--foreground)]">
          {t("companyAnalysisChart")}
        </h2>
        <CompanyAnalysisChart
          ticker={report.ticker}
          exchange={report.profile?.exchange || ""}
        />
      </section>

      {showBusiness && (
        <section className="card space-y-3 p-6" aria-labelledby="ca-desc">
          <h2 id="ca-desc" className="text-xl font-semibold text-[color:var(--foreground)]">
            {t("companyAnalysisBusiness")}
          </h2>
          {descriptionText ? (
            <p className="text-sm leading-relaxed text-[color:var(--foreground)]">
              {descriptionText}
            </p>
          ) : (
            <NarrativeBodySkeleton />
          )}
          <p className="text-xs text-[color:var(--muted)]">{t("aiDisclaimer")}</p>
        </section>
      )}

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
            <p className="text-sm leading-relaxed text-[color:var(--foreground)]">
              {competitiveText}
            </p>
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
                <p className="text-sm leading-relaxed text-[color:var(--foreground)]">
                  {sectorOutlookText}
                </p>
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

      {showFundamentals && (
        <section className="space-y-4" aria-labelledby="ca-fund">
          <h2 id="ca-fund" className="text-xl font-semibold text-[color:var(--foreground)]">
            {t("companyAnalysisFundamentals")}
          </h2>
          <div
            className={`grid gap-4 ${lastQuarterRows.length > 0 && showNextQuarterCard ? "md:grid-cols-2" : ""}`}
          >
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
                      <th className="px-4 py-3 text-right font-semibold">
                        {t("companyAnalysisValue")}
                      </th>
                      <th className="px-4 py-3 text-right font-semibold">YoY</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lastQuarterRows.map((row) => {
                      const rowLabels: Record<string, string> = {
                        revenue: t("companyAnalysisRowRevenue"),
                        eps: t("companyAnalysisRowEps"),
                        operatingIncome: t("companyAnalysisRowOperatingIncome"),
                        netIncome: t("companyAnalysisRowNetIncome"),
                        ebitda: t("companyAnalysisRowEbitda"),
                        grossMargin: t("companyAnalysisRowGrossMargin"),
                      };
                      const valueCell =
                        row.unit === "percent"
                          ? `${formatAnalysisNumber(row.value, language, { digits: 1 })}%`
                          : row.unit === "eps"
                            ? formatAnalysisNumber(row.value, language)
                            : formatAnalysisCompact(row.value, language, currency);
                      return (
                        <tr
                          key={row.label}
                          className="border-b border-[color:var(--border)] last:border-0"
                        >
                          <td className="px-4 py-2.5">
                            {rowLabels[row.label] ?? row.label}
                          </td>
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
                      <th className="px-4 py-3 text-right font-semibold">
                        {t("companyAnalysisValue")}
                      </th>
                      <th className="px-4 py-3 text-right font-semibold">YoY</th>
                    </tr>
                  </thead>
                  <tbody>
                    {showGuidanceRow && (
                      <tr className="border-b border-[color:var(--border)]">
                        <td className="px-4 py-2.5">
                          {t("companyAnalysisGuidanceRevenue")}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {formatAnalysisCompact(
                            fundamentals.companyGuidanceRevenue,
                            language,
                            currency,
                          )}
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
                          <Yoy
                            value={fundamentals.companyGuidanceRevenueVarPct}
                            language={language}
                          />
                        </td>
                      </tr>
                    )}
                    {showConsensusRevenue && (
                      <tr className="border-b border-[color:var(--border)] last:border-0">
                        <td className="px-4 py-2.5">
                          {t("companyAnalysisConsensusRevenue")}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {formatAnalysisCompact(
                            fundamentals.consensusRevenue,
                            language,
                            currency,
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <Yoy
                            value={fundamentals.consensusRevenueVarPct}
                            language={language}
                          />
                        </td>
                      </tr>
                    )}
                    {showConsensusEps && (
                      <tr>
                        <td className="px-4 py-2.5">
                          {t("companyAnalysisConsensusEps")}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {formatAnalysisNumber(fundamentals.consensusEps, language)}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <Yoy
                            value={fundamentals.consensusEpsVarPct}
                            language={language}
                          />
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                {showGuidanceRow && (
                  <p className="px-4 pb-3 text-xs text-[color:var(--muted)]">
                    {t("companyAnalysisGuidanceNote")}
                  </p>
                )}
              </div>
            )}
          </div>
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
                <strong>
                  {formatAnalysisNumber(report.technicals.closeHigh12m, language)}
                </strong>
              </li>
            )}
            {report.technicals.fiftyTwoWeekHigh != null && (
              <li className="flex justify-between gap-2 border-t border-[color:var(--border)] pt-2">
                <span>52w high</span>
                <strong>
                  {formatAnalysisNumber(report.technicals.fiftyTwoWeekHigh, language)}
                </strong>
              </li>
            )}
            {report.technicals.fiftyTwoWeekLow != null && (
              <li className="flex justify-between gap-2 border-t border-[color:var(--border)] pt-2">
                <span>52w low</span>
                <strong>
                  {formatAnalysisNumber(report.technicals.fiftyTwoWeekLow, language)}
                </strong>
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

      {showNews && (
        <section className="space-y-3" aria-labelledby="ca-news">
          <h2 id="ca-news" className="text-xl font-semibold text-[color:var(--foreground)]">
            {t("companyAnalysisNews")}
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {report.news.items.map((item, i) => (
              <article
                key={i}
                className="card flex flex-col border-t-4 border-t-[color:var(--accent)] p-5"
              >
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--muted)]">
                  {formatAnalysisDate(item.date, language) ?? item.date}
                  {item.kind === "earnings" ? ` · ${t("companyAnalysisEarningsBadge")}` : ""}
                </div>
                <h3 className="mb-2 text-base font-semibold text-[color:var(--foreground)]">
                  {item.title}
                </h3>
                {item.summary ? (
                  <p className="mb-3 flex-1 text-sm text-[color:var(--foreground)]">
                    {item.summary}
                  </p>
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
        </section>
      )}

      {showFlow && (
        <section className="grid gap-4 md:grid-cols-2" aria-labelledby="ca-flow">
          {showInsiders && (
            <div className="card p-6">
              <h2 id="ca-flow" className="text-lg font-semibold text-[color:var(--foreground)]">
                {t("companyAnalysisInsiders")}
              </h2>
              <p className="mb-4 text-xs uppercase tracking-wide text-[color:var(--muted)]">
                {t("companyAnalysisInsidersSub")}
              </p>
              {report.insiders.items.length === 0 ? (
                <div className="rounded-lg border border-dashed border-[color:var(--border)] bg-[color:var(--surface-soft)] p-6 text-center text-sm text-[color:var(--muted)]">
                  {t("companyAnalysisInsidersEmpty")}
                </div>
              ) : (
                <ul className="space-y-3">
                  {report.insiders.items.map((item, i) => (
                    <li
                      key={i}
                      className="grid grid-cols-[1fr_auto] gap-2 border-b border-dashed border-[color:var(--border)] pb-3 last:border-0"
                    >
                      <div>
                        <div className="font-semibold text-[color:var(--foreground)]">
                          {item.name}
                        </div>
                        <div className="text-xs uppercase text-[color:var(--muted)]">
                          {item.role} · {formatAnalysisDate(item.date, language) ?? item.date}
                        </div>
                        <div className="mt-1 text-sm text-[color:var(--foreground)]">
                          {item.detail}
                        </div>
                      </div>
                      <InsiderTag
                        tag={item.tag}
                        label={
                          item.tag === "tag-buy"
                            ? t("companyAnalysisTagBuy")
                            : item.tag === "tag-sell"
                              ? t("companyAnalysisTagSell")
                              : t("companyAnalysisTagNeutral")
                        }
                      />
                    </li>
                  ))}
                </ul>
              )}
              {narrative?.insiderReading && (
                <p className="mt-4 border-l-2 border-[color:var(--accent)] bg-[color:var(--surface-soft)] p-3 text-sm">
                  <strong>{t("companyAnalysisReading")}:</strong> {narrative.insiderReading}
                </p>
              )}
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
                    <li
                      key={i}
                      className="border-b border-dashed border-[color:var(--border)] pb-3 last:border-0"
                    >
                      <div className="font-semibold text-[color:var(--foreground)]">
                        {item.name}
                      </div>
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
              {report.alternative.name || report.alternative.ticker} (
              {report.alternative.ticker})
            </p>
            {report.alternative.tagline ? (
              <p className="font-semibold text-[color:var(--accent)]">
                {report.alternative.tagline}
              </p>
            ) : null}
            {report.alternative.why ? <p>{report.alternative.why}</p> : null}
            {(report.alternative.price != null ||
              report.alternative.distanceTo52wHighPct != null) && (
              <p>
                {report.alternative.price != null && (
                  <>
                    <strong>{t("companyAnalysisQuote")}:</strong>{" "}
                    {formatAnalysisNumber(report.alternative.price, language)}
                  </>
                )}
                {report.alternative.price != null &&
                report.alternative.distanceTo52wHighPct != null
                  ? " · "
                  : null}
                {report.alternative.distanceTo52wHighPct != null && (
                  <>
                    <strong>{t("companyAnalysisVs52wHigh")}:</strong>{" "}
                    {formatAnalysisNumber(report.alternative.distanceTo52wHighPct, language, {
                      digits: 1,
                    })}
                    %
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

      <footer className="space-y-2 border-t border-[color:var(--border)] pt-4 text-xs text-[color:var(--muted)]">
        <p>
          <strong>
            {t("companyAnalysisGeneratedAt")} {generatedAt ?? "—"}.
          </strong>{" "}
          {t("financialDataDisclaimer")}
        </p>
        {sources.length > 0 && (
          <>
            <p>{t("companyAnalysisSources")}</p>
            <p className="flex flex-wrap gap-x-3 gap-y-1">
              {sources.map((s) => (
                <a
                  key={s.url}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[color:var(--foreground)] underline decoration-dotted"
                >
                  {s.name}
                </a>
              ))}
            </p>
          </>
        )}
      </footer>
    </div>
  );
}
