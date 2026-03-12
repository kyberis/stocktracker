"use client";

import { useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme-context";
import type { ScreenerCacheRow } from "@/lib/db/screener";
import { formatMarketCap } from "./ScreenerResults";

interface Props {
  results: ScreenerCacheRow[];
  holdingTickers: Set<string>;
}

export default function ScreenerStats({ results, holdingTickers }: Props) {
  const { t } = useI18n();
  const { layoutTheme } = useTheme();

  const stats = useMemo(() => {
    const yields = results.filter((r) => r.dividendYield != null && r.dividendYield > 0).map((r) => r.dividendYield!);
    const pes = results.filter((r) => r.peRatio != null && r.peRatio > 0).map((r) => r.peRatio!);
    const caps = results.filter((r) => r.marketCap != null && r.marketCap > 0).map((r) => r.marketCap!).sort((a, b) => a - b);
    const inPortfolio = results.filter((r) => holdingTickers.has(r.symbol.toUpperCase())).length;

    const avgYield = yields.length > 0 ? yields.reduce((a, b) => a + b, 0) / yields.length : 0;
    const avgPe = pes.length > 0 ? pes.reduce((a, b) => a + b, 0) / pes.length : 0;
    const medianCap = caps.length > 0 ? caps[Math.floor(caps.length / 2)] : 0;

    return { avgYield, avgPe, medianCap, inPortfolio, total: results.length };
  }, [results, holdingTickers]);

  const items = [
    { label: t("screenerAvgYield"), value: `${(stats.avgYield * 100).toFixed(2)}%`, accent: true },
    { label: t("screenerAvgPE"), value: stats.avgPe.toFixed(1), accent: false },
    { label: t("screenerMedianCap"), value: formatMarketCap(stats.medianCap), accent: false },
    { label: t("screenerInPortfolio"), value: `${stats.inPortfolio} / ${stats.total}`, accent: true },
  ];

  // Terminal
  if (layoutTheme === "terminal") {
    return (
      <div className="flex gap-2 flex-wrap">
        {items.map((item) => (
          <div key={item.label} className="border border-zinc-800 px-3 py-2 flex-1 min-w-[140px]">
            <div className="text-[9px] uppercase tracking-widest text-zinc-600 font-mono mb-0.5">{item.label}</div>
            <div className={`text-lg font-bold font-mono tabular-nums ${item.accent ? "text-green-400" : "text-zinc-300"}`}>{item.value}</div>
          </div>
        ))}
      </div>
    );
  }

  // Canvas
  if (layoutTheme === "canvas") {
    return (
      <div className="flex gap-3 flex-wrap">
        {items.map((item) => (
          <div key={item.label} className="bg-white border border-slate-200 rounded-2xl px-5 py-3.5 flex-1 min-w-[160px] shadow-sm">
            <div className="text-xs text-slate-400 mb-1">{item.label}</div>
            <div className={`text-xl font-bold tabular-nums ${item.accent ? "text-green-600" : "text-slate-800"}`}>{item.value}</div>
          </div>
        ))}
      </div>
    );
  }

  // Studio
  if (layoutTheme === "studio") {
    return (
      <div className="flex gap-3 flex-wrap">
        {items.map((item) => (
          <div key={item.label} className="rounded-2xl border border-white/5 bg-white/[0.02] px-5 py-3.5 flex-1 min-w-[160px]">
            <div className="text-[11px] text-zinc-500 mb-1">{item.label}</div>
            <div className={`text-xl font-bold tabular-nums ${item.accent ? "text-green-400" : "text-zinc-200"}`} style={{ fontFamily: "var(--font-mono, monospace)" }}>{item.value}</div>
          </div>
        ))}
      </div>
    );
  }

  // Default
  return (
    <div className="flex gap-3 flex-wrap">
      {items.map((item) => (
        <div key={item.label} className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl px-5 py-3.5 flex-1 min-w-[160px] shadow-sm dark:shadow-none">
          <div className="text-xs text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-1">{item.label}</div>
          <div className={`text-xl font-bold tabular-nums ${item.accent ? "text-emerald-500" : "text-gray-900 dark:text-white"}`}>{item.value}</div>
        </div>
      ))}
    </div>
  );
}
