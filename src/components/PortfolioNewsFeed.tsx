"use client";

import { useState, useEffect } from "react";
import { useSettings } from "@/lib/settings-context";
import { usePortfolio } from "@/lib/portfolio-context";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import ProCompareCard from "@/components/ProCompareCard";
import EmptyState from "@/components/EmptyState";
import type { NewsArticle } from "@/lib/types";

type FeedStatus = "idle" | "loading" | "done" | "error";

export default function PortfolioNewsFeed() {
  const { getApiHeaders } = useSettings();
  const { holdings } = usePortfolio();
  const { user } = useAuth();
  const { t } = useI18n();

  const [articles, setArticles] = useState<NewsArticle[] | null>(null);
  const [status, setStatus] = useState<FeedStatus>("idle");

  const isFree = user?.plan !== "pro";

  useEffect(() => {
    if (isFree || holdings.length === 0) return;
    if (articles !== null || status === "loading") return;

    setStatus("loading");
    const headers = getApiHeaders();
    fetch("/api/portfolio-news", { headers })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setArticles(Array.isArray(data) ? data : []);
        setStatus("done");
      })
      .catch(() => {
        setArticles([]);
        setStatus("error");
      });
  }, [isFree, holdings.length, articles, status, getApiHeaders]);

  if (isFree) {
    return (
      <div className="space-y-4">
        <SectionHeader />
        <ProCompareCard surface="portfolio_news_locked" reason="upgrade_required" />
      </div>
    );
  }

  if (holdings.length === 0) {
    return (
      <div className="space-y-4">
        <SectionHeader />
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

  if (status === "loading" || status === "idle") {
    return (
      <div className="space-y-4">
        <SectionHeader />
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
        <SectionHeader />
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
        <SectionHeader />
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
    <div className="space-y-4">
      <SectionHeader />
      <div className="space-y-3">
        {articles.map((article, idx) => (
          <NewsCard key={idx} article={article} />
        ))}
      </div>
      <p className="text-[10px] text-gray-400 dark:text-slate-600 italic text-center pt-2">
        {t("portfolioNewsDisclaimer")}
      </p>
    </div>
  );
}

function SectionHeader() {
  const { t } = useI18n();
  return (
    <div className="flex items-center gap-2">
      <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
      </svg>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
        {t("portfolioNews")}
      </h2>
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

function NewsCard({ article }: { article: NewsArticle }) {
  return (
    <a
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
              className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${sentimentBg(ts.sentimentLabel)} ${sentimentColor(ts.sentimentLabel)}`}
            >
              {ts.ticker}: {ts.sentimentLabel} ({(ts.sentimentScore * 100).toFixed(0)}%)
            </span>
          ))}
        </div>
      )}
    </a>
  );
}
