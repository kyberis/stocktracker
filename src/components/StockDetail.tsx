"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSettings } from "@/lib/settings-context";
import { usePortfolio } from "@/lib/portfolio-context";
import { useI18n } from "@/lib/i18n";
import { formatCompactNumber } from "@/lib/utils";
import { getMarketStatus } from "@/lib/market-hours";
import { useTrack } from "@/lib/use-track";
import StockChart from "./StockChart";
import type {
  CompanyOverview,
  IncomeStatementReport,
  BalanceSheetReport,
  CashFlowReport,
  EarningsReport,
  FundamentalData,
} from "@/lib/types";

type MainTab = "overview" | "financials" | "earnings";
type FinancialSub = "income" | "balance" | "cashflow";
type Period = "annual" | "quarterly";
type AiStatus = "idle" | "loading" | "done" | "error" | "no-key";

interface StockDetailProps {
  ticker: string;
  exchange: string;
}

export default function StockDetail({ ticker, exchange }: StockDetailProps) {
  const { isAlphaVantage, provider, getApiHeaders, trackAvCalls } = useSettings();
  const { holdings } = usePortfolio();
  const { t, language } = useI18n();

  const holding = holdings.find(
    (h) =>
      h.ticker.toUpperCase() === ticker.toUpperCase() &&
      (!exchange || h.exchange.toUpperCase() === exchange.toUpperCase())
  ) || holdings.find((h) => h.ticker.toUpperCase() === ticker.toUpperCase());

  const [mainTab, setMainTab] = useState<MainTab>("overview");
  const [financialSub, setFinancialSub] = useState<FinancialSub>("income");
  const [period, setPeriod] = useState<Period>("annual");
  const [now, setNow] = useState(() => new Date());

  const [overview, setOverview] = useState<CompanyOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);

  const [income, setIncome] = useState<FundamentalData<IncomeStatementReport> | null>(null);
  const [balance, setBalance] = useState<FundamentalData<BalanceSheetReport> | null>(null);
  const [cashflow, setCashflow] = useState<FundamentalData<CashFlowReport> | null>(null);
  const [earnings, setEarnings] = useState<FundamentalData<EarningsReport> | null>(null);

  const [incomeLoading, setIncomeLoading] = useState(false);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [cashflowLoading, setCashflowLoading] = useState(false);
  const [earningsLoading, setEarningsLoading] = useState(false);

  const [aiStatus, setAiStatus] = useState<AiStatus>("idle");
  const [aiText, setAiText] = useState("");

  const track = useTrack();
  const marketStatus = exchange ? getMarketStatus(exchange, now) : null;

  useEffect(() => {
    track("stock_view", { ticker });
  }, [ticker]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const fetchOverview = useCallback(async () => {
    if (!isAlphaVantage || overviewLoading || overview) return;
    setOverviewLoading(true);
    try {
      const headers = getApiHeaders();
      const params = new URLSearchParams({ symbol: ticker, provider });
      const res = await fetch(`/api/overview?${params}`, { headers });
      trackAvCalls(res);
      if (res.ok) setOverview(await res.json());
    } catch { /* supplementary */ } finally {
      setOverviewLoading(false);
    }
  }, [isAlphaVantage, overviewLoading, overview, getApiHeaders, ticker, provider, trackAvCalls]);

  const fetchFundamental = useCallback(
    async (type: string) => {
      const headers = getApiHeaders();
      const params = new URLSearchParams({ symbol: ticker, type, provider });
      const res = await fetch(`/api/fundamentals?${params}`, { headers });
      trackAvCalls(res);
      if (!res.ok) return null;
      return res.json();
    },
    [getApiHeaders, ticker, provider, trackAvCalls]
  );

  const requestAiAnalysis = useCallback(async () => {
    if (aiStatus === "loading") return;
    setAiStatus("loading");
    setAiText("");
    track("ai_analysis", { ticker });

    const payload: Record<string, unknown> = {
      companyName: holding?.name,
      ticker,
      exchange,
      language,
    };
    if (overview) payload.overview = overview;
    if (income) {
      const slice = income.annual.slice(0, 3);
      payload.income = slice.length ? slice : income.quarterly.slice(0, 4);
    }
    if (balance) {
      const slice = balance.annual.slice(0, 2);
      payload.balance = slice.length ? slice : balance.quarterly.slice(0, 4);
    }
    if (cashflow) {
      const slice = cashflow.annual.slice(0, 3);
      payload.cashflow = slice.length ? slice : cashflow.quarterly.slice(0, 4);
    }
    if (earnings) {
      payload.earnings = earnings.quarterly.slice(0, 6);
    }

    try {
      const res = await fetch("/api/ai-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.status === 501) {
        setAiStatus("no-key");
        return;
      }
      if (!res.ok) {
        setAiStatus("error");
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setAiStatus("error");
        return;
      }

      const decoder = new TextDecoder();
      let accumulated = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setAiText(accumulated);
      }
      setAiStatus("done");
    } catch {
      setAiStatus("error");
    }
  }, [aiStatus, holding?.name, ticker, exchange, language, overview, income, balance, cashflow, earnings]);

  useEffect(() => {
    if (isAlphaVantage) fetchOverview();
  }, [isAlphaVantage, fetchOverview]);

  useEffect(() => {
    if (!isAlphaVantage) return;
    if (mainTab === "financials" && financialSub === "income" && !income && !incomeLoading) {
      setIncomeLoading(true);
      fetchFundamental("income").then(setIncome).finally(() => setIncomeLoading(false));
    }
    if (mainTab === "financials" && financialSub === "balance" && !balance && !balanceLoading) {
      setBalanceLoading(true);
      fetchFundamental("balance").then(setBalance).finally(() => setBalanceLoading(false));
    }
    if (mainTab === "financials" && financialSub === "cashflow" && !cashflow && !cashflowLoading) {
      setCashflowLoading(true);
      fetchFundamental("cashflow").then(setCashflow).finally(() => setCashflowLoading(false));
    }
    if (mainTab === "earnings" && !earnings && !earningsLoading) {
      setEarningsLoading(true);
      fetchFundamental("earnings").then(setEarnings).finally(() => setEarningsLoading(false));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mainTab, financialSub, isAlphaVantage]);

  useEffect(() => {
    setOverview(null);
    setIncome(null);
    setBalance(null);
    setCashflow(null);
    setEarnings(null);
  }, [provider]);

  const mainTabs: { key: MainTab; label: string }[] = [
    { key: "overview", label: t("overview") },
    { key: "financials", label: t("financialStatements") },
    { key: "earnings", label: t("earnings") },
  ];

  const financialTabs: { key: FinancialSub; label: string }[] = [
    { key: "income", label: t("incomeStatement") },
    { key: "balance", label: t("balanceSheet") },
    { key: "cashflow", label: t("cashFlow") },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Header */}
      <header className="bg-nav-bg text-white">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-sm text-slate-300 hover:text-white transition-colors flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              {t("backToPortfolio")}
            </Link>
          </div>
          <div className="flex items-center gap-3">
            {marketStatus && (
              <span
                className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                  marketStatus.isOpen
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : "bg-slate-700 text-slate-400 border border-slate-600"
                }`}
              >
                <span
                  className={`inline-block w-1.5 h-1.5 rounded-full ${
                    marketStatus.isOpen ? "bg-emerald-400 animate-pulse" : "bg-slate-500"
                  }`}
                />
                {marketStatus.isOpen ? t("marketOpen") : t("marketClosed")}
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Stock Identity */}
        <div className="card px-6 py-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {holding?.name || ticker}
              </h1>
              <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
                <span>{ticker}</span>
                {exchange && (
                  <>
                    <span className="text-gray-300 dark:text-slate-600">·</span>
                    <span>{exchange}</span>
                  </>
                )}
                {holding?.assetType && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 border border-gray-200 dark:border-slate-600">
                    {holding.assetType.toUpperCase()}
                  </span>
                )}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              {overview && (
                <div className="text-right">
                  <p className="text-xs text-gray-400 dark:text-slate-500">{overview.sector}</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">{overview.industry}</p>
                </div>
              )}
              {isAlphaVantage && (
                <Link
                  href={`/stock/${encodeURIComponent(ticker)}/intelligence?exchange=${encodeURIComponent(exchange)}`}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                  {t("viewIntelligence")}
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Chart */}
        {holding && (
          <div className="card px-6 py-5">
            <StockChart
              ticker={holding.ticker}
              purchasePrice={holding.purchasePrice}
              displayCurrency={holding.displayCurrency}
            />
          </div>
        )}

        {/* AI Analysis CTA */}
        {isAlphaVantage && (
          <AiAnalysisSection
            status={aiStatus}
            text={aiText}
            onAnalyze={requestAiAnalysis}
          />
        )}

        {/* AV Required Message */}
        {!isAlphaVantage && (
          <div className="card px-6 py-10 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-500/10 mb-4">
              <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-gray-600 dark:text-slate-300 text-sm max-w-md mx-auto">
              {t("fundamentalsRequireAV")}
            </p>
            <Link href="/" className="inline-block mt-4 text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors">
              {t("backToPortfolio")}
            </Link>
          </div>
        )}

        {/* Fundamentals Tabs */}
        {isAlphaVantage && (
          <>
            {/* Main Tab Pills */}
            <div className="flex gap-1.5">
              {mainTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setMainTab(tab.key)}
                  className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
                    mainTab === tab.key
                      ? "bg-emerald-500 text-white"
                      : "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Overview Tab */}
            {mainTab === "overview" && (
              <OverviewTab overview={overview} loading={overviewLoading} />
            )}

            {/* Financials Tab */}
            {mainTab === "financials" && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex gap-1">
                    {financialTabs.map((tab) => (
                      <button
                        key={tab.key}
                        onClick={() => setFinancialSub(tab.key)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                          financialSub === tab.key
                            ? "bg-emerald-500 text-white"
                            : "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-1 ml-auto">
                    {(["annual", "quarterly"] as Period[]).map((p) => (
                      <button
                        key={p}
                        onClick={() => setPeriod(p)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                          period === p
                            ? "bg-emerald-500 text-white"
                            : "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600"
                        }`}
                      >
                        {t(p)}
                      </button>
                    ))}
                  </div>
                </div>

                {financialSub === "income" && (
                  <IncomeTable data={income} period={period} loading={incomeLoading} />
                )}
                {financialSub === "balance" && (
                  <BalanceTable data={balance} period={period} loading={balanceLoading} />
                )}
                {financialSub === "cashflow" && (
                  <CashFlowTable data={cashflow} period={period} loading={cashflowLoading} />
                )}
              </div>
            )}

            {/* Earnings Tab */}
            {mainTab === "earnings" && (
              <EarningsTab data={earnings} period={period} setPeriod={setPeriod} loading={earningsLoading} />
            )}
          </>
        )}
      </main>
    </div>
  );
}

/* ── AI Analysis ─────────────────────────────────────────────── */

function AiAnalysisSection({
  status,
  text,
  onAnalyze,
}: {
  status: AiStatus;
  text: string;
  onAnalyze: () => void;
}) {
  const { t } = useI18n();

  if (status === "idle") {
    return (
      <button
        onClick={onAnalyze}
        className="card group w-full px-6 py-5 flex items-center gap-4 text-left transition-shadow hover:shadow-md hover:ring-1 hover:ring-emerald-500/30"
      >
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-emerald-500 flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
            {t("aiAnalyzeButton")}
          </p>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
            {t("aiAnalysisDesc")}
          </p>
        </div>
        <svg className="w-5 h-5 text-gray-300 dark:text-slate-600 group-hover:text-emerald-500 transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </button>
    );
  }

  if (status === "no-key") {
    return (
      <div className="card px-6 py-5">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center mt-0.5">
            <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <p className="text-sm text-amber-700 dark:text-amber-400">{t("aiNoKey")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card px-6 py-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-emerald-500 flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-200">
            {t("aiAnalysis")}
          </h3>
          {status === "loading" && (
            <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-emerald-500" />
          )}
        </div>
        {status === "done" && (
          <button
            onClick={onAnalyze}
            className="text-xs text-gray-400 dark:text-slate-500 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors"
            title="Re-run analysis"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
            </svg>
          </button>
        )}
      </div>

      {status === "error" ? (
        <div className="flex items-center gap-2 text-sm text-red-500 dark:text-red-400">
          <span>{t("aiError")}</span>
          <button
            onClick={onAnalyze}
            className="underline hover:no-underline text-xs"
          >
            {t("aiAnalyzeButton")}
          </button>
        </div>
      ) : (
        <div className="prose prose-sm dark:prose-invert max-w-none text-gray-600 dark:text-slate-300 leading-relaxed ai-markdown">
          <AiMarkdown text={text} />
        </div>
      )}

      {(status === "done" || text.length > 100) && (
        <p className="text-[10px] text-gray-400 dark:text-slate-600 italic pt-1 border-t border-gray-100 dark:border-slate-700">
          {t("aiDisclaimer")}
        </p>
      )}
    </div>
  );
}

function AiMarkdown({ text }: { text: string }) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("## ")) {
      elements.push(
        <h3 key={i} className="text-sm font-semibold text-gray-800 dark:text-slate-100 mt-3 mb-1">
          {line.slice(3)}
        </h3>
      );
    } else if (line.startsWith("**") && line.endsWith("**")) {
      elements.push(
        <p key={i} className="text-sm font-semibold text-gray-800 dark:text-slate-100 mt-2">
          {line.slice(2, -2)}
        </p>
      );
    } else if (line.startsWith("- ")) {
      elements.push(
        <p key={i} className="text-sm pl-3 before:content-['•'] before:mr-2 before:text-emerald-500">
          {renderInlineBold(line.slice(2))}
        </p>
      );
    } else if (line.trim() === "") {
      elements.push(<div key={i} className="h-2" />);
    } else {
      elements.push(
        <p key={i} className="text-sm">{renderInlineBold(line)}</p>
      );
    }
  }

  return <>{elements}</>;
}

function renderInlineBold(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="font-semibold text-gray-800 dark:text-slate-100">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

/* ── Sub-components ──────────────────────────────────────────── */

function LoadingSpinner({ label }: { label: string }) {
  return (
    <div className="card px-6 py-10 flex items-center justify-center gap-3 text-gray-400 dark:text-slate-500 text-sm">
      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-500" />
      {label}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="card px-6 py-10 text-center text-gray-400 dark:text-slate-500 text-sm">
      {label}
    </div>
  );
}

/* ── Overview ────────────────────────────────────────────────── */

function OverviewTab({ overview, loading }: { overview: CompanyOverview | null; loading: boolean }) {
  const { t } = useI18n();

  if (loading) return <LoadingSpinner label={t("loadingOverview")} />;
  if (!overview) return <EmptyState label={t("noFundamentalData")} />;

  const metricItems: Array<{ label: string; value: string }> = [
    overview.peRatio != null ? { label: t("peRatio"), value: overview.peRatio.toFixed(2) } : null,
    overview.forwardPE != null ? { label: t("forwardPE"), value: overview.forwardPE.toFixed(2) } : null,
    overview.pegRatio != null ? { label: t("pegRatio"), value: overview.pegRatio.toFixed(2) } : null,
    overview.eps != null ? { label: t("eps"), value: `${overview.currency} ${overview.eps.toFixed(2)}` } : null,
    overview.dividendYield != null ? { label: t("dividendYield"), value: `${(overview.dividendYield * 100).toFixed(2)}%` } : null,
    overview.dividendPerShare != null ? { label: t("dividendPerShare"), value: `${overview.currency} ${overview.dividendPerShare.toFixed(2)}` } : null,
    overview.beta != null ? { label: t("beta"), value: overview.beta.toFixed(2) } : null,
    overview.profitMargin != null ? { label: t("profitMargin"), value: `${(overview.profitMargin * 100).toFixed(1)}%` } : null,
    overview.returnOnEquity != null ? { label: t("returnOnEquity"), value: `${(overview.returnOnEquity * 100).toFixed(1)}%` } : null,
    overview.revenueTTM != null ? { label: t("revenueTTM"), value: formatCompactNumber(overview.revenueTTM) } : null,
    overview.analystTargetPrice != null ? { label: t("analystTarget"), value: `${overview.currency} ${overview.analystTargetPrice.toFixed(2)}` } : null,
    overview.fiftyDayMA != null ? { label: t("fiftyDayMA"), value: `${overview.currency} ${overview.fiftyDayMA.toFixed(2)}` } : null,
    overview.twoHundredDayMA != null ? { label: t("twoHundredDayMA"), value: `${overview.currency} ${overview.twoHundredDayMA.toFixed(2)}` } : null,
    overview.sharesOutstanding != null ? { label: t("sharesOutstanding"), value: formatCompactNumber(overview.sharesOutstanding) } : null,
  ].filter((i): i is { label: string; value: string } => i != null);

  const ratings = overview.analystRatings;
  const totalRatings = ratings ? ratings.strongBuy + ratings.buy + ratings.hold + ratings.sell + ratings.strongSell : 0;

  return (
    <div className="space-y-4">
      {/* Description */}
      {overview.description && (
        <div className="card px-6 py-5">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-200 mb-2">{t("description")}</h3>
          <p className="text-sm text-gray-500 dark:text-slate-400 leading-relaxed">{overview.description}</p>
        </div>
      )}

      {/* Key Metrics Grid */}
      <div className="card px-6 py-5">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-200 mb-3">{t("keyMetrics")}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {metricItems.map(({ label, value }) => (
            <div key={label} className="bg-gray-50 dark:bg-slate-700/50 rounded-xl px-3 py-2.5">
              <p className="text-[10px] font-medium text-gray-400 dark:text-slate-500 uppercase tracking-wider">{label}</p>
              <p className="text-sm font-semibold text-gray-800 dark:text-slate-100 mt-0.5">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Analyst Ratings */}
      {ratings && totalRatings > 0 && (
        <div className="card px-6 py-5">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-200 mb-3">{t("analystRatings")}</h3>
          <div className="flex gap-0.5 h-4 rounded-full overflow-hidden mb-2">
            {ratings.strongBuy > 0 && <div className="bg-emerald-500" style={{ width: `${(ratings.strongBuy / totalRatings) * 100}%` }} />}
            {ratings.buy > 0 && <div className="bg-green-400" style={{ width: `${(ratings.buy / totalRatings) * 100}%` }} />}
            {ratings.hold > 0 && <div className="bg-amber-400" style={{ width: `${(ratings.hold / totalRatings) * 100}%` }} />}
            {ratings.sell > 0 && <div className="bg-orange-400" style={{ width: `${(ratings.sell / totalRatings) * 100}%` }} />}
            {ratings.strongSell > 0 && <div className="bg-red-500" style={{ width: `${(ratings.strongSell / totalRatings) * 100}%` }} />}
          </div>
          <div className="flex justify-between text-xs text-gray-500 dark:text-slate-400">
            <span className="text-emerald-600 dark:text-emerald-400">{t("buy")} {ratings.strongBuy + ratings.buy}</span>
            <span className="text-amber-600 dark:text-amber-400">{t("hold")} {ratings.hold}</span>
            <span className="text-red-500 dark:text-red-400">{t("sell")} {ratings.sell + ratings.strongSell}</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Financial Statement Table Helper ────────────────────────── */

interface FinancialRow {
  label: string;
  key: string;
}

function FinancialTable<T extends { fiscalDateEnding: string }>({
  data,
  period,
  loading,
  rows,
}: {
  data: FundamentalData<T> | null;
  period: Period;
  loading: boolean;
  rows: FinancialRow[];
}) {
  const { t } = useI18n();

  if (loading) return <LoadingSpinner label={t("loadingFundamentals")} />;
  if (!data) return <EmptyState label={t("noFundamentalData")} />;

  const reports = period === "annual" ? data.annual : data.quarterly;
  if (reports.length === 0) return <EmptyState label={t("noFundamentalData")} />;

  const displayed = reports.slice(0, 5);

  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 dark:bg-slate-800/50">
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400 sticky left-0 bg-gray-50 dark:bg-slate-800/50 z-10 min-w-[160px]">
              {t("fiscalDate")}
            </th>
            {displayed.map((r) => (
              <th key={r.fiscalDateEnding} className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400 min-w-[120px]">
                {r.fiscalDateEnding}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr
              key={row.key}
              className={`border-t border-gray-100 dark:border-slate-700 ${idx % 2 === 0 ? "" : "bg-gray-50/50 dark:bg-slate-800/20"}`}
            >
              <td className="px-4 py-2.5 text-xs font-medium text-gray-700 dark:text-slate-300 sticky left-0 bg-white dark:bg-slate-800 z-10">
                {row.label}
              </td>
              {displayed.map((report) => {
                const val = (report as Record<string, unknown>)[row.key];
                return (
                  <td key={report.fiscalDateEnding} className="text-right px-4 py-2.5 text-xs tabular-nums text-gray-600 dark:text-slate-300">
                    {val != null ? formatCompactNumber(val as number) : "—"}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Income Statement ────────────────────────────────────────── */

function IncomeTable({
  data,
  period,
  loading,
}: {
  data: FundamentalData<IncomeStatementReport> | null;
  period: Period;
  loading: boolean;
}) {
  const { t } = useI18n();
  const rows: FinancialRow[] = [
    { label: t("totalRevenue"), key: "totalRevenue" },
    { label: t("costOfRevenue"), key: "costOfRevenue" },
    { label: t("grossProfit"), key: "grossProfit" },
    { label: t("operatingExpenses"), key: "operatingExpenses" },
    { label: t("sellingGeneralAndAdmin"), key: "sellingGeneralAndAdmin" },
    { label: t("researchAndDevelopment"), key: "researchAndDevelopment" },
    { label: t("operatingIncome"), key: "operatingIncome" },
    { label: t("interestExpense"), key: "interestExpense" },
    { label: t("incomeBeforeTax"), key: "incomeBeforeTax" },
    { label: t("incomeTaxExpense"), key: "incomeTaxExpense" },
    { label: t("netIncome"), key: "netIncome" },
    { label: t("ebitda"), key: "ebitda" },
  ];
  return <FinancialTable data={data} period={period} loading={loading} rows={rows} />;
}

/* ── Balance Sheet ───────────────────────────────────────────── */

function BalanceTable({
  data,
  period,
  loading,
}: {
  data: FundamentalData<BalanceSheetReport> | null;
  period: Period;
  loading: boolean;
}) {
  const { t } = useI18n();
  const rows: FinancialRow[] = [
    { label: t("totalAssets"), key: "totalAssets" },
    { label: t("totalCurrentAssets"), key: "totalCurrentAssets" },
    { label: t("cashAndEquivalents"), key: "cashAndEquivalents" },
    { label: t("totalNonCurrentAssets"), key: "totalNonCurrentAssets" },
    { label: t("totalLiabilities"), key: "totalLiabilities" },
    { label: t("totalCurrentLiabilities"), key: "totalCurrentLiabilities" },
    { label: t("totalNonCurrentLiabilities"), key: "totalNonCurrentLiabilities" },
    { label: t("longTermDebt"), key: "longTermDebt" },
    { label: t("shortTermDebt"), key: "shortTermDebt" },
    { label: t("totalShareholderEquity"), key: "totalShareholderEquity" },
    { label: t("retainedEarnings"), key: "retainedEarnings" },
    { label: t("sharesOutstanding"), key: "commonStockSharesOutstanding" },
  ];
  return <FinancialTable data={data} period={period} loading={loading} rows={rows} />;
}

/* ── Cash Flow ───────────────────────────────────────────────── */

function CashFlowTable({
  data,
  period,
  loading,
}: {
  data: FundamentalData<CashFlowReport> | null;
  period: Period;
  loading: boolean;
}) {
  const { t } = useI18n();
  const rows: FinancialRow[] = [
    { label: t("operatingCashflow"), key: "operatingCashflow" },
    { label: t("capitalExpenditures"), key: "capitalExpenditures" },
    { label: t("freeCashFlow"), key: "freeCashFlow" },
    { label: t("changeInCash"), key: "changeInCash" },
    { label: t("dividendPayout"), key: "dividendPayout" },
    { label: t("shareRepurchase"), key: "shareRepurchase" },
  ];
  return <FinancialTable data={data} period={period} loading={loading} rows={rows} />;
}

/* ── Earnings ────────────────────────────────────────────────── */

function EarningsTab({
  data,
  period,
  setPeriod,
  loading,
}: {
  data: FundamentalData<EarningsReport> | null;
  period: Period;
  setPeriod: (p: Period) => void;
  loading: boolean;
}) {
  const { t } = useI18n();

  if (loading) return <LoadingSpinner label={t("loadingFundamentals")} />;
  if (!data) return <EmptyState label={t("noFundamentalData")} />;

  const reports = period === "annual" ? data.annual : data.quarterly;
  if (reports.length === 0) return <EmptyState label={t("noFundamentalData")} />;

  const displayed = reports.slice(0, 12);
  const hasEstimates = period === "quarterly";

  return (
    <div className="space-y-4">
      <div className="flex gap-1 justify-end">
        {(["annual", "quarterly"] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
              period === p
                ? "bg-emerald-500 text-white"
                : "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600"
            }`}
          >
            {t(p)}
          </button>
        ))}
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-slate-800/50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400">{t("fiscalDate")}</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400">{t("reportedEPS")}</th>
              {hasEstimates && (
                <>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400">{t("estimatedEPS")}</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400">{t("epsSurprise")}</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400">{t("epsSurprisePercent")}</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {displayed.map((r, idx) => {
              const isBeat = r.surprise != null && r.surprise > 0;
              const isMiss = r.surprise != null && r.surprise < 0;
              return (
                <tr
                  key={r.fiscalDateEnding}
                  className={`border-t border-gray-100 dark:border-slate-700 ${idx % 2 === 0 ? "" : "bg-gray-50/50 dark:bg-slate-800/20"}`}
                >
                  <td className="px-4 py-2.5 text-xs font-medium text-gray-700 dark:text-slate-300">{r.fiscalDateEnding}</td>
                  <td className="text-right px-4 py-2.5 text-xs tabular-nums text-gray-600 dark:text-slate-300">
                    {r.reportedEPS != null ? r.reportedEPS.toFixed(2) : "—"}
                  </td>
                  {hasEstimates && (
                    <>
                      <td className="text-right px-4 py-2.5 text-xs tabular-nums text-gray-600 dark:text-slate-300">
                        {r.estimatedEPS != null ? r.estimatedEPS.toFixed(2) : "—"}
                      </td>
                      <td className={`text-right px-4 py-2.5 text-xs tabular-nums font-medium ${isBeat ? "text-emerald-600 dark:text-emerald-400" : isMiss ? "text-red-500 dark:text-red-400" : "text-gray-600 dark:text-slate-300"}`}>
                        {r.surprise != null ? r.surprise.toFixed(2) : "—"}
                      </td>
                      <td className={`text-right px-4 py-2.5 text-xs tabular-nums font-medium ${isBeat ? "text-emerald-600 dark:text-emerald-400" : isMiss ? "text-red-500 dark:text-red-400" : "text-gray-600 dark:text-slate-300"}`}>
                        {r.surprisePercentage != null ? `${r.surprisePercentage.toFixed(1)}%` : "—"}
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
