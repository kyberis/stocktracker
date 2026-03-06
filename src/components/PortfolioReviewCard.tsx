"use client";

import { useState, useCallback, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { usePortfolio } from "@/lib/portfolio-context";
import { useI18n } from "@/lib/i18n";
import { PLATFORM_LIMITS } from "@/lib/platform-config";

type ReviewStatus = "idle" | "loading" | "streaming" | "done" | "error" | "limit-reached";

export default function PortfolioReviewCard() {
  const { user, refreshUser } = useAuth();
  const { holdings } = usePortfolio();
  const { t, language } = useI18n();

  const [status, setStatus] = useState<ReviewStatus>("idle");
  const [text, setText] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const isPro = user?.plan === "pro";
  const limit = PLATFORM_LIMITS.PORTFOLIO_REVIEW_MONTHLY_LIMIT;
  const used = user?.portfolioReviewCount ?? 0;
  const remaining = Math.max(0, limit - used);

  const runReview = useCallback(async () => {
    if (status === "loading" || status === "streaming") return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setText("");
    setStatus("loading");

    try {
      const res = await fetch("/api/portfolio-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language }),
        signal: controller.signal,
      });

      if (res.status === 429) {
        setStatus("limit-reached");
        return;
      }
      if (res.status === 403) {
        setStatus("idle");
        return;
      }
      if (!res.ok) {
        setStatus("error");
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setStatus("error");
        return;
      }

      setStatus("streaming");
      const decoder = new TextDecoder();
      let accumulated = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setText(accumulated);
      }
      setStatus("done");
      refreshUser();
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setStatus("error");
    }
  }, [status, language, refreshUser]);

  if (!isPro) {
    return (
      <div className="card px-5 py-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t("portfolioReview")}</h3>
            <p className="text-xs text-gray-500 dark:text-slate-400">{t("portfolioReviewDescription")}</p>
          </div>
        </div>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-slate-700">
          <span className="text-xs text-gray-500 dark:text-slate-400">{t("portfolioReviewProOnly")}</span>
          <a
            href="/billing"
            className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            {t("upgradeToPro")}
          </a>
        </div>
      </div>
    );
  }

  const hasHoldings = holdings.length > 0;
  const isRunning = status === "loading" || status === "streaming";

  return (
    <div className="card px-5 py-4">
      <div className="flex items-center justify-between gap-3 mb-1">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t("portfolioReview")}</h3>
            <p className="text-xs text-gray-500 dark:text-slate-400">{t("portfolioReviewDescription")}</p>
          </div>
        </div>
        <span className="text-xs text-gray-400 dark:text-slate-500 whitespace-nowrap">
          {t("portfolioReviewUsage").replace("{used}", String(used)).replace("{limit}", String(limit))}
        </span>
      </div>

      {!hasHoldings && status === "idle" && (
        <p className="text-xs text-gray-400 dark:text-slate-500 mt-2">{t("portfolioReviewEmpty")}</p>
      )}

      {status === "limit-reached" && (
        <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">{t("portfolioReviewLimitReached")}</p>
      )}

      {status === "error" && (
        <p className="text-xs text-red-500 dark:text-red-400 mt-2">{t("portfolioReviewError")}</p>
      )}

      {(status === "idle" || status === "error" || status === "done" || status === "limit-reached") && hasHoldings && remaining > 0 && (
        <button
          onClick={runReview}
          className="mt-3 w-full btn-primary text-sm py-2 flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          {t("portfolioReviewButton")}
        </button>
      )}

      {isRunning && !text && (
        <div className="mt-3 flex items-center justify-center gap-2 py-4 text-sm text-gray-400 dark:text-slate-500">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-500" />
          {t("portfolioReviewRunning")}
        </div>
      )}

      {text && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-700">
          <div className="prose prose-sm dark:prose-invert max-w-none text-gray-600 dark:text-slate-300 leading-relaxed ai-markdown">
            <ReviewMarkdown text={text} />
          </div>

          {(status === "done" || text.length > 100) && (
            <p className="text-[10px] text-gray-400 dark:text-slate-600 italic pt-2 mt-2 border-t border-gray-100 dark:border-slate-700">
              {t("portfolioReviewDisclaimer")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function ReviewMarkdown({ text }: { text: string }) {
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
        <p key={i} className="text-sm pl-3 before:content-['•'] before:mr-2 before:text-purple-500">
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
