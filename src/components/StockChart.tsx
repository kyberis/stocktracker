"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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
import { useTheme } from "@/lib/theme-context";
import { formatCurrency, convertCurrency, normalizeCurrency } from "@/lib/utils";
import type { HistoricalDataPoint, TimePeriod } from "@/lib/types";
import { marketDataSymbolForHolding, isTickerExchangeCollision } from "@/lib/market-symbol";

interface StockChartProps {
  ticker: string;
  exchange?: string;
  isin?: string;
  purchasePrice?: number;
  displayCurrency: string;
}

const PERIOD_LABELS: Record<TimePeriod, string> = {
  "1d": "period1d",
  "1w": "period1w",
  "1m": "period1m",
  "3m": "period3m",
  "6m": "period6m",
  "1y": "period1y",
  "all": "periodAll",
};

const PERIOD_KEYS: TimePeriod[] = ["1w", "1m", "3m", "6m", "1y", "all"];

function ChartTooltip({ active, payload, displayCurrency }: { active?: boolean; payload?: Array<{ payload: HistoricalDataPoint }>; displayCurrency: string }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 shadow-lg">
      <p className="text-xs text-gray-400 dark:text-slate-500">{point.date}</p>
      <p className="text-sm font-semibold text-gray-900 dark:text-white">
        {formatCurrency(point.close, displayCurrency)}
      </p>
    </div>
  );
}

export default function StockChart({
  ticker,
  exchange = "",
  isin = "",
  purchasePrice,
  displayCurrency,
}: StockChartProps) {
  const fetchSymbol = marketDataSymbolForHolding({ ticker, exchange, isin });
  const showExchangeHint =
    isTickerExchangeCollision(ticker, exchange) && !isin.trim();
  const [rawData, setRawData] = useState<HistoricalDataPoint[]>([]);
  const [period, setPeriod] = useState<TimePeriod>("3m");
  const [loading, setLoading] = useState(true);
  const { t } = useI18n();
  const { quotes, exchangeRates } = usePortfolio();
  const { getApiHeaders } = useSettings();
  const { isDark } = useTheme();

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

  const data = useMemo(
    () => rawData.map((d) => ({
      ...d,
      close: convertPrice(d.close),
      open: convertPrice(d.open),
      high: convertPrice(d.high),
      low: convertPrice(d.low),
    })),
    [rawData, convertPrice]
  );

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ symbol: fetchSymbol, period });
      const headers = getApiHeaders();
      const res = await fetch(`/api/historical?${params}`, { headers });
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setRawData(json.data);
        } else {
          setRawData(json);
        }
      }
    } catch {
      setRawData([]);
    } finally {
      setLoading(false);
    }
  }, [fetchSymbol, period, getApiHeaders]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const firstPrice = data.length > 0 ? data[0].close : 0;
  const lastPrice = data.length > 0 ? data[data.length - 1].close : 0;
  const refPrice = purchasePrice ?? firstPrice;
  const isAboveRef = lastPrice >= refPrice;
  const chartColor = purchasePrice != null
    ? (isAboveRef ? "#10b981" : "#ef4444")
    : (lastPrice >= firstPrice ? "#10b981" : "#ef4444");

  const tickFill = isDark ? "#94a3b8" : "#9ca3af";
  const axisStroke = isDark ? "#334155" : "#e5e7eb";

  const formatDate = useCallback((date: string) => {
    const d = new Date(date);
    if (period === "all" || period === "1y") {
      return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    }
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }, [period]);

  const tooltipContent = useMemo(
    () => <ChartTooltip displayCurrency={displayCurrency} />,
    [displayCurrency]
  );

  return (
    <div>
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span className="text-sm text-gray-500 dark:text-slate-400 mr-2">{t("priceHistory")}:</span>
        {PERIOD_KEYS.map((key) => (
          <button
            key={key}
            onClick={() => setPeriod(key)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
              period === key
                ? "bg-emerald-500 text-white shadow-sm"
                : "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600"
            }`}
          >
            {t(PERIOD_LABELS[key] as Parameters<typeof t>[0])}
          </button>
        ))}
        {needsConversion && (
          <span className="text-xs text-amber-600 dark:text-amber-400 ml-2">
            (converted to {displayCurrency})
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center" style={{ aspectRatio: "2.8/1", maxHeight: "min(300px, 45vh)" }}>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
        </div>
      ) : data.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center gap-2 px-4 text-center text-gray-400 dark:text-slate-500"
          style={{ aspectRatio: "2.8/1", maxHeight: "min(300px, 45vh)" }}
        >
          <p>{t("chartNoData")}</p>
          {showExchangeHint && (
            <p className="text-xs text-amber-600 dark:text-amber-400 max-w-md">
              {t("chartTickerExchangeHint")}
            </p>
          )}
        </div>
      ) : (
        <div role="img" aria-label="Stock price chart" style={{ aspectRatio: "2.8/1", maxHeight: "min(300px, 45vh)" }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <defs>
              <linearGradient id={`gradient-${ticker}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartColor} stopOpacity={0.15} />
                <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              tick={{ fill: tickFill, fontSize: 11 }}
              axisLine={{ stroke: axisStroke }}
              tickLine={false}
              minTickGap={40}
            />
            <YAxis
              domain={["auto", "auto"]}
              tick={{ fill: tickFill, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={60}
              tickFormatter={(v: number) => v.toFixed(0)}
            />
            <Tooltip content={tooltipContent} />
            {purchasePrice != null && (
              <ReferenceLine
                y={purchasePrice}
                stroke="#f59e0b"
                strokeDasharray="6 4"
                strokeWidth={1.5}
                label={{
                  value: t("purchaseLine"),
                  fill: "#f59e0b",
                  fontSize: 11,
                  position: "insideTopRight",
                }}
              />
            )}
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
        </div>
      )}
    </div>
  );
}
