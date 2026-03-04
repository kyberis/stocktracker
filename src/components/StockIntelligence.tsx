"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSettings } from "@/lib/settings-context";
import { usePortfolio } from "@/lib/portfolio-context";
import { useI18n } from "@/lib/i18n";
import { formatCompactNumber } from "@/lib/utils";
import { getMarketStatus } from "@/lib/market-hours";
import { useTrack } from "@/lib/use-track";
import { useAuth } from "@/lib/auth-context";
import ProCompareCard from "@/components/ProCompareCard";
import type { UpsellReason } from "@/lib/upsell";
import type {
  NewsArticle,
  InsiderTransaction,
  InstitutionalHolder,
} from "@/lib/types";

type IntelTab = "news" | "insider" | "institutional" | "transcript";
type AiStatus = "idle" | "loading" | "done" | "error" | "no-key" | "ai-limit" | "upgrade";

interface StockIntelligenceProps {
  ticker: string;
  exchange: string;
}

export default function StockIntelligence({ ticker, exchange }: StockIntelligenceProps) {
  const { isAlphaVantage, provider, getApiHeaders, trackAvCalls } = useSettings();
  const { holdings } = usePortfolio();
  const { user } = useAuth();
  const { t, language } = useI18n();
  const track = useTrack();

  const holding = holdings.find(
    (h) =>
      h.ticker.toUpperCase() === ticker.toUpperCase() &&
      (!exchange || h.exchange.toUpperCase() === exchange.toUpperCase())
  ) || holdings.find((h) => h.ticker.toUpperCase() === ticker.toUpperCase());

  const [activeTab, setActiveTab] = useState<IntelTab>("news");
  const [now, setNow] = useState(() => new Date());

  const [news, setNews] = useState<NewsArticle[] | null>(null);
  const [newsLoading, setNewsLoading] = useState(false);

  const [insiders, setInsiders] = useState<InsiderTransaction[] | null>(null);
  const [insiderLoading, setInsiderLoading] = useState(false);

  const [institutional, setInstitutional] = useState<InstitutionalHolder[] | null>(null);
  const [institutionalLoading, setInstitutionalLoading] = useState(false);

  const [transcript, setTranscript] = useState<string | null>(null);
  const [transcriptLoading, setTranscriptLoading] = useState(false);
  const [transcriptQuarter, setTranscriptQuarter] = useState(() => {
    const now = new Date();
    const q = Math.ceil(now.getMonth() / 3);
    const prevQ = q === 1 ? 4 : q - 1;
    const year = q === 1 ? now.getFullYear() - 1 : now.getFullYear();
    return `${year}Q${prevQ}`;
  });

  const [aiStatus, setAiStatus] = useState<AiStatus>("idle");
  const [aiText, setAiText] = useState("");
  const [aiLimitInfo, setAiLimitInfo] = useState<{ used: number; limit: number } | null>(null);
  const [lockedReason, setLockedReason] = useState<UpsellReason | null>(null);

  const marketStatus = exchange ? getMarketStatus(exchange, now) : null;
  const isFree = user?.plan !== "pro";

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const fetchIntelligence = useCallback(
    async (type: IntelTab, quarter?: string) => {
      const headers = getApiHeaders();
      const params = new URLSearchParams({ symbol: ticker, type, provider });
      if (type === "transcript" && quarter) {
        params.set("quarter", quarter);
      }
      const res = await fetch(`/api/intelligence?${params}`, { headers });
      trackAvCalls(res);
      if (res.status === 403) {
        const body = await res.json().catch(() => null);
        if (body?.reason === "upgrade_required") setLockedReason("upgrade_required");
        return null;
      }
      if (!res.ok) return null;
      return res.json();
    },
    [getApiHeaders, ticker, provider, trackAvCalls]
  );

  useEffect(() => {
    if (!isAlphaVantage) return;

    if (activeTab === "news" && !news && !newsLoading) {
      setNewsLoading(true);
      fetchIntelligence("news")
        .then((data) => {
          if (Array.isArray(data)) setNews(data);
          else setNews([]);
        })
        .catch(() => setNews([]))
        .finally(() => setNewsLoading(false));
    }

    if (activeTab === "insider" && !insiders && !insiderLoading) {
      setInsiderLoading(true);
      fetchIntelligence("insider")
        .then((data) => {
          if (Array.isArray(data)) setInsiders(data);
          else setInsiders([]);
        })
        .catch(() => setInsiders([]))
        .finally(() => setInsiderLoading(false));
    }

    if (activeTab === "institutional" && !institutional && !institutionalLoading) {
      setInstitutionalLoading(true);
      fetchIntelligence("institutional")
        .then((data) => {
          if (Array.isArray(data)) setInstitutional(data);
          else setInstitutional([]);
        })
        .catch(() => setInstitutional([]))
        .finally(() => setInstitutionalLoading(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, isAlphaVantage]);

  const loadTranscript = useCallback(
    async (q: string) => {
      setTranscriptLoading(true);
      setTranscript(null);
      try {
        const data = await fetchIntelligence("transcript", q);
        if (data?.transcript) {
          setTranscript(data.transcript);
        } else {
          setTranscript("");
        }
      } catch {
        setTranscript("");
      } finally {
        setTranscriptLoading(false);
      }
    },
    [fetchIntelligence]
  );

  useEffect(() => {
    if (!isAlphaVantage || activeTab !== "transcript") return;
    loadTranscript(transcriptQuarter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, isAlphaVantage, transcriptQuarter]);

  useEffect(() => {
    setNews(null);
    setInsiders(null);
    setInstitutional(null);
    setTranscript(null);
  }, [provider]);

  const requestAiAnalysis = useCallback(async () => {
    if (aiStatus === "loading") return;
    setAiStatus("loading");
    setAiText("");
    setAiLimitInfo(null);
    track("ai_analysis", { ticker, type: "intelligence" });

    const payload: Record<string, unknown> = {
      companyName: holding?.name,
      ticker,
      exchange,
      language,
      analysisType: "intelligence",
    };

    if (activeTab === "news" && news) {
      payload.news = news.slice(0, 15).map((a) => ({
        title: a.title,
        source: a.source,
        publishedAt: a.publishedAt,
        summary: a.summary,
        sentiment: a.overallSentiment,
        sentimentScore: a.overallSentimentScore,
      }));
    }
    if (activeTab === "insider" && insiders) {
      payload.insiderTransactions = insiders.slice(0, 20);
    }
    if (activeTab === "institutional" && institutional) {
      payload.institutionalHoldings = institutional.slice(0, 15);
    }
    if (activeTab === "transcript" && transcript) {
      payload.earningsTranscript = transcript.slice(0, 8000);
    }

    payload.focusTab = activeTab;

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
      if (res.status === 403) {
        const body = await res.json().catch(() => null);
        if (body?.reason === "ai_limit_reached") {
          setAiLimitInfo({
            used: Number(body?.used || 0),
            limit: Number(body?.limit || 5),
          });
          setAiStatus("ai-limit");
          return;
        }
        if (body?.reason === "upgrade_required") {
          setAiStatus("upgrade");
          return;
        }
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
  }, [aiStatus, holding?.name, ticker, exchange, language, activeTab, news, insiders, institutional, transcript]);

  useEffect(() => {
    setAiStatus("idle");
    setAiText("");
  }, [activeTab]);

  const tabs: { key: IntelTab; label: string }[] = [
    { key: "news", label: t("newsSentiment") },
    { key: "insider", label: t("insiderTransactions") },
    { key: "institutional", label: t("institutionalHoldings") },
    { key: "transcript", label: t("earningsTranscript") },
  ];

  const hasData =
    (activeTab === "news" && news && news.length > 0) ||
    (activeTab === "insider" && insiders && insiders.length > 0) ||
    (activeTab === "institutional" && institutional && institutional.length > 0) ||
    (activeTab === "transcript" && transcript && transcript.length > 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Header */}
      <header className="bg-nav-bg text-white">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/stock/${encodeURIComponent(ticker)}?exchange=${encodeURIComponent(exchange)}`}
              className="text-sm text-slate-300 hover:text-white transition-colors flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              {t("stockDetailTitle")}
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
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {holding?.name || ticker}
                </h1>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-500/20">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                  {t("intelligence")}
                </span>
              </div>
              <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
                <span>{ticker}</span>
                {exchange && (
                  <>
                    <span className="text-gray-300 dark:text-slate-600">&middot;</span>
                    <span>{exchange}</span>
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* AV Required */}
        {!isAlphaVantage && (
          isFree ? (
            <ProCompareCard surface="intelligence_locked" reason="upgrade_required" />
          ) : (
            <div className="card px-6 py-10 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-500/10 mb-4">
                <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-gray-600 dark:text-slate-300 text-sm max-w-md mx-auto">
                {t("intelligenceRequireAV")}
              </p>
              <Link href="/" className="inline-block mt-4 text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors">
                {t("backToPortfolio")}
              </Link>
            </div>
          )
        )}

        {isAlphaVantage && lockedReason && isFree && (
          <ProCompareCard surface="intelligence_locked" reason={lockedReason} />
        )}

        {/* Intelligence Content */}
        {isAlphaVantage && (
          <>
            {/* Tab Pills */}
            <div className="flex flex-wrap gap-1.5">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
                    activeTab === tab.key
                      ? "bg-emerald-500 text-white"
                      : "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* AI CTA */}
            {hasData && (
              <AiIntelligenceSection
                status={aiStatus}
                text={aiText}
                onAnalyze={requestAiAnalysis}
                aiLimitInfo={aiLimitInfo}
              />
            )}

            {/* Tab Content */}
            {activeTab === "news" && (
              <NewsSentimentTab news={news} loading={newsLoading} />
            )}
            {activeTab === "insider" && (
              <InsiderTab insiders={insiders} loading={insiderLoading} />
            )}
            {activeTab === "institutional" && (
              <InstitutionalTab data={institutional} loading={institutionalLoading} />
            )}
            {activeTab === "transcript" && (
              <TranscriptTab
                transcript={transcript}
                loading={transcriptLoading}
                quarter={transcriptQuarter}
                onQuarterChange={(q) => setTranscriptQuarter(q)}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}

/* ── AI Intelligence Section ─────────────────────────────────── */

function AiIntelligenceSection({
  status,
  text,
  onAnalyze,
  aiLimitInfo,
}: {
  status: AiStatus;
  text: string;
  onAnalyze: () => void;
  aiLimitInfo: { used: number; limit: number } | null;
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
            {t("aiIntelligenceButton")}
          </p>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
            {t("aiIntelligenceDesc")}
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
  if (status === "ai-limit") {
    return (
      <ProCompareCard
        surface="ai_limit"
        reason="ai_limit_reached"
        aiUsage={aiLimitInfo || { used: 0, limit: 5 }}
      />
    );
  }
  if (status === "upgrade") {
    return <ProCompareCard surface="ai_limit" reason="upgrade_required" />;
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
          <button onClick={onAnalyze} className="underline hover:no-underline text-xs">
            {t("aiIntelligenceButton")}
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

/* ── Shared ────────────────────────────────────────────────────── */

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
      elements.push(<p key={i} className="text-sm">{renderInlineBold(line)}</p>);
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

/* ── News & Sentiment ─────────────────────────────────────────── */

function sentimentColor(label: string): string {
  const l = label.toLowerCase();
  if (l.includes("bullish")) return "text-emerald-600 dark:text-emerald-400";
  if (l.includes("bearish")) return "text-red-500 dark:text-red-400";
  return "text-amber-600 dark:text-amber-400";
}

function sentimentBg(label: string): string {
  const l = label.toLowerCase();
  if (l.includes("bullish")) return "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20";
  if (l.includes("bearish")) return "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20";
  return "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20";
}

function formatAvDate(raw: string): string {
  if (!raw || raw.length < 8) return raw;
  const year = raw.slice(0, 4);
  const month = raw.slice(4, 6);
  const day = raw.slice(6, 8);
  const hour = raw.length >= 13 ? raw.slice(9, 11) : "";
  const min = raw.length >= 13 ? raw.slice(11, 13) : "";
  const dateStr = `${year}-${month}-${day}`;
  if (hour && min) return `${dateStr} ${hour}:${min}`;
  return dateStr;
}

function NewsSentimentTab({ news, loading }: { news: NewsArticle[] | null; loading: boolean }) {
  const { t } = useI18n();

  if (loading) return <LoadingSpinner label={t("loadingIntelligence")} />;
  if (!news || news.length === 0) return <EmptyState label={t("noNewsData")} />;

  return (
    <div className="space-y-3">
      {news.map((article, idx) => (
        <a
          key={idx}
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="card px-5 py-4 block transition-shadow hover:shadow-md hover:ring-1 hover:ring-emerald-500/20"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white leading-snug line-clamp-2">
                {article.title}
              </h4>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 line-clamp-2">
                {article.summary}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="text-[10px] text-gray-400 dark:text-slate-500">
                  {article.source}
                </span>
                <span className="text-gray-300 dark:text-slate-600">&middot;</span>
                <span className="text-[10px] text-gray-400 dark:text-slate-500">
                  {formatAvDate(article.publishedAt)}
                </span>
                {article.topics.length > 0 && (
                  <>
                    <span className="text-gray-300 dark:text-slate-600">&middot;</span>
                    {article.topics.slice(0, 3).map((topic, ti) => (
                      <span
                        key={ti}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400"
                      >
                        {topic}
                      </span>
                    ))}
                  </>
                )}
              </div>
            </div>
            <span
              className={`flex-shrink-0 text-[10px] font-semibold px-2 py-1 rounded-full border ${sentimentBg(article.overallSentiment)} ${sentimentColor(article.overallSentiment)}`}
            >
              {article.overallSentiment}
            </span>
          </div>

          {article.tickerSentiment.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3 pt-2.5 border-t border-gray-100 dark:border-slate-700">
              {article.tickerSentiment.map((ts, ti) => (
                <span
                  key={ti}
                  className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${sentimentBg(ts.sentimentLabel)} ${sentimentColor(ts.sentimentLabel)}`}
                >
                  {ts.ticker}: {ts.sentimentLabel} ({(ts.sentimentScore * 100).toFixed(0)}%)
                </span>
              ))}
            </div>
          )}
        </a>
      ))}
    </div>
  );
}

/* ── Insider Transactions ──────────────────────────────────────── */

function InsiderTab({ insiders, loading }: { insiders: InsiderTransaction[] | null; loading: boolean }) {
  const { t } = useI18n();

  if (loading) return <LoadingSpinner label={t("loadingIntelligence")} />;
  if (!insiders || insiders.length === 0) return <EmptyState label={t("noInsiderData")} />;

  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 dark:bg-slate-800/50">
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400">{t("name")}</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400 hidden sm:table-cell">Title</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400">{t("fiscalDate")}</th>
            <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400">Type</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400">{t("shares")}</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400">{t("value")}</th>
          </tr>
        </thead>
        <tbody>
          {insiders.map((txn, idx) => {
            const isAcq = txn.transactionType === "Acquisition";
            return (
              <tr
                key={idx}
                className={`border-t border-gray-100 dark:border-slate-700 ${idx % 2 === 0 ? "" : "bg-gray-50/50 dark:bg-slate-800/20"}`}
              >
                <td className="px-4 py-2.5 text-xs font-medium text-gray-700 dark:text-slate-300">
                  {txn.fullName}
                </td>
                <td className="px-4 py-2.5 text-xs text-gray-500 dark:text-slate-400 hidden sm:table-cell max-w-[160px] truncate">
                  {txn.title || "—"}
                </td>
                <td className="px-4 py-2.5 text-xs text-gray-500 dark:text-slate-400 tabular-nums">
                  {txn.transactionDate}
                </td>
                <td className="px-4 py-2.5 text-center">
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                      isAcq
                        ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20"
                        : "bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400 border-red-200 dark:border-red-500/20"
                    }`}
                  >
                    {isAcq ? t("acquisition") : t("disposition")}
                  </span>
                </td>
                <td className="text-right px-4 py-2.5 text-xs tabular-nums text-gray-600 dark:text-slate-300">
                  {txn.shares.toLocaleString()}
                </td>
                <td className="text-right px-4 py-2.5 text-xs tabular-nums text-gray-600 dark:text-slate-300">
                  {txn.totalValue > 0 ? `$${formatCompactNumber(txn.totalValue)}` : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ── Institutional Holdings ────────────────────────────────────── */

function InstitutionalTab({ data, loading }: { data: InstitutionalHolder[] | null; loading: boolean }) {
  const { t } = useI18n();

  if (loading) return <LoadingSpinner label={t("loadingIntelligence")} />;
  if (!data || data.length === 0) return <EmptyState label={t("noInstitutionalData")} />;

  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 dark:bg-slate-800/50">
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400">{t("investor")}</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400">{t("shares")}</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400">{t("value")}</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400">{t("weight")}</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400">{t("quarterEnd")}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((holder, idx) => (
            <tr
              key={idx}
              className={`border-t border-gray-100 dark:border-slate-700 ${idx % 2 === 0 ? "" : "bg-gray-50/50 dark:bg-slate-800/20"}`}
            >
              <td className="px-4 py-2.5 text-xs font-medium text-gray-700 dark:text-slate-300 max-w-[240px] truncate">
                {holder.investor}
              </td>
              <td className="text-right px-4 py-2.5 text-xs tabular-nums text-gray-600 dark:text-slate-300">
                {holder.shares.toLocaleString()}
              </td>
              <td className="text-right px-4 py-2.5 text-xs tabular-nums text-gray-600 dark:text-slate-300">
                ${formatCompactNumber(holder.value)}
              </td>
              <td className="text-right px-4 py-2.5 text-xs tabular-nums text-gray-600 dark:text-slate-300">
                {holder.weight > 0 ? `${holder.weight.toFixed(2)}%` : "—"}
              </td>
              <td className="text-right px-4 py-2.5 text-xs tabular-nums text-gray-500 dark:text-slate-400">
                {holder.quarterEndDate}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Earnings Transcript ───────────────────────────────────────── */

function generateQuarterOptions(): string[] {
  const opts: string[] = [];
  const now = new Date();
  let y = now.getFullYear();
  let q = Math.ceil(now.getMonth() / 3);
  for (let i = 0; i < 8; i++) {
    q--;
    if (q === 0) { q = 4; y--; }
    opts.push(`${y}Q${q}`);
  }
  return opts;
}

function TranscriptTab({
  transcript,
  loading,
  quarter,
  onQuarterChange,
}: {
  transcript: string | null;
  loading: boolean;
  quarter: string;
  onQuarterChange: (q: string) => void;
}) {
  const { t } = useI18n();
  const quarters = generateQuarterOptions();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <label className="text-xs font-medium text-gray-500 dark:text-slate-400">
          {t("selectQuarter")}
        </label>
        <select
          value={quarter}
          onChange={(e) => onQuarterChange(e.target.value)}
          className="text-sm rounded-lg px-3 py-1.5"
        >
          {quarters.map((q) => (
            <option key={q} value={q}>{q}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <LoadingSpinner label={t("loadingIntelligence")} />
      ) : transcript === null ? (
        <EmptyState label={t("noTranscriptData")} />
      ) : transcript === "" ? (
        <EmptyState label={t("noTranscriptData")} />
      ) : (
        <div className="card px-6 py-5">
          <div className="prose prose-sm dark:prose-invert max-w-none text-gray-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap text-xs">
            {transcript}
          </div>
        </div>
      )}
    </div>
  );
}
