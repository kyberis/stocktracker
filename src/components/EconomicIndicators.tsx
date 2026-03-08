"use client";

import { useState, useEffect, useCallback } from "react";
import { useSettings } from "@/lib/settings-context";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { useTheme } from "@/lib/theme-context";
import type { EconDataPoint } from "@/lib/types";
import ProCompareCard from "@/components/ProCompareCard";
import type { UpsellReason } from "@/lib/upsell";

type AiStatus = "idle" | "loading" | "done" | "error" | "no-key" | "ai-limit" | "upgrade";

interface IndicatorConfig {
  func: string;
  labelKey: string;
  intervals?: { value: string; labelKey: string }[];
  maturities?: { value: string; labelKey: string }[];
  defaultInterval?: string;
  defaultMaturity?: string;
}

const INDICATORS: IndicatorConfig[] = [
  {
    func: "REAL_GDP",
    labelKey: "econRealGDP",
    intervals: [
      { value: "quarterly", labelKey: "econQuarterly" },
      { value: "annual", labelKey: "econAnnual" },
    ],
    defaultInterval: "quarterly",
  },
  {
    func: "REAL_GDP_PER_CAPITA",
    labelKey: "econRealGDPPerCapita",
  },
  {
    func: "TREASURY_YIELD",
    labelKey: "econTreasuryYield",
    intervals: [
      { value: "daily", labelKey: "econDaily" },
      { value: "weekly", labelKey: "econWeekly" },
      { value: "monthly", labelKey: "econMonthly" },
    ],
    maturities: [
      { value: "3month", labelKey: "econ3month" },
      { value: "2year", labelKey: "econ2year" },
      { value: "5year", labelKey: "econ5year" },
      { value: "7year", labelKey: "econ7year" },
      { value: "10year", labelKey: "econ10year" },
      { value: "30year", labelKey: "econ30year" },
    ],
    defaultInterval: "monthly",
    defaultMaturity: "10year",
  },
  {
    func: "FEDERAL_FUNDS_RATE",
    labelKey: "econFederalFundsRate",
    intervals: [
      { value: "daily", labelKey: "econDaily" },
      { value: "weekly", labelKey: "econWeekly" },
      { value: "monthly", labelKey: "econMonthly" },
    ],
    defaultInterval: "monthly",
  },
  {
    func: "CPI",
    labelKey: "econCPI",
    intervals: [
      { value: "monthly", labelKey: "econMonthly" },
      { value: "semiannual", labelKey: "econSemiannual" },
    ],
    defaultInterval: "monthly",
  },
  {
    func: "INFLATION",
    labelKey: "econInflation",
  },
  {
    func: "RETAIL_SALES",
    labelKey: "econRetailSales",
  },
  {
    func: "DURABLES",
    labelKey: "econDurables",
  },
  {
    func: "UNEMPLOYMENT",
    labelKey: "econUnemployment",
  },
  {
    func: "NONFARM_PAYROLL",
    labelKey: "econNonfarmPayroll",
  },
];

interface CachedResult {
  name: string;
  interval: string;
  unit: string;
  data: EconDataPoint[];
}

export default function EconomicIndicators() {
  const { isAlphaVantage, provider, getApiHeaders, trackAvCalls } = useSettings();
  const { user } = useAuth();
  const { t, language } = useI18n();
  const { isDark } = useTheme();

  const [activeIdx, setActiveIdx] = useState(0);
  const [interval, setInterval_] = useState(INDICATORS[0].defaultInterval || "");
  const [maturity, setMaturity] = useState(INDICATORS[0].defaultMaturity || "");

  const [result, setResult] = useState<CachedResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [aiStatus, setAiStatus] = useState<AiStatus>("idle");
  const [aiText, setAiText] = useState("");
  const [aiLimitInfo, setAiLimitInfo] = useState<{ used: number; limit: number } | null>(null);
  const [lockedReason, setLockedReason] = useState<UpsellReason | null>(null);

  const [chartRange, setChartRange] = useState<"all" | "10y" | "5y" | "2y" | "1y">("5y");

  const config = INDICATORS[activeIdx];
  const isFree = user?.plan !== "pro";

  const fetchIndicator = useCallback(async () => {
    setLoading(true);
    setError("");
    setResult(null);
    setAiStatus("idle");
    setAiText("");
    setAiLimitInfo(null);
    setLockedReason(null);

    const headers = getApiHeaders();
    const params = new URLSearchParams({ func: config.func, provider });
    if (interval) params.set("interval", interval);
    if (maturity) params.set("maturity", maturity);

    try {
      const res = await fetch(`/api/economic-indicators?${params}`, { headers });
      trackAvCalls(res);
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        if (res.status === 403 && err?.reason === "upgrade_required") {
          setLockedReason("upgrade_required");
          setError("");
          return;
        }
        if (res.status === 503) {
          setError(t("econNoApiKey"));
          return;
        }
        setError(err?.error || "Failed to fetch data");
        return;
      }
      const data = await res.json();
      setResult(data);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [config.func, interval, maturity, provider, getApiHeaders, trackAvCalls]);

  useEffect(() => {
    if (!isAlphaVantage) return;
    fetchIndicator();
  }, [fetchIndicator, isAlphaVantage]);

  const handleTabChange = (idx: number) => {
    setActiveIdx(idx);
    const cfg = INDICATORS[idx];
    setInterval_(cfg.defaultInterval || "");
    setMaturity(cfg.defaultMaturity || "");
  };

  const filteredData = (() => {
    if (!result?.data) return [];
    if (chartRange === "all") return result.data;
    const yearsMap: Record<string, number> = { "10y": 10, "5y": 5, "2y": 2, "1y": 1 };
    const years = yearsMap[chartRange] || 5;
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - years);
    const cutStr = cutoff.toISOString().slice(0, 10);
    return result.data.filter((d) => d.date >= cutStr);
  })();

  const chartData = [...filteredData]
    .filter((d) => d.value !== null)
    .reverse()
    .map((d) => ({ date: d.date, value: d.value }));

  const latestValue = result?.data?.[0];
  const prevValue = result?.data?.[1];
  const changeVal =
    latestValue?.value != null && prevValue?.value != null
      ? latestValue.value - prevValue.value
      : null;
  const changePct =
    changeVal != null && prevValue?.value
      ? (changeVal / Math.abs(prevValue.value)) * 100
      : null;

  const requestAiAnalysis = useCallback(async () => {
    if (aiStatus === "loading" || !result) return;
    setAiStatus("loading");
    setAiText("");
    setAiLimitInfo(null);

    const payload = {
      language,
      analysisType: "economic_indicator",
      indicatorName: result.name,
      indicatorUnit: result.unit,
      indicatorInterval: result.interval,
      indicatorData: result.data.slice(0, 40),
    };

    try {
      const res = await fetch("/api/ai-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.status === 501) { setAiStatus("no-key"); return; }
      if (res.status === 403) {
        const body = await res.json().catch(() => null);
        if (body?.reason === "ai_limit_reached") {
          setAiLimitInfo({
            used: Number(body?.used || 0),
            limit: Number(body?.limit || 5),
          });
          setAiStatus("ai-limit");
          return;
        }
        if (body?.reason === "upgrade_required") {
          setAiStatus("upgrade");
          return;
        }
      }
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
  }, [aiStatus, result, language]);

  const axisColor = isDark ? "#94a3b8" : "#9ca3af";
  const gridColor = isDark ? "#334155" : "#e5e7eb";

  return (
    <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Title card */}
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-400 to-indigo-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t("economicIndicators")}</h2>
              <p className="text-sm text-gray-500 dark:text-slate-400">{t("economicIndicatorsDesc")}</p>
            </div>
          </div>
        </div>

        {!isAlphaVantage ? (
          isFree ? (
            <ProCompareCard surface="economic_locked" reason="upgrade_required" />
          ) : (
            <div className="card p-8 text-center">
              <p className="text-gray-500 dark:text-slate-400">{t("econRequireAV")}</p>
            </div>
          )
        ) : (
          <>
            {lockedReason && isFree && (
              <ProCompareCard surface="economic_locked" reason={lockedReason} />
            )}
            {/* Indicator tabs */}
            <div className="flex flex-wrap gap-1.5">
              {INDICATORS.map((ind, idx) => (
                <button
                  key={ind.func}
                  onClick={() => handleTabChange(idx)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    idx === activeIdx
                      ? "bg-emerald-500 text-white"
                      : "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600"
                  }`}
                >
                  {t(ind.labelKey as Parameters<typeof t>[0])}
                </button>
              ))}
            </div>

            {/* Options row */}
            <div className="flex flex-wrap items-center gap-3">
              {config.intervals && config.intervals.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 dark:text-slate-400">{t("econInterval")}:</span>
                  <div className="flex gap-1">
                    {config.intervals.map((iv) => (
                      <button
                        key={iv.value}
                        onClick={() => setInterval_(iv.value)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                          interval === iv.value
                            ? "bg-emerald-500 text-white"
                            : "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600"
                        }`}
                      >
                        {t(iv.labelKey as Parameters<typeof t>[0])}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {config.maturities && config.maturities.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 dark:text-slate-400">{t("econMaturity")}:</span>
                  <div className="flex gap-1">
                    {config.maturities.map((m) => (
                      <button
                        key={m.value}
                        onClick={() => setMaturity(m.value)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                          maturity === m.value
                            ? "bg-emerald-500 text-white"
                            : "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600"
                        }`}
                      >
                        {t(m.labelKey as Parameters<typeof t>[0])}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {loading && <LoadingSpinner />}
            {error && <ErrorBanner message={error} />}

            {result && !loading && (
              <>
                {/* Summary card */}
                <div className="card p-5">
                  <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-slate-400 mb-0.5">{result.name}</p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-white">
                        {latestValue?.value != null ? formatNumber(latestValue.value) : "N/A"}
                        {result.unit && (
                          <span className="text-sm font-normal text-gray-400 dark:text-slate-500 ml-2">{result.unit}</span>
                        )}
                      </p>
                      {latestValue?.date && (
                        <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{latestValue.date}</p>
                      )}
                    </div>
                    {changeVal != null && (
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 text-sm font-semibold ${
                            changeVal >= 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-red-500 dark:text-red-400"
                          }`}
                        >
                          {changeVal >= 0 ? "+" : ""}
                          {formatNumber(changeVal)}
                          {changePct != null && (
                            <span className="text-xs font-normal">
                              ({changeVal >= 0 ? "+" : ""}{changePct.toFixed(2)}%)
                            </span>
                          )}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-slate-500">
                          vs {prevValue?.date}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Chart range pills */}
                <div className="flex gap-1.5">
                  {(["1y", "2y", "5y", "10y", "all"] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setChartRange(r)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                        chartRange === r
                          ? "bg-emerald-500 text-white"
                          : "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600"
                      }`}
                    >
                      {r === "all" ? "All" : r.toUpperCase()}
                    </button>
                  ))}
                </div>

                {/* Chart */}
                {chartData.length > 0 && (
                  <div className="card p-4">
                    <ResponsiveContainer width="100%" height={340}>
                      <LineChart data={chartData} margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
                        <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
                        <XAxis
                          dataKey="date"
                          tick={{ fill: axisColor, fontSize: 10 }}
                          tickLine={{ stroke: axisColor }}
                          axisLine={{ stroke: gridColor }}
                          interval="preserveStartEnd"
                          minTickGap={60}
                        />
                        <YAxis
                          tick={{ fill: axisColor, fontSize: 10 }}
                          tickLine={{ stroke: axisColor }}
                          axisLine={{ stroke: gridColor }}
                          domain={["auto", "auto"]}
                          tickFormatter={(v: number) => formatNumber(v)}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: isDark ? "#1e293b" : "#fff",
                            border: `1px solid ${isDark ? "#475569" : "#e5e7eb"}`,
                            borderRadius: 8,
                            fontSize: 12,
                          }}
                          labelStyle={{ color: isDark ? "#94a3b8" : "#6b7280" }}
                          formatter={(v: number | undefined) => [formatNumber(v ?? 0), result.name]}
                        />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke="#10b981"
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 4, fill: "#10b981" }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Data table */}
                <div className="card overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                      {t("econLatestValue")} — {result.name}
                    </h3>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-slate-800/50 sticky top-0">
                        <tr>
                          <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 dark:text-slate-400">Date</th>
                          <th className="text-right px-4 py-2 text-xs font-medium text-gray-500 dark:text-slate-400">Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredData.slice(0, 60).map((d, i) => (
                          <tr key={d.date + i} className="border-t border-gray-100 dark:border-slate-700">
                            <td className="px-4 py-2 text-gray-700 dark:text-slate-300">{d.date}</td>
                            <td className="px-4 py-2 text-right font-mono text-gray-900 dark:text-white">
                              {d.value != null ? formatNumber(d.value) : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* AI Analysis */}
                <AiSection
                  status={aiStatus}
                  text={aiText}
                  onAnalyze={requestAiAnalysis}
                  aiLimitInfo={aiLimitInfo}
                  t={t}
                />
              </>
            )}
          </>
        )}
    </main>
  );
}

/* ── Helper Components ──────────────────────────────────── */

function formatNumber(n: number): string {
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (Math.abs(n) >= 1e3 && Number.isInteger(n)) return n.toLocaleString();
  return n.toLocaleString(undefined, { maximumFractionDigits: 3 });
}

function LoadingSpinner() {
  return (
    <div className="card p-12 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="card p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
      <p className="text-sm text-red-600 dark:text-red-400">{message}</p>
    </div>
  );
}

function AiSection({
  status,
  text,
  onAnalyze,
  aiLimitInfo,
  t,
}: {
  status: AiStatus;
  text: string;
  onAnalyze: () => void;
  aiLimitInfo: { used: number; limit: number } | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: (key: any) => string;
}) {
  if (status === "ai-limit") {
    return (
      <ProCompareCard
        surface="ai_limit"
        reason="ai_limit_reached"
        aiUsage={aiLimitInfo || { used: 0, limit: 5 }}
      />
    );
  }
  if (status === "upgrade") {
    return <ProCompareCard surface="ai_limit" reason="upgrade_required" />;
  }

  return (
    <div className="card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t("aiAnalysis")}</h3>
          <p className="text-xs text-gray-500 dark:text-slate-400">{t("econAiDesc")}</p>
        </div>
        <button
          onClick={onAnalyze}
          disabled={status === "loading"}
          className="btn-primary text-xs flex items-center gap-1.5 disabled:opacity-50"
        >
          {status === "loading" ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              {t("aiAnalyzing")}
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
              </svg>
              {t("econAiButton")}
            </>
          )}
        </button>
      </div>

      {status === "no-key" && (
        <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
          <p className="text-xs text-amber-700 dark:text-amber-400">{t("aiNoKey")}</p>
        </div>
      )}
      {status === "error" && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
          <p className="text-xs text-red-600 dark:text-red-400">{t("aiError")}</p>
        </div>
      )}
      {text && (
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <AiMarkdown text={text} />
          {status === "done" && (
            <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-3 italic">{t("aiDisclaimer")}</p>
          )}
        </div>
      )}
    </div>
  );
}

function AiMarkdown({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-2">
      {lines.map((line, i) => {
        if (line.startsWith("## "))
          return (
            <h3 key={i} className="text-base font-semibold text-gray-900 dark:text-white mt-4">
              {line.slice(3)}
            </h3>
          );
        if (line.startsWith("### "))
          return (
            <h4 key={i} className="text-sm font-semibold text-gray-800 dark:text-slate-200 mt-3">
              {line.slice(4)}
            </h4>
          );
        if (line.startsWith("- "))
          return (
            <li key={i} className="ml-4 text-sm text-gray-700 dark:text-slate-300 list-disc">
              {line.slice(2)}
            </li>
          );
        if (line.trim() === "") return <div key={i} className="h-1" />;
        return (
          <p key={i} className="text-sm text-gray-700 dark:text-slate-300 leading-relaxed">
            {line}
          </p>
        );
      })}
    </div>
  );
}
