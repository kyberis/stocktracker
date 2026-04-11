"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";

interface Insight {
  id: string;
  title: string;
  summary: string;
  keyPoints: string[];
  mentionedTickers: string[];
  portfolioTickers: string[];
  sectors: string[];
  sentiment: string;
  publishedAt: string;
  receivedAt: string;
}

const SENTIMENT_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  bullish: { label: "Bullish", color: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-900/30" },
  bearish: { label: "Bearish", color: "text-red-700 dark:text-red-400", bg: "bg-red-100 dark:bg-red-900/30" },
  neutral: { label: "Neutral", color: "text-gray-600 dark:text-gray-400", bg: "bg-gray-100 dark:bg-gray-800" },
};

export default function DailyDigestsView() {
  const { t } = useI18n();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/market-insights", { cache: "no-store" });
      const data = await res.json();
      setInsights(data.insights || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          {t("dailyDigestsTitle")}
        </h1>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-gray-200 dark:bg-slate-800 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t("dailyDigestsTitle")}
        </h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
          {t("dailyDigestsSubtitle")}
        </p>
      </div>

      {insights.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3" aria-hidden="true">
            <svg className="w-12 h-12 mx-auto text-gray-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" />
            </svg>
          </div>
          <p className="text-gray-500 dark:text-slate-400 text-sm">{t("dailyDigestsEmpty")}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {insights.map((insight) => {
            const sentimentCfg = SENTIMENT_CONFIG[insight.sentiment] || SENTIMENT_CONFIG.neutral;
            const isExpanded = expandedId === insight.id;

            return (
              <article
                key={insight.id}
                className="border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900/50 overflow-hidden transition-shadow hover:shadow-md"
              >
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : insight.id)}
                  className="w-full px-5 py-4 text-left"
                  aria-expanded={isExpanded}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className={`px-2 py-0.5 text-[11px] font-semibold rounded-full ${sentimentCfg.bg} ${sentimentCfg.color}`}>
                          {sentimentCfg.label}
                        </span>
                        {insight.sectors.slice(0, 3).map((s) => (
                          <span key={s} className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400">
                            {s}
                          </span>
                        ))}
                        <span className="text-xs text-gray-400 dark:text-slate-500 ml-auto shrink-0">
                          {new Date(insight.publishedAt || insight.receivedAt).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white leading-snug">
                        {insight.title}
                      </h2>
                      {!isExpanded && (
                        <p className="text-sm text-gray-600 dark:text-slate-400 mt-1 line-clamp-2">
                          {insight.summary.split("\n")[0]}
                        </p>
                      )}
                    </div>
                    <svg
                      className={`w-5 h-5 text-gray-400 transition-transform mt-1 shrink-0 ${isExpanded ? "rotate-180" : ""}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                      aria-hidden
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-gray-100 dark:border-slate-800 pt-4">
                    <div className="text-sm text-gray-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed mb-4">
                      {insight.summary}
                    </div>

                    {insight.keyPoints.length > 0 && (
                      <div className="mb-4">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-2">
                          {t("dailyDigestsKeyTakeaways")}
                        </h3>
                        <ul className="space-y-1.5">
                          {insight.keyPoints.map((point, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-slate-300">
                              <span className="mt-1 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                              {point}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {insight.mentionedTickers.length > 0 && (
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-2">
                          {t("dailyDigestsMentionedTickers")}
                        </h3>
                        <div className="flex flex-wrap gap-1.5">
                          {insight.mentionedTickers.map((ticker) => {
                            const inPortfolio = insight.portfolioTickers.includes(ticker);
                            return (
                              <Link
                                key={ticker}
                                href={`/stock/${ticker}`}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-mono font-medium rounded-lg transition-colors ${
                                  inPortfolio
                                    ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-300 dark:ring-emerald-700"
                                    : "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700"
                                }`}
                              >
                                {ticker}
                                {inPortfolio && (
                                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      <div className="mt-8 px-4 py-3 rounded-lg bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-800">
        <p className="text-xs text-gray-500 dark:text-slate-500 leading-relaxed">
          {t("dailyDigestsDisclaimer")}
        </p>
      </div>
    </div>
  );
}
