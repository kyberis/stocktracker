"use client";

import { useEffect, useRef } from "react";
import { useI18n } from "@/lib/i18n";

export interface BenchmarkDef {
  key: string;
  symbol: string;
  labelKey: string;
  color: string;
  icon: string;
  category: "index" | "crypto" | "commodity" | "currency" | "bond";
}

export const OVERLAY_BENCHMARKS: BenchmarkDef[] = [
  // Market Indices
  { key: "sp500", symbol: "^GSPC", labelKey: "benchmarkSp500", color: "#3b82f6", icon: "📈", category: "index" },
  { key: "nasdaq", symbol: "^IXIC", labelKey: "benchmarkNasdaq", color: "#8b5cf6", icon: "📊", category: "index" },
  { key: "dow", symbol: "^DJI", labelKey: "benchmarkDowJones", color: "#f97316", icon: "🏛️", category: "index" },
  { key: "eurostoxx50", symbol: "^STOXX50E", labelKey: "benchmarkEuroStoxx50", color: "#22d3ee", icon: "🇪🇺", category: "index" },
  { key: "dax", symbol: "^GDAXI", labelKey: "benchmarkDax", color: "#dc2626", icon: "🇩🇪", category: "index" },
  { key: "ftse", symbol: "^FTSE", labelKey: "benchmarkFtse100", color: "#0ea5e9", icon: "🇬🇧", category: "index" },
  { key: "msci", symbol: "IWDA.AS", labelKey: "benchmarkMsciWorld", color: "#a78bfa", icon: "🌍", category: "index" },
  { key: "nikkei", symbol: "^N225", labelKey: "benchmarkNikkei225", color: "#e879f9", icon: "🇯🇵", category: "index" },
  // Crypto
  { key: "btc", symbol: "BTC-USD", labelKey: "benchmarkBitcoin", color: "#f59e0b", icon: "₿", category: "crypto" },
  { key: "eth", symbol: "ETH-USD", labelKey: "benchmarkEthereum", color: "#ec4899", icon: "Ξ", category: "crypto" },
  { key: "sol", symbol: "SOL-USD", labelKey: "benchmarkSolana", color: "#9333ea", icon: "◎", category: "crypto" },
  // Commodities
  { key: "gold", symbol: "GC=F", labelKey: "benchmarkGold", color: "#6ee7b7", icon: "🥇", category: "commodity" },
  { key: "silver", symbol: "SI=F", labelKey: "benchmarkSilver", color: "#94a3b8", icon: "🥈", category: "commodity" },
  { key: "oil", symbol: "CL=F", labelKey: "benchmarkOilWti", color: "#78716c", icon: "🛢️", category: "commodity" },
  // Currencies
  { key: "eurusd", symbol: "EURUSD=X", labelKey: "benchmarkEurUsd", color: "#16a34a", icon: "💱", category: "currency" },
  { key: "dxy", symbol: "DX-Y.NYB", labelKey: "benchmarkDollarIndex", color: "#a3e635", icon: "$", category: "currency" },
  // Bonds
  { key: "tnx", symbol: "^TNX", labelKey: "benchmarkUs10y", color: "#fbbf24", icon: "📜", category: "bond" },
];

const CATEGORY_ORDER: BenchmarkDef["category"][] = ["index", "crypto", "commodity", "currency", "bond"];

const CATEGORY_LABEL_KEYS: Record<BenchmarkDef["category"], string> = {
  index: "benchmarkCatIndices",
  crypto: "benchmarkCatCrypto",
  commodity: "benchmarkCatCommodities",
  currency: "benchmarkCatCurrencies",
  bond: "benchmarkCatBonds",
};

interface Props {
  selected: string[];
  onChange: (keys: string[]) => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function BenchmarkDropdown({ selected, onChange, isOpen, onClose }: Props) {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const toggle = (key: string) => {
    onChange(
      selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key],
    );
  };

  const grouped = CATEGORY_ORDER.map((cat) => ({
    cat,
    items: OVERLAY_BENCHMARKS.filter((b) => b.category === cat),
  }));

  const catBg: Record<BenchmarkDef["category"], string> = {
    index: "bg-blue-500/10 text-blue-400",
    crypto: "bg-amber-500/10 text-amber-400",
    commodity: "bg-emerald-500/10 text-emerald-400",
    currency: "bg-green-500/10 text-green-400",
    bond: "bg-yellow-500/10 text-yellow-400",
  };

  return (
    <div
      ref={ref}
      className="absolute bottom-[calc(100%+6px)] right-0 w-[280px] max-h-[420px] overflow-y-auto bg-white dark:bg-[#1a2332] border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl z-50 animate-in fade-in slide-in-from-bottom-1 duration-150 scrollbar-hide"
    >
      <div className="px-3.5 pt-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500">
        {t("compareWith")}
      </div>
      {grouped.map(({ cat, items }) => (
        <div key={cat} className="px-1.5 pb-1.5">
          <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500">
            {t(CATEGORY_LABEL_KEYS[cat] as Parameters<typeof t>[0])}
          </div>
          {items.map((b) => {
            const active = selected.includes(b.key);
            return (
              <button
                key={b.key}
                onClick={() => toggle(b.key)}
                className={`flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-left transition-colors ${
                  active
                    ? "bg-blue-500/10 dark:bg-blue-500/10"
                    : "hover:bg-gray-50 dark:hover:bg-white/[0.03]"
                }`}
              >
                <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0 ${catBg[cat]}`}>
                  {b.icon}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[13px] font-medium text-gray-900 dark:text-slate-200 truncate">
                    {t(b.labelKey as Parameters<typeof t>[0])}
                  </span>
                  <span className="block text-[10px] text-gray-400 dark:text-slate-500">{b.symbol}</span>
                </span>
                <span
                  className={`w-[18px] h-[18px] rounded-[5px] border-[1.5px] flex items-center justify-center shrink-0 transition-colors ${
                    active
                      ? "bg-blue-500 border-blue-500"
                      : "border-gray-300 dark:border-slate-600"
                  }`}
                >
                  {active && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
