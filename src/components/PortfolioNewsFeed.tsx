"use client";

import { useState, useEffect, useMemo } from "react";
import { useSettings } from "@/lib/settings-context";
import { usePortfolio } from "@/lib/portfolio-context";
import { useI18n } from "@/lib/i18n";
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

function NewsCard({
  article,
  highlightHoldings,
}: {
  article: NewsArticle;
  highlightHoldings: boolean;
}) {
  const { t } = useI18n();
  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`card px-5 py-4 block transition-shadow hover:shadow-md hover:ring-1 hover:ring-emerald-500/20 ${highlightHoldings ? "ring-1 ring-emerald-500/35 bg-emerald-50/40 dark:bg-emerald-500/5" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
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
        </div>
        {article.overallSentiment && (
          <span
            className={`flex-shrink-0 text-[10px] font-semibold px-2 py-1 rounded-full border ${sentimentBg(article.overallSentiment)} ${sentimentColor(article.overallSentiment)}`}
          >
            {article.overallSentiment}
          </span>
        )}
      </div>

      {article.tickerSentiment.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3 pt-2.5 border-t border-gray-100 dark:border-slate-700">
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
        </div>
      )}
    </a>
  );
}
