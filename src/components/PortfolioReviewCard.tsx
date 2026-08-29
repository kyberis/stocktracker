"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { usePortfolio } from "@/lib/portfolio-context";
import { useFeatureFlag } from "@/lib/feature-flag-context";
import { useI18n } from "@/lib/i18n";
import { FEATURE_QUOTAS } from "@/lib/platform-config";
import { isPaidPlan, planOf } from "@/lib/plan-rank";

type ReviewStatus = "idle" | "loading" | "streaming" | "done" | "error" | "limit-reached";

export default function PortfolioReviewCard() {
  const { user, refreshUser } = useAuth();
  const { holdings, activePortfolioId } = usePortfolio();
  const { t, language } = useI18n();
  const aiReportEnabled = useFeatureFlag("ai_report_enabled");

  if (!aiReportEnabled) return null;

  const [status, setStatus] = useState<ReviewStatus>("idle");
  const [text, setText] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const isAdmin = user?.role === "admin";
  const plan = isAdmin ? "pro" : planOf(user);
  const isPro = isPaidPlan(planOf(user)) || isAdmin;
  const reviewQuota = user?.quotas?.ai_portfolio_review;
  const limit = reviewQuota?.limit ?? FEATURE_QUOTAS.ai_portfolio_review[plan];
  const used = reviewQuota?.used ?? 0;
  const remaining = isAdmin ? Infinity : Math.max(0, limit - used);

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
        body: JSON.stringify({ language, portfolioId: activePortfolioId ?? undefined }),
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
        setText(accumulated.replace(/\n\[TOKENS:\d+\]$/, ""));
      }
      setStatus("done");
      refreshUser();
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setStatus("error");
    }
  }, [status, language, refreshUser]);

  const hasHoldings = holdings.length > 0;

  const autoRanRef = useRef(false);
  useEffect(() => {
    if (!autoRanRef.current && status === "idle" && hasHoldings && remaining > 0) {
      autoRanRef.current = true;
      runReview();
    }
  }, [status, hasHoldings, remaining, runReview]);

  const isRunning = status === "loading" || status === "streaming";

  return (
    <div>
      {status === "idle" && hasHoldings && remaining > 0 && (
        <button
          onClick={runReview}
          className="group w-full flex items-center gap-3 text-left py-2 px-3 -mx-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
        >
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-emerald-500 flex items-center justify-center flex-shrink-0">
            <SparkleIcon className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-medium text-gray-700 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
            {t("portfolioReviewButton")}
          </span>
          <svg className="w-4 h-4 text-gray-300 dark:text-slate-600 group-hover:text-emerald-500 transition-colors flex-shrink-0 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </button>
      )}

      {status === "limit-reached" && (
        <p className="text-xs text-amber-600 dark:text-amber-400">{t("portfolioReviewLimitReached")}</p>
      )}

      {status === "error" && (
        <p className="text-xs text-red-500 dark:text-red-400">{t("portfolioReviewError")}</p>
      )}

      {isRunning && !text && (
        <div className="flex items-center justify-center gap-2 py-4 text-sm text-gray-400 dark:text-slate-500">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-500" />
          {t("portfolioReviewRunning")}
        </div>
      )}

      {text && (
        <div>
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-emerald-500 flex items-center justify-center">
                <SparkleIcon className="w-3 h-3 text-white" />
              </div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-200">
                {t("portfolioReview")}
              </h3>
              {isRunning && (
                <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-emerald-500" />
              )}
            </div>
            <div className="flex items-center gap-3">
              {status === "done" && (
                <button
                  onClick={runReview}
                  className="text-xs text-gray-400 dark:text-slate-500 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors"
                  aria-label="Re-run review"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                  </svg>
                </button>
              )}
              <span className="text-[11px] text-gray-400 dark:text-slate-500 tabular-nums">{used}/{limit}</span>
            </div>
          </div>

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

/* ── Section parsing & visual rendering ─────────────────── */

type Section = { title: string; content: string };

function parseSections(text: string): Section[] {
  const parts = text.split(/^## /m);
  const sections: Section[] = [];
  for (let i = 1; i < parts.length; i++) {
    const nl = parts[i].indexOf("\n");
    if (nl === -1) {
      sections.push({ title: parts[i].trim(), content: "" });
    } else {
      sections.push({ title: parts[i].slice(0, nl).trim(), content: parts[i].slice(nl + 1) });
    }
  }
  return sections;
}

const RATING_KEYWORDS: Record<string, string> = {
  excellent: "emerald", excelente: "emerald",
  good: "emerald", bueno: "emerald", buena: "emerald",
  fair: "amber", regular: "amber", aceptable: "amber",
  "needs attention": "orange", "necesita atención": "orange",
  risky: "red", riesgoso: "red", arriesgado: "red",
};

const RATING_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  emerald: { bg: "bg-emerald-50 dark:bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-300", dot: "bg-emerald-500" },
  amber:   { bg: "bg-amber-50 dark:bg-amber-500/10",     text: "text-amber-700 dark:text-amber-300",     dot: "bg-amber-500" },
  orange:  { bg: "bg-orange-50 dark:bg-orange-500/10",    text: "text-orange-700 dark:text-orange-300",    dot: "bg-orange-500" },
  red:     { bg: "bg-red-50 dark:bg-red-500/10",          text: "text-red-700 dark:text-red-300",          dot: "bg-red-500" },
};

function detectRatingColor(content: string): string {
  const lower = content.toLowerCase();
  for (const [kw, color] of Object.entries(RATING_KEYWORDS)) {
    if (lower.includes(kw)) return color;
  }
  return "emerald";
}

type SectionConfig = { border: string; iconBg: string; bulletColor: string; icon: React.ReactNode };

const SECTION_MAP: { keywords: string[]; config: SectionConfig }[] = [
  {
    keywords: ["diversif", "diversif"],
    config: {
      border: "border-l-blue-400 dark:border-l-blue-500",
      iconBg: "bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400",
      bulletColor: "before:text-blue-500",
      icon: <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5a17.92 17.92 0 01-8.716-2.247m0 0A9 9 0 013 12c0-1.47.353-2.856.978-4.082" />,
    },
  },
  {
    keywords: ["concentr", "riesgo"],
    config: {
      border: "border-l-amber-400 dark:border-l-amber-500",
      iconBg: "bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400",
      bulletColor: "before:text-amber-500",
      icon: <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />,
    },
  },
  {
    keywords: ["balance", "equilibr"],
    config: {
      border: "border-l-violet-400 dark:border-l-violet-500",
      iconBg: "bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400",
      bulletColor: "before:text-violet-500",
      icon: <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 01-2.031.352 5.988 5.988 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 01-2.031.352 5.989 5.989 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971z" />,
    },
  },
  {
    keywords: ["strength", "fortalez", "punto"],
    config: {
      border: "border-l-emerald-400 dark:border-l-emerald-500",
      iconBg: "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400",
      bulletColor: "before:text-emerald-500",
      icon: <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
    },
  },
  {
    keywords: ["recommend", "recomend", "sugerenc"],
    config: {
      border: "border-l-sky-400 dark:border-l-sky-500",
      iconBg: "bg-sky-100 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400",
      bulletColor: "before:text-sky-500",
      icon: <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />,
    },
  },
];

const DEFAULT_CONFIG: SectionConfig = {
  border: "border-l-gray-300 dark:border-l-slate-600",
  iconBg: "bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400",
  bulletColor: "before:text-gray-400",
  icon: <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />,
};

function getSectionConfig(title: string): SectionConfig {
  const lower = title.toLowerCase();
  for (const entry of SECTION_MAP) {
    if (entry.keywords.some((kw) => lower.includes(kw))) return entry.config;
  }
  return DEFAULT_CONFIG;
}

function isStrengthsSection(title: string): boolean {
  const lower = title.toLowerCase();
  return lower.includes("strength") || lower.includes("fortalez") || lower.includes("punto");
}

function isRecommendationsSection(title: string): boolean {
  const lower = title.toLowerCase();
  return lower.includes("recommend") || lower.includes("recomend") || lower.includes("sugerenc");
}

function ReviewMarkdown({ text }: { text: string }) {
  const sections = parseSections(text);
  if (sections.length === 0) {
    return <p className="text-sm text-gray-500 dark:text-slate-400">{text}</p>;
  }

  const isHealthSection = (s: Section) => {
    const l = s.title.toLowerCase();
    return l.includes("health") || l.includes("salud") || l.includes("estado");
  };

  const healthSection = sections.find(isHealthSection);
  const otherSections = sections.filter((s) => !isHealthSection(s));

  return (
    <div className="space-y-3">
      {healthSection && <HealthRatingBadge content={healthSection.content} />}
      {otherSections.map((section, i) => (
        <ReviewSectionCard key={i} title={section.title} content={section.content} />
      ))}
    </div>
  );
}

function HealthRatingBadge({ content }: { content: string }) {
  const boldMatch = content.match(/\*\*([^*]+)\*\*/);
  const ratingLabel = boldMatch ? boldMatch[1].trim() : "";
  const color = detectRatingColor(content);
  const styles = RATING_STYLES[color] || RATING_STYLES.emerald;

  const afterBold = boldMatch
    ? content.slice(content.indexOf("**", (boldMatch.index ?? 0) + 2) + 2).trim()
    : content.trim();
  const justification = afterBold.replace(/^[—–\-]\s*/, "").trim();

  return (
    <div className={`rounded-xl px-4 py-3 ${styles.bg}`}>
      <div className="flex items-center gap-3">
        <div className={`w-3 h-3 rounded-full ${styles.dot} flex-shrink-0`} />
        <span className={`text-base font-bold ${styles.text}`}>{ratingLabel || "Review"}</span>
      </div>
      {justification && (
        <p className="text-sm text-gray-600 dark:text-slate-300 mt-1 ml-6">
          {renderInlineBold(justification)}
        </p>
      )}
    </div>
  );
}

function ReviewSectionCard({ title, content }: { title: string; content: string }) {
  const config = getSectionConfig(title);
  const lines = content.split("\n").filter((l) => l.trim() !== "");
  const strengths = isStrengthsSection(title);
  const recommendations = isRecommendationsSection(title);
  let recNumber = 0;

  return (
    <div className={`border-l-4 ${config.border} rounded-r-lg pl-4 py-2`}>
      <div className="flex items-center gap-2 mb-1.5">
        <div className={`w-6 h-6 rounded-full ${config.iconBg} flex items-center justify-center flex-shrink-0`}>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            {config.icon}
          </svg>
        </div>
        <h4 className="text-sm font-semibold text-gray-800 dark:text-slate-100">{title}</h4>
      </div>
      <div className="space-y-0.5">
        {lines.map((line, i) => {
          if (line.startsWith("**") && line.endsWith("**")) {
            return (
              <p key={i} className="text-sm font-semibold text-gray-800 dark:text-slate-100 mt-1">
                {line.slice(2, -2)}
              </p>
            );
          }
          if (line.startsWith("- ") || line.match(/^\d+\.\s/)) {
            const bulletContent = line.replace(/^[-]\s|^\d+\.\s/, "");
            if (strengths) {
              return (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <svg className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  <span className="text-gray-600 dark:text-slate-300">{renderInlineBold(bulletContent)}</span>
                </div>
              );
            }
            if (recommendations) {
              recNumber++;
              return (
                <div key={i} className="flex items-start gap-2.5 text-sm">
                  <span className="w-5 h-5 rounded-full bg-sky-100 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    {recNumber}
                  </span>
                  <span className="text-gray-600 dark:text-slate-300">{renderInlineBold(bulletContent)}</span>
                </div>
              );
            }
            return (
              <p key={i} className={`text-sm pl-3 before:content-['•'] before:mr-2 ${config.bulletColor}`}>
                {renderInlineBold(bulletContent)}
              </p>
            );
          }
          return (
            <p key={i} className="text-sm text-gray-600 dark:text-slate-300">{renderInlineBold(line)}</p>
          );
        })}
      </div>
    </div>
  );
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

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
  );
}
