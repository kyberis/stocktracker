"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useI18n } from "@/lib/i18n";
import type { CompanyAnalysisReport as Report } from "@/lib/company-analysis/types";
import {
  formatAnalysisCompact,
  formatAnalysisDate,
  formatAnalysisDateTime,
  formatAnalysisNumber,
} from "@/lib/company-analysis/format";

const CompanyAnalysisChart = dynamic(
  () => import("@/components/company-analysis/CompanyAnalysisChart"),
  { ssr: false },
);

function Unavailable({ label }: { label: string }) {
  return <span className="text-[color:var(--muted)]">{label}</span>;
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

function Yoy({ value, language, na }: { value: number | null; language: string; na: string }) {
  if (value == null) return <Unavailable label={na} />;
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

export default function CompanyAnalysisReportView({ ticker }: { ticker: string }) {
  const { t, language } = useI18n();
  const na = t("companyAnalysisDataUnavailable");
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [narrative, setNarrative] = useState<{
    description?: string;
    competitive?: string;
    sectorOutlook?: string;
    risks?: string;
    technicalReading?: string;
    insiderReading?: string;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/company-analysis?symbol=${encodeURIComponent(ticker)}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t("companyAnalysisLoadError"));
        setReport(null);
        return;
      }
      setReport(data as Report);
    } catch {
      setError(t("companyAnalysisLoadError"));
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [ticker, t]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!report) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/company-analysis/narrative", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            language,
            ticker: report.ticker,
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
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [report, language]);

  if (loading) {
    return (
      <div className="space-y-4" role="status" aria-live="polite">
        <div className="h-32 animate-pulse rounded-[20px] bg-[color:var(--card)]" />
        <div className="h-48 animate-pulse rounded-[20px] bg-[color:var(--card)]" />
        <p className="text-sm text-[color:var(--muted)]">{t("loading")}</p>
      </div>
    );
  }

  if (error || !report) {
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
  const priceStr =
    formatAnalysisNumber(report.quote?.price, language) != null
      ? `${formatAnalysisNumber(report.quote?.price, language)} ${currency}`
      : na;
  const mcap = formatAnalysisCompact(report.quote?.marketCap, language, currency) ?? na;
  const dist =
    report.technicals.distanceToCloseHigh12mPct != null
      ? `${formatAnalysisNumber(report.technicals.distanceToCloseHigh12mPct, language, { digits: 1 })}%`
      : na;

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
              {t("companyAnalysisUpdatedAt")}{" "}
              {formatAnalysisDateTime(report.updatedAt, language) ?? na}
              {report.cached ? ` · ${t("companyAnalysisCached")}` : ""}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <StatCard
            label={t("companyAnalysisQuote")}
            value={priceStr}
            sub={
              report.quote?.changePercent != null ? (
                <Yoy value={report.quote.changePercent} language={language} na={na} />
              ) : (
                na
              )
            }
          />
          <StatCard label={t("companyAnalysisMarketCap")} value={mcap} />
          <StatCard
            label={t("companyAnalysisRevenueYoy")}
            value={<Yoy value={report.fundamentals.lastRevenueYoyPct} language={language} na={na} />}
            sub={formatAnalysisCompact(report.fundamentals.lastRevenue, language, currency) ?? na}
          />
          <StatCard
            label={t("companyAnalysisEps")}
            value={formatAnalysisNumber(report.fundamentals.lastEps, language) ?? na}
            sub={
              report.fundamentals.lastEpsVsConsensusPct != null
                ? `${t("companyAnalysisVsConsensus")}: ${formatAnalysisNumber(report.fundamentals.lastEpsVsConsensusPct, language, { digits: 1 })}%`
                : na
            }
          />
          <StatCard
            label={t("companyAnalysisVsCloseHigh12m")}
            value={dist}
            sub={
              report.technicals.closeHigh12m != null
                ? `${formatAnalysisNumber(report.technicals.closeHigh12m, language)} (${formatAnalysisDate(report.technicals.closeHigh12mDate, language) ?? ""})`
                : na
            }
          />
        </div>
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

      <section className="card space-y-3 p-6" aria-labelledby="ca-desc">
        <h2 id="ca-desc" className="text-xl font-semibold text-[color:var(--foreground)]">
          {t("companyAnalysisBusiness")}
        </h2>
        <p className="text-sm leading-relaxed text-[color:var(--foreground)]">
          {narrative?.description || report.profile?.description || na}
        </p>
        <p className="text-xs text-[color:var(--muted)]">{t("aiDisclaimer")}</p>
      </section>

      <section className="card space-y-3 p-6" aria-labelledby="ca-comp">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id="ca-comp" className="text-xl font-semibold text-[color:var(--foreground)]">
            {t("companyAnalysisCompetitive")}
          </h2>
          <span className="rounded bg-[color:var(--accent-light)] px-2 py-0.5 text-[11px] font-semibold uppercase text-[color:var(--accent)]">
            {t("companyAnalysisInterpretationBadge")}
          </span>
        </div>
        <p className="text-sm leading-relaxed text-[color:var(--foreground)]">
          {narrative?.competitive ||
            [
              report.profile?.sector ? `${t("companyAnalysisSector")}: ${report.profile.sector}` : null,
              report.profile?.industry
                ? `${t("companyAnalysisIndustry")}: ${report.profile.industry}`
                : null,
            ]
              .filter(Boolean)
              .join(" · ") || na}
        </p>
      </section>

      <section className="card space-y-3 p-6" aria-labelledby="ca-sector">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id="ca-sector" className="text-xl font-semibold text-[color:var(--foreground)]">
            {t("companyAnalysisSectorOutlook")}
          </h2>
          <span className="rounded bg-[color:var(--accent-light)] px-2 py-0.5 text-[11px] font-semibold uppercase text-[color:var(--accent)]">
            {t("companyAnalysisInterpretationBadge")}
          </span>
        </div>
        <p className="text-sm leading-relaxed text-[color:var(--foreground)]">
          {narrative?.sectorOutlook || na}
        </p>
        <div className="rounded-lg bg-[color:var(--surface-soft)] p-3 text-sm text-[color:var(--foreground)]">
          <strong>{t("companyAnalysisRisks")}:</strong> {narrative?.risks || na}
        </div>
      </section>

      <section className="space-y-4" aria-labelledby="ca-fund">
        <h2 id="ca-fund" className="text-xl font-semibold text-[color:var(--foreground)]">
          {t("companyAnalysisFundamentals")}
        </h2>
        {report.fundamentals.status === "unavailable" ? (
          <div className="card p-6 text-sm text-[color:var(--muted)]">{na}</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[color:var(--border)] bg-[color:var(--surface-soft)]">
                    <th className="px-4 py-3 text-left font-semibold">
                      {t("companyAnalysisLastQuarter")} (
                      {formatAnalysisDate(report.fundamentals.lastReportDate, language) ?? na})
                    </th>
                    <th className="px-4 py-3 text-right font-semibold">{t("companyAnalysisValue")}</th>
                    <th className="px-4 py-3 text-right font-semibold">YoY</th>
                  </tr>
                </thead>
                <tbody>
                  {report.fundamentals.rows.map((row) => {
                    const rowLabels: Record<string, string> = {
                      revenue: t("companyAnalysisRowRevenue"),
                      eps: t("companyAnalysisRowEps"),
                      operatingIncome: t("companyAnalysisRowOperatingIncome"),
                      netIncome: t("companyAnalysisRowNetIncome"),
                      ebitda: t("companyAnalysisRowEbitda"),
                      grossMargin: t("companyAnalysisRowGrossMargin"),
                    };
                    return (
                    <tr key={row.label} className="border-b border-[color:var(--border)] last:border-0">
                      <td className="px-4 py-2.5">{rowLabels[row.label] ?? row.label}</td>
                      <td className="px-4 py-2.5 text-right">
                        {row.unit === "percent"
                          ? formatAnalysisNumber(row.value, language, { digits: 1 }) != null
                            ? `${formatAnalysisNumber(row.value, language, { digits: 1 })}%`
                            : na
                          : row.unit === "eps"
                            ? formatAnalysisNumber(row.value, language) ?? na
                            : formatAnalysisCompact(row.value, language, currency) ?? na}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <Yoy value={row.yoyPct} language={language} na={na} />
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[color:var(--border)] bg-[color:var(--accent-light)]">
                    <th className="px-4 py-3 text-left font-semibold">
                      {t("companyAnalysisNextQuarter")} (
                      {formatAnalysisDate(report.fundamentals.nextReportDate, language) ?? na})
                    </th>
                    <th className="px-4 py-3 text-right font-semibold">{t("companyAnalysisValue")}</th>
                    <th className="px-4 py-3 text-right font-semibold">YoY</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-[color:var(--border)]">
                    <td className="px-4 py-2.5">{t("companyAnalysisGuidanceRevenue")}</td>
                    <td className="px-4 py-2.5 text-right">
                      {formatAnalysisCompact(report.fundamentals.companyGuidanceRevenue, language, currency) ?? na}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Yoy value={report.fundamentals.companyGuidanceRevenueVarPct} language={language} na={na} />
                    </td>
                  </tr>
                  <tr className="border-b border-[color:var(--border)]">
                    <td className="px-4 py-2.5">{t("companyAnalysisConsensusRevenue")}</td>
                    <td className="px-4 py-2.5 text-right">
                      {formatAnalysisCompact(report.fundamentals.consensusRevenue, language, currency) ?? na}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Yoy value={report.fundamentals.consensusRevenueVarPct} language={language} na={na} />
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5">{t("companyAnalysisConsensusEps")}</td>
                    <td className="px-4 py-2.5 text-right">
                      {formatAnalysisNumber(report.fundamentals.consensusEps, language) ?? na}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Yoy value={report.fundamentals.consensusEpsVarPct} language={language} na={na} />
                    </td>
                  </tr>
                </tbody>
              </table>
              <p className="px-4 pb-3 text-xs text-[color:var(--muted)]">
                {t("companyAnalysisGuidanceNote")}
              </p>
            </div>
          </div>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-2" aria-labelledby="ca-tech">
        <div className="card bg-[color:var(--surface-strong)] p-6 text-[color:var(--foreground)]">
          <h2 id="ca-tech" className="text-lg font-semibold">
            {t("companyAnalysisTechnical")}
          </h2>
          <p className="mt-4 text-5xl font-bold text-[color:var(--accent)]">
            {dist}
            <span className="ml-1 text-2xl font-normal opacity-70">%</span>
          </p>
          <p className="mt-1 text-xs uppercase tracking-wide text-[color:var(--muted)]">
            {t("companyAnalysisVsCloseHigh12mHint")}
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            <li className="flex justify-between gap-2 border-t border-[color:var(--border)] pt-2">
              <span>{t("companyAnalysisQuote")}</span>
              <strong>{priceStr}</strong>
            </li>
            <li className="flex justify-between gap-2 border-t border-[color:var(--border)] pt-2">
              <span>{t("companyAnalysisCloseHigh12m")}</span>
              <strong>
                {formatAnalysisNumber(report.technicals.closeHigh12m, language) ?? na}
              </strong>
            </li>
            <li className="flex justify-between gap-2 border-t border-[color:var(--border)] pt-2">
              <span>52w high</span>
              <strong>
                {formatAnalysisNumber(report.technicals.fiftyTwoWeekHigh, language) ?? na}
              </strong>
            </li>
            <li className="flex justify-between gap-2 border-t border-[color:var(--border)] pt-2">
              <span>52w low</span>
              <strong>
                {formatAnalysisNumber(report.technicals.fiftyTwoWeekLow, language) ?? na}
              </strong>
            </li>
            <li className="flex justify-between gap-2 border-t border-[color:var(--border)] pt-2">
              <span>MA50 / MA200</span>
              <strong>
                {(formatAnalysisNumber(report.technicals.ma50, language) ?? na) +
                  " / " +
                  (formatAnalysisNumber(report.technicals.ma200, language) ?? na)}
              </strong>
            </li>
          </ul>
        </div>
        <div className="card border-l-4 border-l-[color:var(--accent)] p-6">
          <h3 className="text-lg font-semibold text-[color:var(--foreground)]">
            {t("companyAnalysisTechnicalReading")}
          </h3>
          <ul className="mt-3 space-y-3 text-sm text-[color:var(--foreground)]">
            <li>
              <strong>{t("companyAnalysisSupport")}:</strong>{" "}
              {formatAnalysisNumber(report.technicals.support, language) ?? na}
            </li>
            <li>
              <strong>{t("companyAnalysisResistance")}:</strong>{" "}
              {formatAnalysisNumber(report.technicals.resistance, language) ?? na}
            </li>
            <li>
              <strong>{t("companyAnalysisNextCatalyst")}:</strong>{" "}
              {formatAnalysisDate(report.technicals.nextCatalystDate, language) ?? na}
            </li>
            <li>{narrative?.technicalReading || t("aiDisclaimer")}</li>
          </ul>
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="ca-news">
        <h2 id="ca-news" className="text-xl font-semibold text-[color:var(--foreground)]">
          {t("companyAnalysisNews")}
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {report.news.items.map((item, i) => (
            <article key={i} className="card flex flex-col border-t-4 border-t-[color:var(--accent)] p-5">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--muted)]">
                {formatAnalysisDate(item.date, language) ?? na}
                {item.kind === "earnings" ? ` · ${t("companyAnalysisEarningsBadge")}` : ""}
              </div>
              <h3 className="mb-2 text-base font-semibold text-[color:var(--foreground)]">{item.title}</h3>
              <p className="mb-3 flex-1 text-sm text-[color:var(--foreground)]">{item.summary || na}</p>
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
          {report.news.items.length === 0 && (
            <div className="card col-span-full p-6 text-sm text-[color:var(--muted)]">{na}</div>
          )}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2" aria-labelledby="ca-flow">
        <div className="card p-6">
          <h2 id="ca-flow" className="text-lg font-semibold text-[color:var(--foreground)]">
            {t("companyAnalysisInsiders")}
          </h2>
          <p className="mb-4 text-xs uppercase tracking-wide text-[color:var(--muted)]">
            {t("companyAnalysisInsidersSub")}
          </p>
          {report.insiders.status === "unavailable" ? (
            <p className="text-sm text-[color:var(--muted)]">{na}</p>
          ) : report.insiders.items.length === 0 ? (
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
                    <div className="font-semibold text-[color:var(--foreground)]">{item.name}</div>
                    <div className="text-xs uppercase text-[color:var(--muted)]">
                      {item.role} · {formatAnalysisDate(item.date, language) ?? item.date}
                    </div>
                    <div className="mt-1 text-sm text-[color:var(--foreground)]">{item.detail}</div>
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

        <div className="card p-6">
          <h2 className="text-lg font-semibold text-[color:var(--foreground)]">
            {t("companyAnalysisCongress")}
          </h2>
          <p className="mb-4 text-xs uppercase tracking-wide text-[color:var(--muted)]">
            {t("companyAnalysisCongressSub")}
          </p>
          {report.congress.status === "unavailable" ? (
            <p className="text-sm text-[color:var(--muted)]">{na}</p>
          ) : report.congress.items.length === 0 ? (
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
      </section>

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
        {report.alternative.status === "unavailable" || !report.alternative.ticker ? (
          <p className="text-sm text-[color:var(--muted)]">{na}</p>
        ) : (
          <div className="space-y-2 text-sm text-[color:var(--foreground)]">
            <p className="text-2xl font-bold">
              {report.alternative.name || report.alternative.ticker} ({report.alternative.ticker})
            </p>
            <p className="font-semibold text-[color:var(--accent)]">{report.alternative.tagline}</p>
            <p>{report.alternative.why}</p>
            <p>
              <strong>{t("companyAnalysisQuote")}:</strong>{" "}
              {formatAnalysisNumber(report.alternative.price, language) ?? na}
              {" · "}
              <strong>{t("companyAnalysisVs52wHigh")}:</strong>{" "}
              {report.alternative.distanceTo52wHighPct != null
                ? `${formatAnalysisNumber(report.alternative.distanceTo52wHighPct, language, { digits: 1 })}%`
                : na}
            </p>
            <Link
              href={`/analisis/${encodeURIComponent(report.alternative.ticker)}`}
              className="inline-flex text-[color:var(--accent)] underline-offset-2 hover:underline"
            >
              {t("companyAnalysisAnalyzeAlt")} →
            </Link>
          </div>
        )}
        <p className="text-xs text-[color:var(--muted)]">{t("companyAnalysisAltDisclaimer")}</p>
      </section>

      <footer className="space-y-2 border-t border-[color:var(--border)] pt-4 text-xs text-[color:var(--muted)]">
        <p>
          <strong>
            {t("companyAnalysisUpdatedAt")}{" "}
            {formatAnalysisDateTime(report.updatedAt, language) ?? na}.
          </strong>{" "}
          {t("financialDataDisclaimer")}
        </p>
        <p>{t("companyAnalysisSources")}</p>
        <p className="flex flex-wrap gap-x-3 gap-y-1">
          {report.sources.map((s) => (
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
      </footer>
    </div>
  );
}
