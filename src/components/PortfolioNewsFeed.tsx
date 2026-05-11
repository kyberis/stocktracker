"use client";

import { useState, useEffect, useMemo, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useSettings } from "@/lib/settings-context";
import { usePortfolio } from "@/lib/portfolio-context";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import EmptyState from "@/components/EmptyState";
import type { NewsArticle } from "@/lib/types";
import demoArticles from "../../data/demo-portfolio-news.json";

type FeedStatus = "idle" | "loading" | "done" | "error" | "quota";

function holdingTickerSet(holdings: { ticker: string }[]): Set<string> {
  const ISIN_RE = /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/;
  const out = new Set<string>();
  for (const h of holdings) {
    const t = h.ticker.includes(".") ? h.ticker.split(".")[0]! : h.ticker;
    if (t.length > 0 && t.length <= 10 && !ISIN_RE.test(t)) {
      out.add(t.toUpperCase());
    }
  }
  return out;
}

function articleTouchesHoldings(article: NewsArticle, syms: Set<string>): boolean {
  return article.tickerSentiment.some((ts) => syms.has(ts.ticker.toUpperCase()));
}

interface Props {
  variant?: "full" | "compact";
  maxItems?: number;
  onViewAll?: () => void;
}

export default function PortfolioNewsFeed({ variant = "full", maxItems, onViewAll }: Props) {
  const { getApiHeaders } = useSettings();
  const { holdings, activePortfolioId, demoMode } = usePortfolio();
  const { t } = useI18n();

  const [articles, setArticles] = useState<NewsArticle[] | null>(null);
  const [status, setStatus] = useState<FeedStatus>("idle");
  const holdingSyms = useMemo(() => holdingTickerSet(holdings), [holdings]);
  /** Bumps when holdings tickers change so we refetch (empty `[]` from a prior fetch used to block forever). */
  const holdingsTickerSignature = useMemo(
    () => holdings.map((h) => h.ticker.trim().toUpperCase()).sort().join(","),
    [holdings],
  );
  const isCompact = variant === "compact";

  useEffect(() => {
    if (demoMode) {
      setArticles([...(demoArticles as NewsArticle[])]);
      setStatus("done");
      return;
    }
    if (holdings.length === 0) {
      setArticles(null);
      setStatus("idle");
      return;
    }

    const ac = new AbortController();
    setStatus("loading");
    const headers = getApiHeaders();
    const qp = activePortfolioId ? `?portfolioId=${encodeURIComponent(activePortfolioId)}` : "";
    fetch(`/api/portfolio-news${qp}`, { headers, signal: ac.signal })
      .then(async (res) => {
        if (res.status === 429) {
          const body = (await res.json().catch(() => null)) as
            | { paywall?: boolean; reason?: string }
            | null;
          if (body?.paywall && body?.reason === "quota_exceeded") {
            return { kind: "quota" as const };
          }
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: unknown = await res.json();
        return { kind: "ok" as const, data };
      })
      .then((r) => {
        if (ac.signal.aborted) return;
        if (r && typeof r === "object" && "kind" in r && (r as { kind: string }).kind === "quota") {
          setArticles([]);
          setStatus("quota");
          return;
        }
        if (r && typeof r === "object" && "kind" in r && (r as { kind: string }).kind === "ok") {
          const data = (r as { data: unknown }).data;
          setArticles(Array.isArray(data) ? (data as NewsArticle[]) : []);
          setStatus("done");
        }
      })
      .catch(() => {
        if (ac.signal.aborted) return;
        setArticles([]);
        setStatus("error");
      });

    return () => ac.abort();
  }, [demoMode, holdings.length, getApiHeaders, activePortfolioId, holdingsTickerSignature]);

  const displayArticles = useMemo(() => {
    if (!articles) return [];
    if (maxItems != null) return articles.slice(0, maxItems);
    return articles;
  }, [articles, maxItems]);

  if (holdings.length === 0) {
    return (
      <div className="space-y-4">
        <SectionHeader variant={variant} onViewAll={onViewAll} />
        <EmptyState
          icon={<svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5" /></svg>}
          iconClassName="from-cyan-400 to-cyan-600 shadow-cyan-500/20"
          title={t("portfolioNewsNoHoldingsTitle")}
          subtitle={t("portfolioNewsNoHoldings")}
          actions={[{
            label: t("emptyStateAddStock"),
            href: "/tools",
            variant: "primary",
            icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>,
          }]}
        />
      </div>
    );
  }

  if (status === "quota") {
    return (
      <div className="space-y-4">
        <SectionHeader variant={variant} onViewAll={onViewAll} />
        <EmptyState
          icon={<svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.008v.008H12v-.008z" /></svg>}
          iconClassName="from-amber-400 to-amber-600 shadow-amber-500/20"
          title={t("portfolioNewsQuotaExceeded")}
        />
      </div>
    );
  }

  if (status === "loading" || status === "idle") {
    return (
      <div className={`space-y-4 ${isCompact ? "" : ""}`}>
        <SectionHeader variant={variant} onViewAll={onViewAll} />
        <div className="card px-6 py-10 flex items-center justify-center gap-3 text-gray-400 dark:text-slate-500 text-sm">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-500" />
          {t("loadingPortfolioNews")}
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="space-y-4">
        <SectionHeader variant={variant} onViewAll={onViewAll} />
        <EmptyState
          icon={<svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5" /></svg>}
          iconClassName="from-cyan-400 to-cyan-600 shadow-cyan-500/20"
          title={t("portfolioNewsError")}
        />
      </div>
    );
  }

  if (!articles || articles.length === 0) {
    return (
      <div className="space-y-4">
        <SectionHeader variant={variant} onViewAll={onViewAll} />
        <EmptyState
          icon={<svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5" /></svg>}
          iconClassName="from-cyan-400 to-cyan-600 shadow-cyan-500/20"
          title={t("noPortfolioNewsTitle")}
          subtitle={t("noPortfolioNews")}
        />
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${isCompact ? "" : ""}`}>
      <SectionHeader variant={variant} onViewAll={onViewAll} />
      <div className="space-y-3">
        {displayArticles.map((article, idx) => (
          <NewsCard
            key={`${article.url}-${idx}`}
            article={article}
            highlightHoldings={articleTouchesHoldings(article, holdingSyms)}
          />
        ))}
      </div>
      {!isCompact && (
        <p className="text-[10px] text-gray-400 dark:text-slate-600 italic text-center pt-2">
          {t("portfolioNewsDisclaimer")}
        </p>
      )}
    </div>
  );
}

function SectionHeader({
  variant,
  onViewAll,
}: {
  variant: "full" | "compact";
  onViewAll?: () => void;
}) {
  const { t } = useI18n();
  const compact = variant === "compact";
  return (
    <div className={`flex items-center gap-2 ${compact ? "justify-between flex-wrap" : ""}`}>
      <div className="flex items-center gap-2 min-w-0">
        <svg className={`${compact ? "w-4 h-4" : "w-5 h-5"} text-emerald-500 shrink-0`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
        </svg>
        <h2 className={`${compact ? "text-sm" : "text-lg"} font-semibold text-gray-900 dark:text-white truncate`}>
          {t("portfolioNews")}
        </h2>
      </div>
      {compact && onViewAll && (
        <button
          type="button"
          onClick={onViewAll}
          className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline shrink-0"
        >
          {t("portfolioNewsViewAll")}
        </button>
      )}
    </div>
  );
}

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

function formatNewsDate(raw: string): string {
  if (!raw) return raw;
  if (raw.includes("T") || raw.includes("-")) {
    const d = new Date(raw);
    if (!isNaN(d.getTime())) {
      const pad = (n: number) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }
  }
  if (raw.length < 8) return raw;
  const year = raw.slice(0, 4);
  const month = raw.slice(4, 6);
  const day = raw.slice(6, 8);
  const hour = raw.length >= 13 ? raw.slice(9, 11) : "";
  const min = raw.length >= 13 ? raw.slice(11, 13) : "";
  const dateStr = `${year}-${month}-${day}`;
  if (hour && min) return `${dateStr} ${hour}:${min}`;
  return dateStr;
}

function NewsArticleSummaryModal({
  open,
  title,
  loading,
  error,
  summaryText,
  onClose,
}: {
  open: boolean;
  title: string;
  loading: boolean;
  error: string | null;
  summaryText: string | null;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const focusTrapRef = useFocusTrap(open, onClose);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4"
      role="presentation"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        ref={focusTrapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="news-ai-summary-title"
        className="relative w-full max-w-lg max-h-[85vh] rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-800 shrink-0">
          <h2 id="news-ai-summary-title" className="text-base font-semibold text-gray-900 dark:text-white pr-2">
            {t("newsAiSummaryModalTitle")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors shrink-0"
            aria-label={t("closeGuide")}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p className="px-5 pt-3 text-xs text-gray-500 dark:text-slate-400 line-clamp-2">{title}</p>
        <div className="overflow-y-auto px-5 py-4 flex-1 min-h-[120px]">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-500" />
              {t("newsAiSummaryLoading")}
            </div>
          )}
          {!loading && error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
          {!loading && !error && summaryText && (
            <div className="text-sm text-gray-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
              {summaryText}
            </div>
          )}
        </div>
        <p className="px-5 pb-4 text-[10px] text-gray-400 dark:text-slate-500 border-t border-gray-100 dark:border-slate-800 pt-3">
          {t("newsAiSummaryDisclaimer")}
        </p>
      </div>
    </div>,
    document.body,
  );
}

function NewsCard({
  article,
  highlightHoldings,
}: {
  article: NewsArticle;
  highlightHoldings: boolean;
}) {
  const { t, language } = useI18n();
  const { getApiHeaders } = useSettings();
  const { user } = useAuth();
  const isPro = user?.plan === "pro" || user?.role === "admin";

  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryText, setSummaryText] = useState<string | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const runSummarize = async () => {
    setSummaryOpen(true);
    setSummaryLoading(true);
    setSummaryError(null);
    setSummaryText(null);
    try {
      const headers = {
        ...getApiHeaders(),
        "Content-Type": "application/json",
      };
      const res = await fetch("/api/news-article-summary", {
        method: "POST",
        headers,
        body: JSON.stringify({
          title: article.title,
          summary: article.summary,
          source: article.source,
          url: article.url,
          publishedAt: article.publishedAt,
          language,
        }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string; summary?: string; paywall?: boolean } | null;
      if (res.status === 429) {
        setSummaryError(data?.paywall ? t("newsAiSummaryQuotaHint") : data?.error || t("newsAiSummaryError"));
        return;
      }
      if (!res.ok || !data?.summary) {
        setSummaryError(data?.error || t("newsAiSummaryError"));
        return;
      }
      setSummaryText(data.summary);
    } catch {
      setSummaryError(t("newsAiSummaryError"));
    } finally {
      setSummaryLoading(false);
    }
  };

  const onSummarizeClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    void runSummarize();
  };

  const closeSummary = () => {
    setSummaryOpen(false);
    setSummaryLoading(false);
    setSummaryError(null);
    setSummaryText(null);
  };

  const ctaClassPro =
    "inline-flex items-center justify-center gap-1 text-[10px] font-semibold px-2.5 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-500/35 text-emerald-800 dark:text-emerald-200 bg-emerald-50/90 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors";

  const ctaClassFree =
    "inline-flex items-center justify-center gap-1 text-[10px] font-semibold px-2.5 py-1.5 rounded-lg border border-amber-200/90 dark:border-amber-500/30 text-amber-900 dark:text-amber-100 bg-amber-50/90 dark:bg-amber-500/[0.12] hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors";

  return (
    <div
      className={`card px-5 py-4 transition-shadow hover:shadow-md hover:ring-1 hover:ring-emerald-500/20 ${highlightHoldings ? "ring-1 ring-emerald-500/35 bg-emerald-50/40 dark:bg-emerald-500/5" : ""}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 min-w-0 block rounded-lg -m-1 p-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
        >
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white leading-snug line-clamp-2">
              {article.title}
            </h4>
            {highlightHoldings && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-500/30">
                {t("portfolioNewsHoldingBadge")}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 line-clamp-2">
            {article.summary}
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className="text-[10px] text-gray-400 dark:text-slate-500">
              {article.source}
            </span>
            <span className="text-gray-300 dark:text-slate-600">&middot;</span>
            <span className="text-[10px] text-gray-400 dark:text-slate-500">
              {formatNewsDate(article.publishedAt)}
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
        </a>
        <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 shrink-0 sm:pt-0">
          {article.overallSentiment && (
            <span
              className={`flex-shrink-0 text-[10px] font-semibold px-2 py-1 rounded-full border ${sentimentBg(article.overallSentiment)} ${sentimentColor(article.overallSentiment)}`}
            >
              {article.overallSentiment}
            </span>
          )}
          {isPro ? (
            <button type="button" className={ctaClassPro} onClick={onSummarizeClick}>
              <svg className="w-3.5 h-3.5 shrink-0 opacity-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
              </svg>
              {t("newsAiSummarizeCta")}
            </button>
          ) : (
            <Link
              href="/billing"
              className={ctaClassFree}
              onClick={(e) => e.stopPropagation()}
              prefetch={false}
            >
              <svg className="w-3.5 h-3.5 shrink-0 opacity-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
              </svg>
              {t("newsAiSummarizeCta")}
              <span className="text-[9px] font-bold uppercase tracking-wide opacity-80">Pro</span>
            </Link>
          )}
        </div>
      </div>

      {article.tickerSentiment.length > 0 && (
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-wrap gap-1.5 mt-3 pt-2.5 border-t border-gray-100 dark:border-slate-700 hover:opacity-90"
        >
          {article.tickerSentiment.map((ts, ti) => (
            <span
              key={ti}
              className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                ts.sentimentLabel
                  ? `${sentimentBg(ts.sentimentLabel)} ${sentimentColor(ts.sentimentLabel)}`
                  : "bg-gray-50 dark:bg-slate-700 border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300"
              }`}
            >
              {ts.sentimentLabel
                ? `${ts.ticker}: ${ts.sentimentLabel} (${(ts.sentimentScore * 100).toFixed(0)}%)`
                : ts.ticker}
            </span>
          ))}
        </a>
      )}

      <NewsArticleSummaryModal
        open={summaryOpen}
        title={article.title}
        loading={summaryLoading}
        error={summaryError}
        summaryText={summaryText}
        onClose={closeSummary}
      />
    </div>
  );
}
