"use client";

import { useMemo, useState, useRef, useEffect, memo } from "react";
import { createPortal } from "react-dom";
import { usePortfolio } from "@/lib/portfolio-context";
import { useAuth } from "@/lib/auth-context";
import {
  calculateHealthScore,
  getScoreLabel,
  getScoreColor,
  AXIS_LABELS,
  type HealthScore,
} from "@/lib/health-score";
import type { Holding } from "@/lib/types";
import { isPaidPlan, planOf } from "@/lib/plan-rank";

interface Props {
  holding: Holding;
  size?: number;
}

const AXIS_KEYS = ["valuation", "dividend", "momentum", "stability", "quality"] as const;
const TOOLTIP_W = 208;
const TOOLTIP_GAP = 8;

function RadialBadge({ score, size }: { score: HealthScore; size: number }) {
  const r = (size - 4) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const pct = score.overall / 10;
  const dash = pct * circumference;
  const color = getScoreColor(score.overall);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border)" strokeWidth="2.5" opacity="0.4" />
      <circle
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeDasharray={`${dash} ${circumference - dash}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: "stroke-dasharray 0.4s ease" }}
      />
      <text
        x={cx} y={cy}
        textAnchor="middle"
        dominantBaseline="central"
        fill={color}
        fontSize={size * 0.34}
        fontWeight="700"
        fontFamily="var(--font-mono, monospace)"
      >
        {score.overall.toFixed(1)}
      </text>
    </svg>
  );
}

function AxisTooltipContent({ score }: { score: HealthScore }) {
  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-700 dark:text-slate-200">
          Health Score
        </span>
        <span className="text-xs font-bold tabular-nums" style={{ color: getScoreColor(score.overall) }}>
          {score.overall.toFixed(1)} · {getScoreLabel(score.overall)}
        </span>
      </div>
      <div className="space-y-1.5">
        {AXIS_KEYS.map((key) => {
          const axis = score.axes[key];
          if (!axis) return null;
          const pct = (axis.value / 10) * 100;
          return (
            <div key={key}>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-gray-500 dark:text-slate-400">{AXIS_LABELS[key]}</span>
                <span className="font-medium tabular-nums text-gray-700 dark:text-slate-200">{axis.value.toFixed(1)}</span>
              </div>
              <div className="h-1 rounded-full bg-gray-100 dark:bg-slate-700 overflow-hidden mt-0.5">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: getScoreColor(axis.value), transition: "width 0.3s ease" }} />
              </div>
            </div>
          );
        })}
      </div>
      {score.tier === "basic" && (
        <p className="text-[9px] text-gray-400 dark:text-slate-500 mt-2">
          Basic score — open detail for full analysis
        </p>
      )}
    </>
  );
}

function PortalTooltip({ score, anchorRef }: { score: HealthScore; anchorRef: React.RefObject<HTMLDivElement> }) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    const el = anchorRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const spaceAbove = rect.top;
    const tooltipH = 180; // approximate rendered height

    let top: number;
    if (spaceAbove > tooltipH + TOOLTIP_GAP) {
      top = rect.top - tooltipH - TOOLTIP_GAP + window.scrollY;
    } else {
      top = rect.bottom + TOOLTIP_GAP + window.scrollY;
    }

    let left = rect.left + rect.width / 2 - TOOLTIP_W / 2 + window.scrollX;
    left = Math.max(8, Math.min(left, window.innerWidth - TOOLTIP_W - 8));

    setPos({ top, left });
  }, [anchorRef]);

  if (!pos) return null;

  return createPortal(
    <div
      className="fixed z-[9999] w-52 rounded-xl bg-white dark:bg-slate-800 shadow-xl ring-1 ring-gray-200 dark:ring-slate-700 p-3 pointer-events-none"
      style={{ top: pos.top - window.scrollY, left: pos.left - window.scrollX }}
    >
      <AxisTooltipContent score={score} />
    </div>,
    document.body,
  );
}

function HoldingHealthBadge({ holding, size = 32 }: Props) {
  const { quotes } = usePortfolio();
  const { user } = useAuth();
  const isPro = isPaidPlan(planOf(user));
  const [hovering, setHovering] = useState(false);
  const badgeRef = useRef<HTMLDivElement>(null!);

  const quote = quotes[holding.ticker];

  const score = useMemo(
    () => calculateHealthScore(holding, quote, null),
    [holding, quote],
  );

  if (!score) return null;

  return (
    <div
      ref={badgeRef}
      className="relative inline-flex shrink-0"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <RadialBadge score={score} size={size} />
      {hovering && <PortalTooltip score={score} anchorRef={badgeRef} />}
    </div>
  );
}

export default memo(HoldingHealthBadge);
