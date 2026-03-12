"use client";

import { useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n";
import { useTickerBar, BIG_MOVE_THRESHOLD, type QuoteSnapshot } from "@/lib/hooks/use-ticker-bar";
import { getTickerMarketStatuses, type TickerMarketStatus } from "@/lib/market-hours";

interface Props {
  demoMode?: boolean;
}

function formatUsd(price: number, decimals = 2): string {
  return price.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function ChangePercent({ value }: { value: number | null }) {
  if (value == null) return null;
  return (
    <span className={`ml-1 tabular-nums ${value >= 0 ? "text-emerald-400" : "text-red-400"}`}>
      {value >= 0 ? "+" : ""}{value.toFixed(2)}%
    </span>
  );
}

function TickerDivider() {
  return <span className="text-slate-600 mx-2.5 select-none" aria-hidden="true">|</span>;
}

function MarketDot({ isOpen }: { isOpen: boolean }) {
  return (
    <span
      className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${
        isOpen
          ? "bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.6)] animate-live-pulse"
          : "bg-slate-500"
      }`}
      aria-hidden="true"
    />
  );
}

function isBigMove(changePercent: number | null): boolean {
  return changePercent != null && Math.abs(changePercent) >= BIG_MOVE_THRESHOLD;
}

function QuoteItem({ label, price, decimals = 2, snapshot }: { label: string; price?: string; decimals?: number; snapshot?: QuoteSnapshot }) {
  const displayPrice = price ?? (snapshot?.price != null ? formatUsd(snapshot.price, decimals) : "—");
  const change = snapshot?.changePercent ?? null;
  const big = isBigMove(change);
  const glowBg = big
    ? change! >= 0 ? "bg-emerald-500/15" : "bg-red-500/15"
    : "";
  return (
    <span className={`inline-flex items-center ${big ? `${glowBg} rounded px-1 animate-big-move-pulse` : ""}`}>
      <span className={`mr-1 ${big ? "text-white" : "text-slate-400"}`}>{label}</span>
      <span className="text-slate-200 font-medium tabular-nums">{displayPrice}</span>
      <ChangePercent value={change} />
    </span>
  );
}

function TickerContent({
  eurUsd,
  btcPriceUsd,
  btcChange24h,
  gold,
  silver,
  sp500,
  oil,
  markets,
  t,
}: {
  eurUsd: number | null;
  btcPriceUsd: number | null;
  btcChange24h: number | null;
  gold: QuoteSnapshot;
  silver: QuoteSnapshot;
  sp500: QuoteSnapshot;
  oil: QuoteSnapshot;
  markets: TickerMarketStatus[];
  t: (key: string) => string;
}) {
  return (
    <span className="inline-flex items-center whitespace-nowrap">
      {/* EUR/USD */}
      <span className="inline-flex items-center">
        <span className="text-slate-400 mr-1">{t("tickerEurUsd")}</span>
        <span className="text-slate-200 font-medium tabular-nums">
          {eurUsd != null ? eurUsd.toFixed(4) : "—"}
        </span>
      </span>

      <TickerDivider />

      {/* BTC */}
      {(() => {
        const big = isBigMove(btcChange24h);
        const glowBg = big
          ? btcChange24h! >= 0 ? "bg-emerald-500/15" : "bg-red-500/15"
          : "";
        return (
          <span className={`inline-flex items-center ${big ? `${glowBg} rounded px-1 animate-big-move-pulse` : ""}`}>
            <span className={`mr-1 ${big ? "text-white" : "text-slate-400"}`}>{t("tickerBtc")}</span>
            <span className="text-slate-200 font-medium tabular-nums">
              {btcPriceUsd != null ? formatUsd(btcPriceUsd, 0) : "—"}
            </span>
            <ChangePercent value={btcChange24h} />
          </span>
        );
      })()}

      <TickerDivider />

      <QuoteItem label={t("tickerGold")} snapshot={gold} />
      <TickerDivider />
      <QuoteItem label={t("tickerSilver")} snapshot={silver} />
      <TickerDivider />
      <QuoteItem label={t("tickerSp500")} snapshot={sp500} decimals={0} />
      <TickerDivider />
      <QuoteItem label={t("tickerOil")} snapshot={oil} />

      <TickerDivider />

      {/* Markets */}
      {markets.map((m, i) => (
        <span key={m.id} className="inline-flex items-center">
          <MarketDot isOpen={m.isOpen} />
          <span className={m.isOpen ? "text-slate-200" : "text-slate-500"}>
            {m.shortName}
          </span>
          {i < markets.length - 1 && <span className="text-slate-700 mx-2 select-none" aria-hidden="true">&middot;</span>}
        </span>
      ))}
    </span>
  );
}

export default function MarketTickerBar({ demoMode = false }: Props) {
  const { t } = useI18n();
  const { eurUsd, btcPriceUsd, btcChange24h, gold, silver, sp500, oil, loading } = useTickerBar(demoMode);
  const [markets, setMarkets] = useState<TickerMarketStatus[]>(() => getTickerMarketStatuses());

  useEffect(() => {
    const id = window.setInterval(() => setMarkets(getTickerMarketStatuses()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  if (loading) {
    return (
      <div className="bg-slate-950 dark:bg-black border-b border-slate-800 h-7 sticky top-0 z-50" />
    );
  }

  const contentProps = { eurUsd, btcPriceUsd, btcChange24h, gold, silver, sp500, oil, markets, t };

  return (
    <div
      className="bg-slate-950 dark:bg-black border-b border-slate-800 h-7 overflow-hidden sticky top-0 z-50"
      role="marquee"
      aria-label={t("tickerMarketLabel")}
    >
      <div className="h-full flex items-center font-mono text-[11px] leading-none ticker-scroll-container">
        <div className="ticker-scroll-track inline-flex items-center">
          <TickerContent {...contentProps} />
          <TickerDivider />
          <TickerContent {...contentProps} />
          <TickerDivider />
        </div>
      </div>
    </div>
  );
}
