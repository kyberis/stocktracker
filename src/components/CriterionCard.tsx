"use client";

import { useState } from "react";
import type { CriterionResult } from "@/lib/types";

interface CriterionCardProps {
  criterion: CriterionResult;
}

const STATUS_STYLES = {
  pass: { bg: "bg-emerald-500/15", text: "text-emerald-500", label: "Pass" },
  warning: { bg: "bg-amber-500/15", text: "text-amber-500", label: "Warning" },
  fail: { bg: "bg-red-500/15", text: "text-red-500", label: "Fail" },
} as const;

const CRITERION_EXPLANATIONS: Record<string, string> = {
  earnings_consistency: "Buffett looks for net earnings growing steadily over at least 10 years with no erratic swings — a sign that the business has a predictable, durable engine.",
  gross_margin: "A gross margin of 40%+ indicates high scalability where profitability increases with sales volume. It's a primary filter for business quality.",
  net_margin: "A net margin of 20%+ reveals a smoothly run business with a significant structural advantage over competitors.",
  retained_earnings: "Rising retained earnings can show a profitable business that reinvests. Under large buybacks, retained earnings fall as a bookkeeping entry — we then check whether free cash flow funded the repurchases, not whether the equity account grew.",
  return_on_invested_capital: "ROIC (NOPAT / invested capital) measures the return on the capital the business actually uses. ROE is not a substitute: buybacks shrink equity and can push ROE above 100% without any improvement in the engine.",
  return_on_equity: "Legacy key: the moat engine now scores return on invested capital. High ROE after buybacks is often an accounting artifact.",
  debt_sustainability: "A truly durable business can expand using internal cash flow, not debt. Long-term debt should be repayable in less than 4 years of current net earnings.",
  capex_efficiency: "Low CapEx relative to earnings (<25% = Very Good, <50% = Acceptable) means the company doesn't need to spend heavily just to maintain its competitive position.",
  product_durability: "The ideal business sells essentially the same product for decades. Low R&D spending signals a product that doesn't need constant reinvention — the foundation of a lasting moat.",
};

export default function CriterionCard({ criterion }: CriterionCardProps) {
  const [showInfo, setShowInfo] = useState(false);
  const style = STATUS_STYLES[criterion.status];
  const valueColor =
    criterion.status === "pass" ? "text-emerald-500" :
    criterion.status === "warning" ? "text-amber-500" :
    "text-red-500";

  const maxTrend = criterion.trend.length > 0 ? Math.max(...criterion.trend.map(Math.abs), 0.01) : 1;
  const explanation = CRITERION_EXPLANATIONS[criterion.key] || "";

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-[10px] p-3.5 sm:p-4 flex flex-col gap-1.5 hover:border-[var(--accent)] transition-colors relative">
      <div className="flex justify-between items-center">
        <span className="text-[13px] font-semibold text-[var(--foreground)] flex items-center gap-1.5">
          {criterion.name}
          <button
            onClick={() => setShowInfo(!showInfo)}
            className="text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
            aria-label={`Info about ${criterion.name}`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
          </button>
        </span>
        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${style.bg} ${style.text}`}>
          {style.label}
        </span>
      </div>

      {showInfo && explanation && (
        <div className="text-[11px] leading-relaxed text-[var(--muted)] bg-[var(--card-hover)] rounded-lg p-2.5 -mx-0.5">
          {explanation}
        </div>
      )}

      <div className={`text-xl sm:text-[22px] font-bold ${valueColor}`}>
        {criterion.value}
      </div>

      <div className="text-[11px] text-[var(--muted)]">
        Benchmark: {criterion.benchmark}
      </div>

      {criterion.trend.length > 0 && (
        <div className="h-7 flex items-end gap-0.5 mt-1">
          {criterion.trend.map((v, i) => {
            const absV = Math.abs(v);
            const height = maxTrend > 0 ? Math.max((absV / maxTrend) * 100, 4) : 4;
            const barColor =
              criterion.status === "fail" ? "bg-red-500" :
              criterion.status === "warning" && i >= criterion.trend.length * 0.6 ? "bg-red-500" :
              criterion.status === "warning" ? "bg-amber-500" :
              "bg-emerald-500";
            return (
              <div
                key={i}
                className={`flex-1 rounded-t-sm ${barColor}`}
                style={{ height: `${height}%`, minWidth: 4 }}
              />
            );
          })}
        </div>
      )}

      <div className="text-[10px] text-[var(--muted)] text-right">
        {criterion.score.toFixed(1)} / {criterion.maxScore} pts
      </div>
    </div>
  );
}
