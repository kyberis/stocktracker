"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { LayoutDashboard, BarChart3, Sparkles, ShieldCheck, Lock, ExternalLink } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { usePortfolio } from "@/lib/portfolio-context";
import { buildLoginRedirectHref } from "@/lib/auth/client-redirect";
import { getMarketStatus } from "@/lib/market-hours";
import { formatAnalysisNumber } from "@/lib/company-analysis/format";
import { toTradingViewChartUrl } from "@/lib/company-analysis/tradingview";
import { toYahooFinanceQuoteUrl } from "@/lib/market-symbol";
import { useTabUrl } from "@/lib/use-tab-url";
import VerticalTabRail, { type TabRailItem } from "@/components/ui/VerticalTabRail";
import { useCompanyAnalysisReport } from "@/components/company-analysis/use-company-analysis-report";
import { Yoy } from "@/components/company-analysis/ReportPrimitives";
import SummaryPanel from "@/components/company-analysis/panels/SummaryPanel";
import NewsPanel from "@/components/company-analysis/panels/NewsPanel";
import AnalysisNarrativePanel from "@/components/company-analysis/panels/AnalysisNarrativePanel";
import InsidersFlowPanel from "@/components/company-analysis/panels/InsidersFlowPanel";
import FundamentalsTablePanel from "@/components/company-analysis/panels/FundamentalsTablePanel";

function ExternalQuoteLinks({ ticker, exchange }: { ticker: string; exchange: string }) {
  const tradingViewUrl = toTradingViewChartUrl(ticker, exchange);
  const yahooUrl = toYahooFinanceQuoteUrl(ticker, exchange);
  const linkClass =
    "inline-flex items-center gap-1.5 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-2.5 py-1.5 text-xs font-semibold text-[color:var(--foreground)] transition-colors hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <a href={tradingViewUrl} target="_blank" rel="noopener noreferrer" className={linkClass}>
        TradingView
        <ExternalLink className="h-3 w-3 opacity-70" aria-hidden />
      </a>
      <a href={yahooUrl} target="_blank" rel="noopener noreferrer" className={linkClass}>
        Yahoo Finance
        <ExternalLink className="h-3 w-3 opacity-70" aria-hidden />
      </a>
    </div>
  );
}

const StockDetail = dynamic(() => import("@/components/StockDetail"), { ssr: false });
const StockIntelligence = dynamic(() => import("@/components/StockIntelligence"), { ssr: false });
const StockEvaluation = dynamic(() => import("@/components/StockEvaluation"), { ssr: false });

/**
 * "summary" bundles every /analisis-native panel (TradingView chart, AI
 * narrative, quarterly guidance, news, insider reading + congress flow)
 * because those panels share one fetch and have no legacy equivalent — except
 * the raw insider-transactions list, which InsidersFlowPanel deliberately
 * omits because it's the same FMP source as StockIntelligence's Insider
 * Transactions sub-tab (see InsidersFlowPanel's doc comment). News in Summary
 * (AI-curated, tied to the narrative) and in Intelligence (StockIntelligence's
 * live FMP feed) is an intentional exception, not an oversight: different
 * sources, same relationship as Yahoo's Summary-tab news preview next to a
 * dedicated News tab. "details"/"intelligence"/"evaluation" mount the three
 * legacy /stock components wholesale — their internal pill-tabs (financials/
 * earnings/holdings, news/insider/institutional/transcript) still duplicate
 * some /analisis content structurally; flattening those into this rail is
 * deferred, tracked in knowledge/exec-plans/active/stock-page-unification.md.
 */
const TAB_VALUES = ["summary", "details", "intelligence", "evaluation"] as const;
type TabId = (typeof TAB_VALUES)[number];
const DEFAULT_TAB: TabId = "summary";

/**
 * Anonymous visitors: shown in place of StockDetail/StockIntelligence/
 * StockEvaluation, none of which are mounted at all — they'd just 401 against
 * their own session-gated APIs.
 */
function LockedTabPanel({ ticker }: { ticker: string }) {
  const { t } = useI18n();
  return (
    <div className="card flex flex-col items-center gap-3 p-10 text-center">
      <Lock className="h-6 w-6 text-[color:var(--muted)]" />
      <h2 className="text-lg font-semibold text-[color:var(--foreground)]">{t("analisisLockedTitle")}</h2>
      <p className="max-w-sm text-sm text-[color:var(--muted)]">{t("analisisLockedBody")}</p>
      <a href={buildLoginRedirectHref(`/analisis/${ticker}`)} className="btn-primary mt-2 inline-flex text-sm">
        {t("landingNavLogin")}
      </a>
    </div>
  );
}

export default function AnalisisShell({
  ticker,
  exchange,
}: {
  ticker: string;
  exchange: string;
}) {
  const { t, language } = useI18n();
  const { user } = useAuth();
  const { holdings } = usePortfolio();
  // Home for the current audience — middleware serves landing vs dashboard at `/`.
  // Do not use a client-spoofable ?from= query for this.
  const backHref = "/";
  const { activeTab, navigateToTab } = useTabUrl<TabId>(TAB_VALUES, DEFAULT_TAB);
  const [visited, setVisited] = useState<Set<TabId>>(() => new Set([DEFAULT_TAB]));
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    setVisited((prev) => (prev.has(activeTab) ? prev : new Set(prev).add(activeTab)));
  }, [activeTab]);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const holding = useMemo(
    () =>
      holdings.find(
        (h) => h.ticker.toUpperCase() === ticker.toUpperCase() && (!exchange || h.exchange.toUpperCase() === exchange.toUpperCase()),
      ) || holdings.find((h) => h.ticker.toUpperCase() === ticker.toUpperCase()),
    [holdings, ticker, exchange],
  );

  const data = useCompanyAnalysisReport(ticker);
  const resolvedExchange = exchange || holding?.exchange || data.report?.profile?.exchange || "";
  const marketStatus = resolvedExchange ? getMarketStatus(resolvedExchange, now) : null;

  const tabs: TabRailItem<TabId>[] = [
    { id: "summary", label: t("analisisTabSummary"), icon: LayoutDashboard },
    { id: "details", label: t("fundamentals"), icon: BarChart3, locked: !user },
    { id: "intelligence", label: t("intelligence"), icon: Sparkles, locked: !user },
    { id: "evaluation", label: t("analisisTabEvaluation"), icon: ShieldCheck, locked: !user },
  ];

  if (data.error || (!data.loading && !data.report)) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-8 sm:px-6">
        <div className="card space-y-3 p-6">
          <p className="text-[color:var(--foreground)]">{data.error || t("companyAnalysisLoadError")}</p>
          <Link href={backHref} className="btn-secondary inline-flex">
            {t("companyAnalysisBack")}
          </Link>
        </div>
      </div>
    );
  }

  const report = data.report;
  const name = report?.profile?.name || ticker;
  const priceFormatted = formatAnalysisNumber(report?.quote?.price, language);
  const currency = report?.quote?.currency || "";

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href={backHref} className="btn-secondary text-sm">
          {t("companyAnalysisBack")}
        </Link>
        {user && (
          <button
            type="button"
            className="btn-secondary text-sm ml-auto"
            disabled={data.loading || data.narrativePending}
            onClick={data.regenerate}
            title={t("companyAnalysisRegenerateHint")}
          >
            {data.narrativePending ? t("companyAnalysisRegenerating") : t("companyAnalysisRegenerate")}
          </button>
        )}
      </div>

      <header className="card flex flex-wrap items-start justify-between gap-4 p-6">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-[color:var(--foreground)]">
              {data.loading ? ticker : name}
            </h1>
            {resolvedExchange && (
              <span className="rounded-lg border border-[color:var(--accent)] px-2.5 py-1 text-sm font-semibold text-[color:var(--accent)]">
                {resolvedExchange} · {ticker}
              </span>
            )}
            {marketStatus && (
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  marketStatus.isOpen
                    ? "border border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-400"
                    : "border border-gray-200 bg-gray-100 text-gray-600 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-400"
                }`}
              >
                <span
                  className={`inline-block h-1.5 w-1.5 rounded-full ${marketStatus.isOpen ? "animate-pulse bg-emerald-500" : "bg-gray-400 dark:bg-slate-500"}`}
                />
                {marketStatus.isOpen ? t("marketOpen") : t("marketClosed")}
              </span>
            )}
          </div>
          {data.generatedAt && (
            <p className="text-sm text-[color:var(--muted)]">
              {t("companyAnalysisGeneratedAt")} {data.generatedAt}
              {report?.cached ? ` · ${t("companyAnalysisCached")}` : ""}
            </p>
          )}
          <ExternalQuoteLinks ticker={ticker} exchange={resolvedExchange} />
        </div>
        {priceFormatted != null && (
          <div className="text-right">
            <div className="text-2xl font-semibold text-[color:var(--foreground)]">
              {priceFormatted} {currency}
            </div>
            {report?.quote?.changePercent != null && (
              <Yoy value={report.quote.changePercent} language={language} />
            )}
          </div>
        )}
      </header>

      <VerticalTabRail
        tabs={tabs}
        activeId={activeTab}
        onChange={navigateToTab}
        tone={user ? "auto" : "light"}
      />

      <div className="min-w-0 space-y-6">
        {data.loading && !report ? (
          <div className="card p-6 text-sm text-[color:var(--muted)]">{t("loading")}</div>
        ) : (
          report && (
            <>
              {visited.has("summary") && (
                <div hidden={activeTab !== "summary"} className="space-y-6">
                  <SummaryPanel data={data} />
                  <AnalysisNarrativePanel data={data} />
                  <FundamentalsTablePanel data={data} />
                  <NewsPanel data={data} />
                  <InsidersFlowPanel data={data} />
                </div>
              )}
              {activeTab === "details" && !user && <LockedTabPanel ticker={ticker} />}
              {visited.has("details") && user && (
                <div hidden={activeTab !== "details"}>
                  <StockDetail ticker={ticker} exchange={resolvedExchange} embedded />
                </div>
              )}
              {activeTab === "intelligence" && !user && <LockedTabPanel ticker={ticker} />}
              {visited.has("intelligence") && user && (
                <div hidden={activeTab !== "intelligence"}>
                  <StockIntelligence ticker={ticker} exchange={resolvedExchange} embedded />
                </div>
              )}
              {activeTab === "evaluation" && !user && <LockedTabPanel ticker={ticker} />}
              {visited.has("evaluation") && user && (
                <div hidden={activeTab !== "evaluation"}>
                  <StockEvaluation ticker={ticker} exchange={resolvedExchange} embedded />
                </div>
              )}
            </>
          )
        )}
      </div>
    </div>
  );
}
