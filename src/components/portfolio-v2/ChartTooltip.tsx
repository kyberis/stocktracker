"use client";

import { formatCurrency, formatPercent } from "@/lib/utils";
import { getActiveMarketsAt, MARKET_SESSION_COLORS } from "@/lib/market-hours";
import type { Holding } from "@/lib/types";
import type { BenchmarkOverlayEntry, EventMarker, SpikeContributor, SpikeDetail } from "./PortfolioValueChart";

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
  spikeContributors?: SpikeContributor[];
}

function formatDateLabel(dateStr: string): string {
  const hasTime = dateStr.includes(" ") || dateStr.includes("T");
  if (hasTime) {
    const d = new Date(dateStr.replace(" ", "T"));
    return d.toLocaleString("en-GB", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" });
  }
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function EventSection({ events, stealthMode, baseCurrency }: { events: EventMarker[]; stealthMode: boolean; baseCurrency: string }) {
  if (!events.length) return null;
  return (
    <div className="border-t border-gray-100 dark:border-slate-700 mt-1.5 pt-1.5 space-y-1">
      {events.map((e, i) => (
        <div key={e.id || `${e.type}-${e.ticker}-${i}`} className="flex items-center gap-1.5">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ background: e.type === "sell" ? "#ef4444" : "#10b981" }}
          />
          <span className="text-[10px] font-semibold uppercase" style={{ color: e.type === "sell" ? "#ef4444" : "#10b981" }}>
            {e.type}
          </span>
          <span className="text-[10px] text-gray-500 dark:text-slate-400 truncate max-w-[80px]">
            {e.ticker}
          </span>
          <span className="text-[10px] text-gray-400 dark:text-slate-500 ml-auto tabular-nums whitespace-nowrap">
            {e.shares > 0 ? `${Number.isInteger(e.shares) ? e.shares : e.shares.toFixed(2)} sh` : ""}
            {e.totalAmount && !stealthMode ? ` · ${formatCurrency(e.totalAmount, e.currency || baseCurrency)}` : ""}
          </span>
        </div>
      ))}
    </div>
  );
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
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: MARKET_SESSION_COLORS[m.name] ?? "#10b981" }} />
          {m.name}
          {m.closesIn && <span className="ml-auto">{m.closesIn}</span>}
        </div>
      ))}
    </div>
  );
}

function SpikeContributorsSection({ spike, detail, contributors, baseCurrency, stealthMode }: {
  spike: number;
  detail?: SpikeDetail;
  contributors: SpikeContributor[];
  baseCurrency: string;
  stealthMode: boolean;
}) {
  const isGain = spike > 0;
  const color = isGain ? "#10b981" : "#ef4444";
  const hasTypeBreakdown = detail?.byType && detail.byType.length > 0;
  if (!hasTypeBreakdown && !contributors.length) return null;

  return (
    <div className="border-t border-gray-100 dark:border-slate-700 mt-1.5 pt-1.5">
      <p className="text-[10px] font-semibold mb-1" style={{ color }}>
        {isGain ? "▲" : "▼"} {spike > 0 ? "+" : ""}{spike.toFixed(2)}%
        {detail && !stealthMode ? ` (${detail.delta > 0 ? "+" : ""}${formatCurrency(detail.delta, baseCurrency)})` : ""}
      </p>

      {hasTypeBreakdown && (
        <div className="mb-1">
          {detail!.byType.map((t) => {
            const tPos = t.delta >= 0;
            return (
              <div key={t.type} className="flex items-center gap-1 text-[10px] leading-relaxed">
                <span className="text-gray-600 dark:text-slate-300 font-medium">{t.type}</span>
                <span className={`tabular-nums ml-auto ${tPos ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
                  {stealthMode ? "•••" : `${tPos ? "+" : ""}${formatCurrency(t.delta, baseCurrency)}`}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {contributors.length > 0 && (
        <>
          <p className="text-[9px] text-gray-400 dark:text-slate-500 mb-0.5">Likely movers</p>
          {contributors.map((c) => {
            const isPos = c.dayChangePct >= 0;
            return (
              <div key={c.ticker} className="flex items-center gap-1 text-[10px] leading-relaxed">
                <span className="text-gray-600 dark:text-slate-300 font-medium truncate max-w-[60px]">{c.ticker}</span>
                <span className={`tabular-nums ${isPos ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
                  {isPos ? "+" : ""}{c.dayChangePct.toFixed(1)}%
                </span>
                <span className="text-gray-400 dark:text-slate-500 ml-auto tabular-nums">
                  ({c.contribution > 0 ? "+" : ""}{c.contribution.toFixed(2)}%)
                </span>
              </div>
            );
          })}
        </>
      )}

      <p className="text-[8px] text-gray-300 dark:text-slate-600 mt-1 leading-tight">
        {hasTypeBreakdown ? "Type breakdown from snapshot diff." : ""}{" "}
        {contributors.length > 0 ? "Holdings estimated from day moves." : ""}
      </p>
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
  spikeContributors,
}: Props) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  if (!point || (point.value == null && point.pct == null)) return null;

  const pointEvents: EventMarker[] = Array.isArray(point.events) ? point.events : [];

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
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 shadow-lg max-w-[240px]">
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
        {pointEvents.length > 0 && <EventSection events={pointEvents} stealthMode={stealthMode} baseCurrency={baseCurrency} />}
        {point.spike != null ? <SpikeContributorsSection spike={point.spike} detail={point.spikeDetail} contributors={spikeContributors ?? []} baseCurrency={baseCurrency} stealthMode={stealthMode} /> : null}
        {range === "1d" && holdings && <MarketSessionSection holdings={holdings} dateStr={point.date} />}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 shadow-lg max-w-[240px]">
      <p className="text-xs text-gray-400 dark:text-slate-500">{formatDateLabel(point.date)}</p>
      <div className="flex items-center gap-1.5 mt-1">
        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
        <span className="text-[10px] text-gray-500 dark:text-slate-400">Value</span>
        <span className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums ml-auto">
          {stealthMode ? "•••••" : formatCurrency(point.value, baseCurrency)}
        </span>
      </div>
      {pointEvents.length > 0 && <EventSection events={pointEvents} stealthMode={stealthMode} baseCurrency={baseCurrency} />}
      {point.spike != null ? <SpikeContributorsSection spike={point.spike} detail={point.spikeDetail} contributors={spikeContributors ?? []} baseCurrency={baseCurrency} stealthMode={stealthMode} /> : null}
      {range === "1d" && holdings && <MarketSessionSection holdings={holdings} dateStr={point.date} />}
    </div>
  );
}
