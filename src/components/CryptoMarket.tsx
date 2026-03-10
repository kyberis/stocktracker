"use client";

import { useState, useEffect, useCallback } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Area,
  AreaChart,
} from "recharts";
import { useAuth } from "@/lib/auth-context";
import { useSettings } from "@/lib/settings-context";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme-context";
import type { NormalizedCryptoTicker } from "@/lib/api-providers/coinlore";
import ProCompareCard from "./ProCompareCard";

type CryptoRange = "1m" | "3m" | "1y" | "all";

interface HistoryPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface ExchangeRate {
  pair: string;
  rate: number;
  bid: number;
  ask: number;
}

const COIN_ICONS: Record<string, { bg: string; label: string }> = {
  BTC: { bg: "bg-[#f7931a]", label: "₿" },
  ETH: { bg: "bg-[#627eea]", label: "Ξ" },
  SOL: { bg: "bg-[#9945ff]", label: "◎" },
  ADA: { bg: "bg-[#0033ad]", label: "₳" },
  XRP: { bg: "bg-[#23292f]", label: "✕" },
  DOT: { bg: "bg-[#e6007a]", label: "●" },
  AVAX: { bg: "bg-[#e84142]", label: "▲" },
  LINK: { bg: "bg-[#2a5ada]", label: "⬡" },
};

function fmt(n: number, decimals = 2): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1000) return `$${n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
  if (n >= 1) return `$${n.toFixed(decimals)}`;
  return `$${n.toFixed(Math.max(decimals, 4))}`;
}

function pctClass(val: number): string {
  if (val > 0) return "text-emerald-500";
  if (val < 0) return "text-red-500";
  return "text-gray-400 dark:text-slate-500";
}

function pctStr(val: number): string {
  const prefix = val > 0 ? "+" : "";
  return `${prefix}${val.toFixed(2)}%`;
}

function BlurredProSection({ children, blurb }: { children: React.ReactNode; blurb: string }) {
  return (
    <div className="relative">
      <div className="blur-[6px] pointer-events-none select-none opacity-60">
        {children}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/5 dark:bg-slate-900/40 backdrop-blur-[1px] rounded-2xl">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
        </div>
        <p className="text-sm text-center text-gray-600 dark:text-slate-300 max-w-xs px-4">
          {blurb}
        </p>
        <a
          href="/profile?tab=subscription"
          className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold hover:brightness-110 transition-all"
        >
          Upgrade to Pro
        </a>
      </div>
    </div>
  );
}

export default function CryptoMarket() {
  const { user } = useAuth();
  const { hasGlobalAvKey } = useSettings();
  const { t, language } = useI18n();
  const { isDark } = useTheme();

  const isPro = user?.plan === "pro";
  const canAccessPro = isPro && hasGlobalAvKey;

  const [selectedCoin, setSelectedCoin] = useState("BTC");
  const [tickers, setTickers] = useState<NormalizedCryptoTicker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [range, setRange] = useState<CryptoRange>("1y");

  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [ratesLoading, setRatesLoading] = useState(false);

  const [aiStatus, setAiStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [aiText, setAiText] = useState("");

  const selectedTicker = tickers.find((t) => t.symbol === selectedCoin) || null;

  const fetchTickers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/crypto?action=tickers");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setTickers(data.tickers || []);
    } catch {
      setError("Failed to load crypto data");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    if (!canAccessPro) return;
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/crypto?action=history&symbol=${selectedCoin}&range=${range}`);
      if (!res.ok) {
        setHistory([]);
        return;
      }
      const data = await res.json();
      setHistory((data.history || []).reverse());
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [canAccessPro, selectedCoin, range]);

  const fetchRates = useCallback(async () => {
    if (!canAccessPro) return;
    setRatesLoading(true);
    try {
      const res = await fetch(`/api/crypto?action=exchange-rates&symbol=${selectedCoin}`);
      if (!res.ok) {
        setRates([]);
        return;
      }
      const data = await res.json();
      setRates(data.rates || []);
    } catch {
      setRates([]);
    } finally {
      setRatesLoading(false);
    }
  }, [canAccessPro, selectedCoin]);

  useEffect(() => { fetchTickers(); }, [fetchTickers]);
  useEffect(() => { fetchHistory(); }, [fetchHistory]);
  useEffect(() => { fetchRates(); }, [fetchRates]);

  const requestAiAnalysis = useCallback(async () => {
    if (aiStatus === "loading" || !selectedTicker) return;
    setAiStatus("loading");
    setAiText("");

    try {
      const res = await fetch("/api/ai-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language,
          analysisType: "crypto_market",
          cryptoSymbol: selectedTicker.symbol,
          cryptoName: selectedTicker.name,
          cryptoData: {
            priceUsd: selectedTicker.priceUsd,
            change24h: selectedTicker.change24h,
            change7d: selectedTicker.change7d,
            marketCapUsd: selectedTicker.marketCapUsd,
            volume24hUsd: selectedTicker.volume24hUsd,
          },
          historyData: history.slice(0, 30),
        }),
      });

      if (!res.ok) { setAiStatus("error"); return; }

      const reader = res.body?.getReader();
      if (!reader) { setAiStatus("error"); return; }

      const decoder = new TextDecoder();
      let accumulated = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setAiText(accumulated);
      }
      setAiStatus("done");
    } catch {
      setAiStatus("error");
    }
  }, [aiStatus, selectedTicker, history, language]);

  const axisColor = isDark ? "#94a3b8" : "#9ca3af";
  const gridColor = isDark ? "#334155" : "#e5e7eb";
  const chartData = history.map((h) => ({
    date: h.date,
    close: h.close,
    volume: h.volume,
  }));

  const firstDay = history[0];
  const lastDay = history[history.length - 1];
  const change30d = history.length >= 30
    ? ((lastDay?.close - history[history.length - 30]?.close) / (history[history.length - 30]?.close || 1)) * 100
    : null;

  return (
    <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* A: Header */}
      <div className="card p-5">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t("cryptoTitle")}</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              {canAccessPro ? t("cryptoDescPro") : t("cryptoDesc")}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="card p-4 text-center text-red-500 dark:text-red-400 text-sm">{error}</div>
      )}

      {loading ? (
        <div className="card p-12 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* B: Coin Selector */}
          <div className="card p-3">
            <div className="flex gap-2 flex-wrap">
              {tickers.map((coin) => {
                const icon = COIN_ICONS[coin.symbol];
                const isActive = coin.symbol === selectedCoin;
                return (
                  <button
                    key={coin.symbol}
                    onClick={() => { setSelectedCoin(coin.symbol); setAiStatus("idle"); setAiText(""); }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? "bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm"
                        : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    {icon && (
                      <span className={`w-5 h-5 rounded-full ${icon.bg} flex items-center justify-center text-[10px] font-bold text-white`}>
                        {icon.label}
                      </span>
                    )}
                    {coin.symbol}
                  </button>
                );
              })}
            </div>
          </div>

          {/* C: Summary Stats */}
          {selectedTicker && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="card p-4">
                <div className="text-xs text-gray-500 dark:text-slate-400 mb-1">{t("cryptoPrice")}</div>
                <div className="text-xl font-bold text-gray-900 dark:text-white">{fmt(selectedTicker.priceUsd)}</div>
                <div className={`text-xs font-semibold mt-1 ${pctClass(selectedTicker.change24h)}`}>
                  {pctStr(selectedTicker.change24h)}
                </div>
              </div>
              <div className="card p-4">
                <div className="text-xs text-gray-500 dark:text-slate-400 mb-1">{t("crypto24hChange")}</div>
                <div className={`text-xl font-bold ${pctClass(selectedTicker.change24h)}`}>
                  {pctStr(selectedTicker.change24h)}
                </div>
                <div className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                  1h: {pctStr(selectedTicker.change1h)}
                </div>
              </div>
              <div className="card p-4">
                <div className="text-xs text-gray-500 dark:text-slate-400 mb-1">{t("cryptoMarketCap")}</div>
                <div className="text-xl font-bold text-gray-900 dark:text-white">{fmt(selectedTicker.marketCapUsd, 0)}</div>
                <div className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                  {t("crypto7dChange")}: <span className={pctClass(selectedTicker.change7d)}>{pctStr(selectedTicker.change7d)}</span>
                </div>
              </div>
              <div className="card p-4">
                <div className="text-xs text-gray-500 dark:text-slate-400 mb-1">{t("cryptoVolume24h")}</div>
                <div className="text-xl font-bold text-gray-900 dark:text-white">{fmt(selectedTicker.volume24hUsd, 0)}</div>
                <div className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                  Supply: {selectedTicker.circulatingSupply.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                </div>
              </div>
            </div>
          )}

          {/* D: Price Chart (Pro) */}
          {canAccessPro ? (
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  {selectedTicker?.name} ({selectedCoin})
                </h3>
                <div className="flex gap-1">
                  {(["1m", "3m", "1y", "all"] as CryptoRange[]).map((r) => (
                    <button
                      key={r}
                      onClick={() => setRange(r)}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                        range === r
                          ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/15"
                          : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300"
                      }`}
                    >
                      {t(({ "1m": "cryptoRange1m", "3m": "cryptoRange3m", "1y": "cryptoRange1y", all: "cryptoRangeAll" } as const)[r])}
                    </button>
                  ))}
                </div>
              </div>
              {historyLoading ? (
                <div className="h-64 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="cryptoGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: axisColor, fontSize: 11 }}
                      tickLine={false}
                      axisLine={{ stroke: gridColor }}
                      tickFormatter={(d: string) => {
                        const dt = new Date(d);
                        return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                      }}
                      minTickGap={40}
                    />
                    <YAxis
                      tick={{ fill: axisColor, fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v: number) => {
                        if (v >= 1000) return `${(v / 1000).toFixed(0)}k`;
                        return v.toFixed(2);
                      }}
                      domain={["auto", "auto"]}
                      width={60}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isDark ? "#1e293b" : "#fff",
                        border: `1px solid ${isDark ? "#334155" : "#e2e8f0"}`,
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      labelFormatter={(d) => new Date(String(d)).toLocaleDateString("en-US", {
                        month: "short", day: "numeric", year: "numeric",
                      })}
                      formatter={(value) => [`$${Number(value).toLocaleString("en-US", { minimumFractionDigits: 2 })}`, "Price"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="close"
                      stroke="#10b981"
                      strokeWidth={2}
                      fill="url(#cryptoGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-400 dark:text-slate-500 text-sm">
                  {t("cryptoNoData")}
                </div>
              )}
            </div>
          ) : (
            <BlurredProSection blurb={t("cryptoProChartBlurb")}>
              <div className="card p-5">
                <div className="h-64 bg-gradient-to-b from-emerald-500/10 to-transparent rounded-xl" />
              </div>
            </BlurredProSection>
          )}

          {/* E + F: Market Details + Exchange Rates side-by-side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* E: Market Details (Pro) */}
            {canAccessPro ? (
              <div className="card p-0 overflow-hidden">
                <div className="px-4 pt-4 pb-2 text-sm font-semibold text-gray-900 dark:text-white">{t("cryptoMarketData")}</div>
                {lastDay ? (
                  <div className="grid grid-cols-2 divide-x divide-y divide-gray-100 dark:divide-slate-700">
                    <StatCell label={t("cryptoOpen")} value={fmt(lastDay.open)} />
                    <StatCell label={t("cryptoClose")} value={fmt(lastDay.close)} />
                    <StatCell label={t("cryptoVolume")} value={fmt(lastDay.volume, 0)} />
                    <StatCell label={t("crypto24hRange")} value={`${fmt(lastDay.low)} – ${fmt(lastDay.high)}`} />
                    <StatCell
                      label={t("crypto7dChangeLabel")}
                      value={selectedTicker ? pctStr(selectedTicker.change7d) : "–"}
                      valueClass={selectedTicker ? pctClass(selectedTicker.change7d) : ""}
                    />
                    <StatCell
                      label={t("crypto30dChange")}
                      value={change30d !== null ? pctStr(change30d) : "–"}
                      valueClass={change30d !== null ? pctClass(change30d) : ""}
                    />
                  </div>
                ) : (
                  <div className="p-4 text-sm text-gray-400 dark:text-slate-500">{t("cryptoNoData")}</div>
                )}
              </div>
            ) : (
              <BlurredProSection blurb={t("cryptoProDetailsBlurb")}>
                <div className="card p-0 overflow-hidden">
                  <div className="px-4 pt-4 pb-2 text-sm font-semibold">{t("cryptoMarketData")}</div>
                  <div className="grid grid-cols-2 divide-x divide-y divide-gray-100 dark:divide-slate-700">
                    <StatCell label="Open" value="$82,204" />
                    <StatCell label="Close" value="$83,431" />
                    <StatCell label="Volume" value="28,412" />
                    <StatCell label="Range" value="$80k–$84k" />
                  </div>
                </div>
              </BlurredProSection>
            )}

            {/* F: Exchange Rates (Pro) */}
            {canAccessPro ? (
              <div className="card p-0 overflow-hidden">
                <div className="px-4 pt-4 pb-2 text-sm font-semibold text-gray-900 dark:text-white">{t("cryptoExchangeRates")}</div>
                {ratesLoading ? (
                  <div className="p-6 flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : rates.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-slate-700">
                        <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">{t("cryptoPair")}</th>
                        <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">{t("cryptoRate")}</th>
                        <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">{t("cryptoBid")}</th>
                        <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">{t("cryptoAsk")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rates.map((r) => (
                        <tr key={r.pair} className="border-b border-gray-50 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                          <td className="px-4 py-2.5 font-semibold text-gray-900 dark:text-white">{r.pair}</td>
                          <td className="px-4 py-2.5 text-gray-700 dark:text-slate-300">{r.rate.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="px-4 py-2.5 text-gray-700 dark:text-slate-300">{r.bid.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="px-4 py-2.5 text-gray-700 dark:text-slate-300">{r.ask.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-4 text-sm text-gray-400 dark:text-slate-500">{t("cryptoNoData")}</div>
                )}
              </div>
            ) : (
              <BlurredProSection blurb={t("cryptoProRatesBlurb")}>
                <div className="card p-0 overflow-hidden">
                  <div className="px-4 pt-4 pb-2 text-sm font-semibold">{t("cryptoExchangeRates")}</div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-slate-700">
                        <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 dark:text-slate-400">Pair</th>
                        <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 dark:text-slate-400">Rate</th>
                        <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 dark:text-slate-400">Bid</th>
                        <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 dark:text-slate-400">Ask</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b"><td className="px-4 py-2.5 font-semibold">BTC / EUR</td><td className="px-4 py-2.5">82,431.50</td><td className="px-4 py-2.5">82,428.20</td><td className="px-4 py-2.5">82,434.80</td></tr>
                      <tr className="border-b"><td className="px-4 py-2.5 font-semibold">BTC / USD</td><td className="px-4 py-2.5">89,654.00</td><td className="px-4 py-2.5">89,650.10</td><td className="px-4 py-2.5">89,657.90</td></tr>
                    </tbody>
                  </table>
                </div>
              </BlurredProSection>
            )}
          </div>

          {/* G: AI Analysis (Pro) */}
          {canAccessPro ? (
            <div className="card p-5" style={{ background: isDark ? "linear-gradient(135deg, rgba(139,92,246,0.08), rgba(59,130,246,0.08))" : "linear-gradient(135deg, rgba(139,92,246,0.04), rgba(59,130,246,0.04))", borderColor: isDark ? "rgba(139,92,246,0.2)" : "rgba(139,92,246,0.15)" }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">{t("cryptoAiTitle")}</div>
                  <div className="text-xs text-gray-500 dark:text-slate-400">{t("cryptoAiDesc")}</div>
                </div>
              </div>
              <button
                onClick={requestAiAnalysis}
                disabled={aiStatus === "loading"}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-violet-500 to-indigo-600 text-white text-sm font-semibold hover:brightness-110 transition-all disabled:opacity-60"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
                {aiStatus === "loading" ? "Analyzing..." : `${t("cryptoAiButton")} ${selectedCoin}`}
              </button>
              {aiText && (
                <div className="mt-3 p-4 rounded-lg bg-white/50 dark:bg-slate-900/50 border border-violet-200/20 text-sm text-gray-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {aiText}
                </div>
              )}
              {aiStatus === "error" && (
                <p className="mt-2 text-sm text-red-500">Failed to get AI analysis. Please try again.</p>
              )}
            </div>
          ) : (
            <BlurredProSection blurb={t("cryptoProAiBlurb")}>
              <div className="card p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm font-semibold">AI Market Analysis</div>
                    <div className="text-xs text-gray-500 dark:text-slate-400">AI-powered crypto insights</div>
                  </div>
                </div>
                <div className="h-24 rounded-lg bg-gray-100 dark:bg-slate-700/30" />
              </div>
            </BlurredProSection>
          )}

          {/* H: Comparison Table (all plans via CoinLore) */}
          <div className="card p-0 overflow-x-auto">
            <div className="px-4 pt-4 pb-2 text-sm font-semibold text-gray-900 dark:text-white">{t("cryptoMarketOverview")}</div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-slate-700">
                  <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">{t("cryptoCoin")}</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">{t("cryptoPrice")}</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">24h</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">7d</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">{t("cryptoVolume24h")}</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">{t("cryptoMarketCap")}</th>
                </tr>
              </thead>
              <tbody>
                {tickers.map((coin) => {
                  const icon = COIN_ICONS[coin.symbol];
                  const isSelected = coin.symbol === selectedCoin;
                  return (
                    <tr
                      key={coin.symbol}
                      onClick={() => { setSelectedCoin(coin.symbol); setAiStatus("idle"); setAiText(""); }}
                      className={`border-b border-gray-50 dark:border-slate-700/50 cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-emerald-50/50 dark:bg-emerald-500/5"
                          : "hover:bg-gray-50 dark:hover:bg-slate-700/30"
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {icon && (
                            <span className={`w-5 h-5 rounded-full ${icon.bg} flex items-center justify-center text-[9px] font-bold text-white`}>
                              {icon.label}
                            </span>
                          )}
                          <span className="font-semibold text-gray-900 dark:text-white">{coin.symbol}</span>
                          <span className="text-gray-400 dark:text-slate-500 hidden sm:inline">{coin.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{fmt(coin.priceUsd)}</td>
                      <td className={`px-4 py-3 font-medium ${pctClass(coin.change24h)}`}>{pctStr(coin.change24h)}</td>
                      <td className={`px-4 py-3 font-medium ${pctClass(coin.change7d)}`}>{pctStr(coin.change7d)}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-slate-300">{fmt(coin.volume24hUsd, 0)}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-slate-300">{fmt(coin.marketCapUsd, 0)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Disclaimer */}
          <p className="text-center text-xs text-gray-400 dark:text-slate-500 italic">
            {t("cryptoDisclaimerShort")}
          </p>
        </>
      )}
    </main>
  );
}

function StatCell({ label, value, valueClass = "" }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="px-4 py-3">
      <div className="text-[11px] text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-sm font-semibold text-gray-900 dark:text-white ${valueClass}`}>{value}</div>
    </div>
  );
}
