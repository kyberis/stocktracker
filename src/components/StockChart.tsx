"use client";

import { useState, useEffect, useCallback } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { useI18n } from "@/lib/i18n";
import { usePortfolio } from "@/lib/portfolio-context";
import { useSettings } from "@/lib/settings-context";
import { formatCurrency, convertCurrency, normalizeCurrency } from "@/lib/utils";
import type { HistoricalDataPoint, TimePeriod } from "@/lib/types";

interface StockChartProps {
  ticker: string;
  purchasePrice: number;
  displayCurrency: string;
}

const PERIOD_LABELS: Record<TimePeriod, string> = {
  "1w": "period1w",
  "1m": "period1m",
  "3m": "period3m",
  "6m": "period6m",
  "1y": "period1y",
  "all": "periodAll",
};

const PERIOD_KEYS: TimePeriod[] = ["1w", "1m", "3m", "6m", "1y", "all"];

export default function StockChart({ ticker, purchasePrice, displayCurrency }: StockChartProps) {
  const [rawData, setRawData] = useState<HistoricalDataPoint[]>([]);
  const [period, setPeriod] = useState<TimePeriod>("3m");
  const [loading, setLoading] = useState(true);
  const [chartProviderUsed, setChartProviderUsed] = useState<string | null>(null);
  const { t } = useI18n();
  const { quotes, exchangeRates } = usePortfolio();
  const { provider, getApiHeaders, trackAvCalls, isAlphaVantage } = useSettings();

  const quote = quotes[ticker];
  const quoteCurrency = quote ? normalizeCurrency(quote.currency) : displayCurrency;
  const needsConversion = normalizeCurrency(quoteCurrency) !== normalizeCurrency(displayCurrency);

  const convertPrice = useCallback(
    (price: number) => {
      if (!needsConversion) return price;
      return convertCurrency(price, quoteCurrency, displayCurrency, exchangeRates);
    },
    [needsConversion, quoteCurrency, displayCurrency, exchangeRates]
  );

  const data = rawData.map((d) => ({
    ...d,
    close: convertPrice(d.close),
    open: convertPrice(d.open),
    high: convertPrice(d.high),
    low: convertPrice(d.low),
  }));

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        symbol: ticker,
        period,
        provider,
      });
      const headers = getApiHeaders();
      const res = await fetch(`/api/historical?${params}`, { headers });
      trackAvCalls(res);
      if (res.ok) {
        const json = await res.json();
        if (json.data && json.providerUsed) {
          setRawData(json.data);
          setChartProviderUsed(json.providerUsed);
        } else {
          setRawData(json);
          setChartProviderUsed(null);
        }
      }
    } catch {
      setRawData([]);
    } finally {
      setLoading(false);
    }
  }, [ticker, period, provider, getApiHeaders, trackAvCalls]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const lastPrice = data.length > 0 ? data[data.length - 1].close : 0;
  const isAbovePurchase = lastPrice >= purchasePrice;
  const chartColor = isAbovePurchase ? "#22c55e" : "#ef4444";

  const formatDate = (date: string) => {
    const d = new Date(date);
    if (period === "all" || period === "1y") {
      return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    }
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: HistoricalDataPoint }> }) => {
    if (!active || !payload?.length) return null;
    const point = payload[0].payload;
    return (
      <div className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 shadow-xl">
        <p className="text-xs text-slate-400">{point.date}</p>
        <p className="text-sm font-semibold text-white">
          {formatCurrency(point.close, displayCurrency)}
        </p>
      </div>
    );
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span className="text-sm text-slate-400 mr-2">{t("priceHistory")}:</span>
        {PERIOD_KEYS.map((key) => (
          <button
            key={key}
            onClick={() => setPeriod(key)}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
              period === key
                ? "bg-blue-600 text-white"
                : "bg-slate-700 text-slate-300 hover:bg-slate-600"
            }`}
          >
            {t(PERIOD_LABELS[key] as Parameters<typeof t>[0])}
          </button>
        ))}
        {needsConversion && (
          <span className="text-xs text-amber-400/70 ml-2">
            (converted to {displayCurrency})
          </span>
        )}
        {isAlphaVantage && chartProviderUsed === "yahoo" && (
          <span
            className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/20 ml-auto"
            title={t("yahooFallback")}
          >
            Yahoo
          </span>
        )}
        {isAlphaVantage && chartProviderUsed === "alphavantage" && (
          <span
            className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 ml-auto"
            title={t("avSource")}
          >
            AV
          </span>
        )}
      </div>

      {loading ? (
        <div className="h-[300px] flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      ) : data.length === 0 ? (
        <div className="h-[300px] flex items-center justify-center text-slate-400">
          No data available
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <defs>
              <linearGradient id={`gradient-${ticker}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartColor} stopOpacity={0.3} />
                <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              tick={{ fill: "#94a3b8", fontSize: 11 }}
              axisLine={{ stroke: "#334155" }}
              tickLine={false}
              minTickGap={40}
            />
            <YAxis
              domain={["auto", "auto"]}
              tick={{ fill: "#94a3b8", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={60}
              tickFormatter={(v: number) => v.toFixed(0)}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine
              y={purchasePrice}
              stroke="#fbbf24"
              strokeDasharray="6 4"
              strokeWidth={1.5}
              label={{
                value: t("purchaseLine"),
                fill: "#fbbf24",
                fontSize: 11,
                position: "insideTopRight",
              }}
            />
            <Area
              type="monotone"
              dataKey="close"
              stroke={chartColor}
              strokeWidth={2}
              fill={`url(#gradient-${ticker})`}
              dot={false}
              activeDot={{ r: 4, fill: chartColor }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
