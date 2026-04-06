"use client";

import { useEffect, useState } from "react";

interface MoatScoreGaugeProps {
  score: number;
  maxScore: number;
  verdict: string;
  passedCount: number;
  criteriaCount: number;
}

export default function MoatScoreGauge({ score, maxScore, verdict, passedCount, criteriaCount }: MoatScoreGaugeProps) {
  const [animated, setAnimated] = useState(0);
  const pct = maxScore > 0 ? (score / maxScore) * 100 : 0;

  useEffect(() => {
    const target = Math.round(pct);
    let current = 0;
    const step = () => {
      current = Math.min(current + 1, target);
      setAnimated(current);
      if (current < target) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [pct]);

  const color = pct >= 70 ? "var(--gain)" : pct >= 40 ? "#f59e0b" : "var(--loss)";
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const arcLength = circumference * 0.75;
  const dashOffset = arcLength - (arcLength * animated) / 100;

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 flex flex-col items-center text-center">
      <div className="text-[11px] uppercase tracking-wider text-[var(--muted)] mb-2 font-semibold">
        Moat Score
      </div>
      <div className="relative w-40 h-40 mb-3">
        <svg viewBox="0 0 160 160" className="w-full h-full">
          <circle
            cx="80" cy="80" r={radius}
            fill="none" stroke="var(--border)" strokeWidth="10"
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeLinecap="round"
            transform="rotate(135 80 80)"
          />
          <circle
            cx="80" cy="80" r={radius}
            fill="none" stroke={color} strokeWidth="10"
            strokeDasharray={`${arcLength - dashOffset} ${circumference}`}
            strokeLinecap="round"
            transform="rotate(135 80 80)"
            style={{ transition: "stroke-dasharray 0.3s ease-out" }}
          />
        </svg>
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[42px] font-bold"
          style={{ color, fontFamily: "var(--font-geist-sans, inherit)" }}
        >
          {animated}
        </div>
      </div>
      <div className="text-sm font-semibold" style={{ color }}>
        {verdict}
      </div>
      <div className="text-[11px] text-[var(--muted)] mt-1">
        {passedCount} of {criteriaCount} criteria passed
      </div>
    </div>
  );
}
