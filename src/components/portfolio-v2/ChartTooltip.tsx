"use client";

import { formatCurrency, formatPercent } from "@/lib/utils";
import { getActiveMarketsAt } from "@/lib/market-hours";
import type { Holding } from "@/lib/types";
import type { BenchmarkOverlayEntry } from "./PortfolioValueChart";

interface Props {
  active?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any[];
  mode: "value" | "performance";
  baseCurrency: string;
  stealthMode: boolean;
  benchmarkEntries?: BenchmarkOverlayEntry[];
  holdings?: Holding[];
  range: string;
}

function formatDateLabel(dateStr: string): string {
  const hasTime = dateStr.includes(" ") || dateStr.includes("T");
  if (hasTime) {
    const d = new Date(dateStr.replace(" ", "T"));
    return d.toLocaleString("en-GB", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" });
  }
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function MarketSessionSection({ holdings, dateStr }: { holdings: Holding[]; dateStr: string }) {
  const d = new Date(dateStr.replace(" ", "T"));
  if (!Number.isFinite(d.getTime())) return null;
  const markets = getActiveMarketsAt(holdings, d);
  const open = markets.filter((m) => m.isOpen);
  if (open.length === 0) return null;
  return (
    <div className="border-t border-gray-100 dark:border-slate-700 mt-1.5 pt-1.5">
      {open.map((m) => (
        <div key={m.name} className="flex items-center gap-1.5 text-[10px] text-gray-400 dark:text-slate-500">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
          {m.name}
          {m.closesIn && <span className="ml-auto">{m.closesIn}</span>}
        </div>
      ))}
    </div>
  );
}

export default function ChartTooltip({
  active,
  payload,
  mode,
  baseCurrency,
  stealthMode,
  benchmarkEntries,
  holdings,
  range,
}: Props) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  if (!point || (point.value == null && point.pct == null)) return null;

  const benchmarkRows = benchmarkEntries?.map((b) => {
    const val = point[`bench_${b.key}`];
    if (val == null || typeof val !== "number") return null;
    const isPos = val >= 0;
    return (
      <div key={b.key} className="flex items-center gap-1.5 mt-0.5">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: b.color }} />
        <span className="text-[10px] text-gray-500 dark:text-slate-400 truncate">{b.label}</span>
        <span
          className={`text-[11px] font-semibold tabular-nums ml-auto ${
            isPos ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"
          }`}
        >
          {isPos ? "+" : ""}
          {val.toFixed(1)}%
        </span>
      </div>
    );
  }).filter(Boolean);

  if (mode === "performance") {
    const pct = point.pct as number;
    const isPos = pct >= 0;
    return (
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 shadow-lg max-w-[200px]">
        <p className="text-xs text-gray-400 dark:text-slate-500">{formatDateLabel(point.date)}</p>
        <div className="flex items-center gap-1.5 mt-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
          <span className="text-[10px] text-gray-500 dark:text-slate-400">Portfolio</span>
          <span
            className={`text-[11px] font-semibold tabular-nums ml-auto ${
              isPos ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"
            }`}
          >
            {isPos ? "+" : ""}
            {formatPercent(pct)}
          </span>
        </div>
        {benchmarkRows}
        {range === "1d" && holdings && <MarketSessionSection holdings={holdings} dateStr={point.date} />}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 shadow-lg max-w-[200px]">
      <p className="text-xs text-gray-400 dark:text-slate-500">{formatDateLabel(point.date)}</p>
      <div className="flex items-center gap-1.5 mt-1">
        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
        <span className="text-[10px] text-gray-500 dark:text-slate-400">Value</span>
        <span className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums ml-auto">
          {stealthMode ? "•••••" : formatCurrency(point.value, baseCurrency)}
        </span>
      </div>
      {benchmarkRows}
      {range === "1d" && holdings && <MarketSessionSection holdings={holdings} dateStr={point.date} />}
    </div>
  );
}
