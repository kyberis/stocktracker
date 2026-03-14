"use client";

import { useState, useEffect, useCallback } from "react";
import { TrendingUp, TrendingDown, RefreshCw, ChevronDown } from "lucide-react";

interface WidgetData {
  totalValueEUR: number;
  dayChangeEUR: number;
  dayChangePercent: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  holdingsCount: number;
  topHoldings: { ticker: string; name: string; weight: number; dayChange: number }[];
  portfolioName?: string;
  currency?: string;
  updatedAt: string;
}

interface PortfolioOption {
  id: string;
  name: string;
}

function fmtNumber(n: number): string {
  return Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtMoney(n: number, currency?: string): string {
  const code = currency?.trim().toUpperCase() || "EUR";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(n));
  } catch {
    return `${code} ${fmtNumber(n)}`;
  }
}

export default function WidgetPage() {
  const [data, setData] = useState<WidgetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [portfolios, setPortfolios] = useState<PortfolioOption[]>([]);
  const [selectedPortfolio, setSelectedPortfolio] = useState("");

  const fetchData = useCallback(async (portfolioId?: string) => {
    try {
      setLoading(true);
      const params = portfolioId ? `?portfolio=${portfolioId}` : "";
      const res = await fetch(`/api/portfolio/summary${params}`);
      if (!res.ok) throw new Error("Failed to load");
      const json = await res.json();
      setData(json);
      setError("");
    } catch {
      setError("Unable to load portfolio");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch("/api/portfolios")
      .then((r) => r.json())
      .then((d) => {
        if (d.portfolios) setPortfolios(d.portfolios.map((p: { id: string; name: string }) => ({ id: p.id, name: p.name })));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchData(selectedPortfolio || undefined);
    const interval = setInterval(() => fetchData(selectedPortfolio || undefined), 60_000);
    return () => clearInterval(interval);
  }, [fetchData, selectedPortfolio]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="w-6 h-6 text-slate-400 animate-spin" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-slate-400 text-sm">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  const isUp = data.dayChangeEUR >= 0;
  const gainIsUp = data.totalGainLoss >= 0;

  return (
    <div className="max-w-sm mx-auto px-4 py-6 space-y-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-lg border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-1">
          {portfolios.length > 1 ? (
            <div className="relative">
              <select
                value={selectedPortfolio}
                onChange={(e) => setSelectedPortfolio(e.target.value)}
                className="appearance-none text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-medium bg-transparent pr-4 cursor-pointer focus:outline-none"
              >
                <option value="">All Portfolios</option>
                {portfolios.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-slate-400 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          ) : (
            <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-medium">
              {data.portfolioName || "Portfolio"}
            </span>
          )}
          <button onClick={() => fetchData(selectedPortfolio || undefined)} className="text-slate-400 hover:text-slate-300 transition-colors">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        <p className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
          {fmtMoney(data.totalValueEUR, data.currency)}
        </p>

        <div className="flex items-center gap-2 mt-1">
          {isUp ? (
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          ) : (
            <TrendingDown className="w-4 h-4 text-red-500" />
          )}
          <span className={`text-sm font-semibold ${isUp ? "text-emerald-500" : "text-red-500"}`}>
            {isUp ? "+" : "−"}{fmtMoney(data.dayChangeEUR, data.currency)}
          </span>
          <span className={`text-xs ${isUp ? "text-emerald-400" : "text-red-400"}`}>
            ({isUp ? "+" : "−"}{Math.abs(data.dayChangePercent).toFixed(2)}%)
          </span>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400">Total P/L</span>
          <span className={`text-sm font-semibold ${gainIsUp ? "text-emerald-500" : "text-red-500"}`}>
            {gainIsUp ? "+" : "−"}{fmtMoney(data.totalGainLoss, data.currency)}
          </span>
          <span className={`text-xs ${gainIsUp ? "text-emerald-400" : "text-red-400"}`}>
            ({gainIsUp ? "+" : "−"}{Math.abs(data.totalGainLossPercent).toFixed(2)}%)
          </span>
        </div>
      </div>

      {data.topHoldings.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-lg border border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-medium mb-3">
            Top Holdings
          </p>
          <div className="space-y-2.5">
            {data.topHoldings.map((h) => {
              const hUp = h.dayChange >= 0;
              return (
                <div key={h.ticker} className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                      {h.ticker}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {h.name}
                    </p>
                  </div>
                  <div className="text-right ml-3 shrink-0">
                    <p className="text-xs text-slate-500 dark:text-slate-400">{h.weight}%</p>
                    <p className={`text-xs font-medium ${hUp ? "text-emerald-500" : "text-red-500"}`}>
                      {hUp ? "+" : "−"}{Math.abs(h.dayChange).toFixed(2)}%
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="text-center space-y-1">
        <p className="text-[10px] text-slate-500 dark:text-slate-500">
          {data.holdingsCount} holdings &middot; Updated {new Date(data.updatedAt).toLocaleTimeString()}
        </p>
        <a
          href="https://trefolio.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline"
        >
          trefolio.com
        </a>
      </div>
    </div>
  );
}
