"use client";

import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme-context";
import { useTrack } from "@/lib/use-track";
import type { ScreenerCacheRow } from "@/lib/db/screener";
import { formatMarketCap } from "./ScreenerResults";

interface Props {
  row: ScreenerCacheRow;
  index: number;
  inPortfolio: boolean;
}

function formatPercent(val: number | null): string {
  if (val == null) return "—";
  return `${(val * 100).toFixed(2)}%`;
}

function formatPe(val: number | null): string {
  if (val == null) return "—";
  return val.toFixed(1);
}

function formatPrice(val: number | null, currency: string): string {
  if (val == null || !Number.isFinite(val)) return "—";
  const c = (currency || "").toUpperCase();
  const sym =
    c === "EUR" ? "€" :
    c === "GBP" || c === "GBX" ? "£" :
    c === "CHF" ? "CHF " :
    c === "NOK" ? "kr " :
    c === "SEK" ? "kr " :
    c === "DKK" ? "kr " :
    c === "USD" || c === "" ? "$" :
    `${c} `;
  return `${sym}${val.toFixed(2)}`;
}

function AnalystBar({ row }: { row: ScreenerCacheRow }) {
  const total = row.analystStrongBuy + row.analystBuy + row.analystHold + row.analystSell + row.analystStrongSell;
  if (total === 0) return <span className="text-xs opacity-40">—</span>;
  const buyPct = ((row.analystStrongBuy + row.analystBuy) / total) * 100;
  const holdPct = (row.analystHold / total) * 100;
  const sellPct = ((row.analystSell + row.analystStrongSell) / total) * 100;
  return (
    <div className="flex gap-px h-1.5 w-16 rounded-full overflow-hidden" aria-label={`Buy ${Math.round(buyPct)}%, Hold ${Math.round(holdPct)}%, Sell ${Math.round(sellPct)}%`}>
      <div className="bg-emerald-500 dark:bg-emerald-400" style={{ width: `${buyPct}%` }} />
      <div className="bg-amber-400" style={{ width: `${holdPct}%` }} />
      <div className="bg-red-500 dark:bg-red-400" style={{ width: `${sellPct}%` }} />
    </div>
  );
}

export default function ScreenerResultRow({ row, index, inPortfolio }: Props) {
  const { t } = useI18n();
  const { layoutTheme } = useTheme();
  const track = useTrack();
  const router = useRouter();

  function handleClick() {
    track("screener_stock_clicked", { ticker: row.symbol });
    router.push(`/tools/screener/stock/${encodeURIComponent(row.symbol)}`);
  }

  const dayChangeClass = (row.regularMarketChangePercent ?? 0) >= 0
    ? "text-emerald-600 dark:text-emerald-400"
    : "text-red-500 dark:text-red-400";

  const dayChangePrefix = (row.regularMarketChangePercent ?? 0) >= 0 ? "+" : "";

  // Terminal
  if (layoutTheme === "terminal") {
    return (
      <div className="border-b border-zinc-800 last:border-b-0 cursor-pointer hover:bg-zinc-800/60 transition-colors" onClick={handleClick}>
        <div className="flex items-center px-3 py-1.5 font-mono text-[12px]">
          <div className="w-8 text-zinc-600 text-[10px]">{index}</div>
          <div className="flex-1 min-w-0">
            <span className="text-zinc-200 font-medium">{row.symbol}</span>
            {inPortfolio && <span className="ml-1 text-green-500 text-[10px]">●</span>}
            <span className="ml-2 text-zinc-600 text-[10px] truncate hidden sm:inline">{row.shortName}</span>
          </div>
          <div className="flex-1 text-zinc-600 text-[10px] hidden lg:block truncate">{row.sector}</div>
          <div className="flex-1 text-right text-zinc-400 hidden lg:block tabular-nums">{formatPrice(row.regularMarketPrice, row.currency)}</div>
          <div className={`flex-1 text-right tabular-nums ${(row.dividendYield ?? 0) > 0 ? "text-green-400" : "text-zinc-600"}`}>{formatPercent(row.dividendYield)}</div>
          <div className="flex-1 text-right text-zinc-400 tabular-nums">{formatPe(row.peRatio)}</div>
          <div className="flex-1 text-right text-zinc-500 tabular-nums hidden lg:block">{formatMarketCap(row.marketCap)}</div>
          <div className={`flex-1 text-right tabular-nums hidden lg:block ${(row.regularMarketChangePercent ?? 0) >= 0 ? "text-green-400" : "text-red-400"}`}>
            {dayChangePrefix}{row.regularMarketChangePercent != null ? `${row.regularMarketChangePercent.toFixed(2)}%` : "—"}
          </div>
          <div className="w-8" />
        </div>
      </div>
    );
  }

  // Canvas — card
  if (layoutTheme === "canvas") {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={handleClick}>
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="font-semibold text-slate-800 text-sm">{row.symbol}</div>
            <div className="text-xs text-slate-400 truncate max-w-[180px]">{row.shortName}</div>
          </div>
          {inPortfolio && (
            <span className="text-[10px] font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-100">Held</span>
          )}
        </div>
        {row.sector && (
          <span className="inline-block text-[10px] font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 mb-3">{row.sector}</span>
        )}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <div className="text-slate-400">{t("screenerDivYield")}</div>
            <div className={`font-medium tabular-nums ${(row.dividendYield ?? 0) > 0 ? "text-green-600" : "text-slate-600"}`}>{formatPercent(row.dividendYield)}</div>
          </div>
          <div>
            <div className="text-slate-400">{t("screenerPE")}</div>
            <div className="font-medium text-slate-700 tabular-nums">{formatPe(row.peRatio)}</div>
          </div>
          <div>
            <div className="text-slate-400">{t("screenerPrice")}</div>
            <div className="font-medium text-slate-700 tabular-nums">{formatPrice(row.regularMarketPrice, row.currency)}</div>
          </div>
          <div>
            <div className="text-slate-400">{t("screenerDay")}</div>
            <div className={`font-medium tabular-nums ${(row.regularMarketChangePercent ?? 0) >= 0 ? "text-green-600" : "text-red-500"}`}>
              {dayChangePrefix}{row.regularMarketChangePercent != null ? `${row.regularMarketChangePercent.toFixed(2)}%` : "—"}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Studio — table row
  if (layoutTheme === "studio") {
    return (
      <tr className="border-b border-white/5 last:border-b-0 hover:bg-white/[0.02] cursor-pointer transition-colors" onClick={handleClick}>
        <td className="px-4 py-3 text-xs text-zinc-600">{index}</td>
        <td className="px-4 py-3">
          <div className="flex flex-col">
            <span className="font-medium text-zinc-100 text-sm">{row.symbol}</span>
            <span className="text-[11px] text-zinc-500 truncate max-w-[180px]">{row.shortName}</span>
          </div>
          {inPortfolio && <span className="inline-block mt-0.5 text-[9px] text-green-400 font-medium">● In portfolio</span>}
        </td>
        <td className="px-4 py-3 hidden lg:table-cell">
          {row.sector && <span className="text-[10px] font-medium text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">{row.sector}</span>}
        </td>
        <td className="px-4 py-3 text-right text-zinc-300 tabular-nums hidden lg:table-cell" style={{ fontFamily: "var(--font-mono, monospace)" }}>{formatPrice(row.regularMarketPrice, row.currency)}</td>
        <td className={`px-4 py-3 text-right tabular-nums ${(row.dividendYield ?? 0) > 0 ? "text-green-400" : "text-zinc-500"}`} style={{ fontFamily: "var(--font-mono, monospace)" }}>{formatPercent(row.dividendYield)}</td>
        <td className="px-4 py-3 text-right text-zinc-300 tabular-nums" style={{ fontFamily: "var(--font-mono, monospace)" }}>{formatPe(row.peRatio)}</td>
        <td className="px-4 py-3 text-right text-zinc-400 tabular-nums hidden lg:table-cell" style={{ fontFamily: "var(--font-mono, monospace)" }}>{formatMarketCap(row.marketCap)}</td>
        <td className={`px-4 py-3 text-right tabular-nums hidden lg:table-cell ${(row.regularMarketChangePercent ?? 0) >= 0 ? "text-green-400" : "text-red-400"}`} style={{ fontFamily: "var(--font-mono, monospace)" }}>
          {dayChangePrefix}{row.regularMarketChangePercent != null ? `${row.regularMarketChangePercent.toFixed(2)}%` : "—"}
        </td>
        <td className="px-2 py-3"><AnalystBar row={row} /></td>
      </tr>
    );
  }

  // Default theme — table row
  return (
    <tr className="border-b border-gray-100 dark:border-slate-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-slate-700/30 cursor-pointer transition-colors" onClick={handleClick}>
      <td className="px-4 py-3.5 text-xs text-gray-400 dark:text-slate-500">{index}</td>
      <td className="px-4 py-3.5">
        <div className="flex flex-col">
          <span className="font-semibold text-gray-900 dark:text-white text-sm">{row.symbol}</span>
          <span className="text-xs text-gray-400 dark:text-slate-500 truncate max-w-[180px]">{row.shortName}</span>
        </div>
        {inPortfolio && <span className="inline-block mt-0.5 text-[10px] text-emerald-500 font-medium">● In portfolio</span>}
      </td>
      <td className="px-4 py-3.5 hidden lg:table-cell">
        {row.sector && <span className="inline-block text-[11px] font-medium text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-100 dark:border-blue-500/20">{row.sector}</span>}
      </td>
      <td className="px-4 py-3.5 text-right text-gray-700 dark:text-slate-300 tabular-nums hidden lg:table-cell" style={{ fontFamily: "var(--font-mono, monospace)" }}>{formatPrice(row.regularMarketPrice, row.currency)}</td>
      <td className={`px-4 py-3.5 text-right tabular-nums ${(row.dividendYield ?? 0) > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-gray-400 dark:text-slate-500"}`} style={{ fontFamily: "var(--font-mono, monospace)" }}>{formatPercent(row.dividendYield)}</td>
      <td className="px-4 py-3.5 text-right text-gray-700 dark:text-slate-300 tabular-nums" style={{ fontFamily: "var(--font-mono, monospace)" }}>{formatPe(row.peRatio)}</td>
      <td className="px-4 py-3.5 text-right text-gray-500 dark:text-slate-400 tabular-nums hidden lg:table-cell" style={{ fontFamily: "var(--font-mono, monospace)" }}>{formatMarketCap(row.marketCap)}</td>
      <td className={`px-4 py-3.5 text-right tabular-nums hidden lg:table-cell ${dayChangeClass}`} style={{ fontFamily: "var(--font-mono, monospace)" }}>
        {dayChangePrefix}{row.regularMarketChangePercent != null ? `${row.regularMarketChangePercent.toFixed(2)}%` : "—"}
      </td>
      <td className="px-2 py-3.5"><AnalystBar row={row} /></td>
    </tr>
  );
}
