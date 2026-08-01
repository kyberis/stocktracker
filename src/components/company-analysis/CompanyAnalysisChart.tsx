"use client";

import { useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme-context";
import {
  toTradingViewChartUrl,
  toTradingViewLocale,
  toTradingViewSymbol,
} from "@/lib/company-analysis/tradingview";
import { toYahooFinanceQuoteUrl } from "@/lib/market-symbol";

interface CompanyAnalysisChartProps {
  ticker: string;
  exchange?: string | null;
}

/**
 * TradingView advanced chart embed — matches the company-analysis HTML template
 * (weekly candles, 24M range, interactive toolbar).
 */
export default function CompanyAnalysisChart({
  ticker,
  exchange,
}: CompanyAnalysisChartProps) {
  const { t, language } = useI18n();
  const { isDark } = useTheme();

  const tvSymbol = useMemo(
    () => toTradingViewSymbol(ticker, exchange),
    [ticker, exchange],
  );
  const tradingViewUrl = useMemo(
    () => toTradingViewChartUrl(ticker, exchange),
    [ticker, exchange],
  );
  const yahooUrl = useMemo(
    () => toYahooFinanceQuoteUrl(ticker, exchange),
    [ticker, exchange],
  );

  const src = useMemo(() => {
    const params = new URLSearchParams({
      symbol: tvSymbol,
      interval: "W",
      theme: isDark ? "dark" : "light",
      style: "1",
      locale: toTradingViewLocale(language),
      toolbarbg: isDark ? "0F172A" : "F1F3F6",
      hideideas: "1",
      range: "24M",
      hidetoptoolbar: "0",
      hidesidetoolbar: "1",
      saveimage: "0",
      studies: "[]",
    });
    return `https://s.tradingview.com/widgetembed/?${params.toString()}`;
  }, [tvSymbol, isDark, language]);

  if (!tvSymbol) return null;

  const externalLinkClass =
    "font-medium text-[color:var(--foreground)] underline decoration-dotted underline-offset-2 hover:text-[color:var(--accent)]";

  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-3 sm:p-3.5">
        <iframe
          title={`${t("companyAnalysisChart")} ${ticker}`}
          src={src}
          className="block h-[400px] w-full rounded-lg border-0 sm:h-[520px]"
          loading="lazy"
          referrerPolicy="no-referrer"
          sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
          allowFullScreen
        />
      </div>
      <p className="text-xs text-[color:var(--muted)]">
        {t("companyAnalysisChartFallback")}{" "}
        <a
          href={tradingViewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={externalLinkClass}
        >
          TradingView
        </a>
        {" · "}
        <a
          href={yahooUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={externalLinkClass}
        >
          Yahoo Finance
        </a>
        .
      </p>
    </div>
  );
}
