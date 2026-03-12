"use client";

import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme-context";
import { useTrack } from "@/lib/use-track";
import ScreenerResultRow from "./ScreenerResultRow";
import type { ScreenerCacheRow, ScreenerFilters } from "@/lib/db/screener";

interface Props {
  results: ScreenerCacheRow[];
  total: number;
  loading: boolean;
  filters: ScreenerFilters;
  holdingTickers: Set<string>;
  onSort: (col: string) => void;
}

function formatMarketCap(val: number | null): string {
  if (val == null) return "—";
  if (val >= 1e12) return `${(val / 1e12).toFixed(1)}T`;
  if (val >= 1e9) return `${(val / 1e9).toFixed(0)}B`;
  if (val >= 1e6) return `${(val / 1e6).toFixed(0)}M`;
  return String(Math.round(val));
}

function SortIcon({ active, dir }: { active: boolean; dir: string }) {
  if (!active) return null;
  return <span className="ml-0.5 opacity-70">{dir === "desc" ? "↓" : "↑"}</span>;
}

export default function ScreenerResults({ results, total, loading, filters, holdingTickers, onSort }: Props) {
  const { t } = useI18n();
  const { layoutTheme } = useTheme();
  const track = useTrack();

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-16 ${layoutTheme === "terminal" ? "text-zinc-500 font-mono text-xs" : "text-gray-400 dark:text-slate-500 text-sm"}`}>
        <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
        {t("screenerLoading")}
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className={`text-center py-16 ${layoutTheme === "terminal" ? "text-zinc-500 font-mono text-xs" : "text-gray-400 dark:text-slate-500 text-sm"}`}>
        <svg className="mx-auto mb-3 opacity-40" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        <p>{t("screenerNoResults")}</p>
      </div>
    );
  }

  const resultCount = t("screenerResultsCount").replace("{count}", String(results.length)).replace("{total}", String(total));
  const cols = [
    { key: "symbol", label: t("screenerStock"), align: "left" as const },
    { key: "sector", label: t("screenerSector2"), align: "left" as const, hideMobile: true },
    { key: "regularMarketPrice", label: t("screenerPrice"), align: "right" as const, hideMobile: true },
    { key: "dividendYield", label: t("screenerDivYield"), align: "right" as const },
    { key: "peRatio", label: t("screenerPE"), align: "right" as const },
    { key: "marketCap", label: t("screenerMarketCap"), align: "right" as const, hideMobile: true },
    { key: "regularMarketChangePercent", label: t("screenerDay"), align: "right" as const, hideMobile: true },
  ];

  // Terminal theme
  if (layoutTheme === "terminal") {
    return (
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-mono text-zinc-500">{resultCount}</span>
        </div>
        <div className="border border-zinc-800">
          <div className="hidden sm:flex items-center px-3 py-1 bg-zinc-900/50 border-b border-zinc-800 font-mono text-[10px] uppercase tracking-widest text-zinc-600">
            <div className="w-8">#</div>
            {cols.map((c) => (
              <div key={c.key} className={`flex-1 cursor-pointer hover:text-zinc-400 transition-colors ${c.align === "right" ? "text-right" : ""} ${c.hideMobile ? "hidden lg:block" : ""}`}
                onClick={() => onSort(c.key)}>
                {c.label}<SortIcon active={filters.sortBy === c.key} dir={filters.sortDir || "desc"} />
              </div>
            ))}
            <div className="w-8" />
          </div>
          <div className="max-h-[600px] overflow-y-auto">
            {results.map((r, i) => (
              <ScreenerResultRow key={r.symbol} row={r} index={i + 1} inPortfolio={holdingTickers.has(r.symbol.toUpperCase())} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Canvas theme — card grid
  if (layoutTheme === "canvas") {
    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-slate-500">{resultCount}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {results.map((r, i) => (
            <ScreenerResultRow key={r.symbol} row={r} index={i + 1} inPortfolio={holdingTickers.has(r.symbol.toUpperCase())} />
          ))}
        </div>
      </div>
    );
  }

  // Studio theme
  if (layoutTheme === "studio") {
    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-zinc-500">{resultCount}</span>
        </div>
        <div className="rounded-[20px] border border-white/5 bg-white/[0.02] backdrop-blur-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-4 py-3 text-[11px] font-medium text-zinc-500 w-8">#</th>
                {cols.map((c) => (
                  <th key={c.key} className={`px-4 py-3 text-[11px] font-medium text-zinc-500 cursor-pointer hover:text-zinc-300 transition-colors ${c.align === "right" ? "text-right" : "text-left"} ${c.hideMobile ? "hidden lg:table-cell" : ""}`}
                    onClick={() => onSort(c.key)}>
                    {c.label}<SortIcon active={filters.sortBy === c.key} dir={filters.sortDir || "desc"} />
                  </th>
                ))}
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <ScreenerResultRow key={r.symbol} row={r} index={i + 1} inPortfolio={holdingTickers.has(r.symbol.toUpperCase())} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Default theme
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-500 dark:text-slate-400">{resultCount}</span>
      </div>
      <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm dark:shadow-none">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide w-8">#</th>
              {cols.map((c) => (
                <th key={c.key} className={`px-4 py-3 text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide cursor-pointer hover:text-gray-600 dark:hover:text-slate-300 transition-colors whitespace-nowrap ${c.align === "right" ? "text-right" : "text-left"} ${c.hideMobile ? "hidden lg:table-cell" : ""}`}
                  onClick={() => onSort(c.key)}>
                  {c.label}<SortIcon active={filters.sortBy === c.key} dir={filters.sortDir || "desc"} />
                </th>
              ))}
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {results.map((r, i) => (
              <ScreenerResultRow key={r.symbol} row={r} index={i + 1} inPortfolio={holdingTickers.has(r.symbol.toUpperCase())} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export { formatMarketCap };
