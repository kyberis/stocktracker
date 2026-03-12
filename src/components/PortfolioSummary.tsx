"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePortfolio } from "@/lib/portfolio-context";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import { formatCurrency, formatPercent, formatStealthCurrency, hasExchangeRate, normalizeCurrency } from "@/lib/utils";
import { calculatePortfolioTotals, computeAllocationByType, type AllocationSlice } from "@/lib/portfolio-summary";
import { useStealthMode } from "@/lib/stealth-context";
import { PLATFORM_LIMITS } from "@/lib/platform-config";
import type { Holding, CashEntry } from "@/lib/types";
import PortfolioReviewCard from "./PortfolioReviewCard";
import { useTheme } from "@/lib/theme-context";

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function BrokerSyncDot() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [syncInfo, setSyncInfo] = useState<{
    connected: boolean;
    needsAttention: boolean;
    lastSyncedAt: string | null;
    brokerNames: string[];
  } | null>(null);

  useEffect(() => {
    const plan = user?.plan;
    if (!plan || plan === "free") return;

    const form = new FormData();
    form.append("action", "get-connection");
    fetch("/api/snaptrade", { method: "POST", body: form })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.connected) return;
        const names = (data.brokerSyncs || []).map((b: { brokerageName: string }) => b.brokerageName).filter(Boolean);
        setSyncInfo({
          connected: true,
          needsAttention: !!data.needsAttention,
          lastSyncedAt: data.lastSyncedAt || null,
          brokerNames: names,
        });
      })
      .catch(() => {});
  }, [user?.plan]);

  if (!syncInfo?.connected || syncInfo.needsAttention) return null;

  const timeAgo = syncInfo.lastSyncedAt ? formatTimeAgo(syncInfo.lastSyncedAt) : null;
  const brokerLabel = syncInfo.brokerNames.length > 0 ? `via ${syncInfo.brokerNames.join(", ")}` : null;

  return (
    <Link
      href="/import?method=snaptrade_api"
      className="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
      title={`${t("brokerSyncAutoSyncActive")}${timeAgo ? ` · ${t("brokerSyncLastSynced")}: ${timeAgo}` : ""}${brokerLabel ? ` · ${brokerLabel}` : ""}`}
    >
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
      </span>
      {timeAgo && (
        <span className="hidden sm:inline tabular-nums">
          {t("brokerSyncLastSynced")} {timeAgo}
        </span>
      )}
      {brokerLabel && (
        <span className="hidden lg:inline text-gray-400 dark:text-slate-500">{brokerLabel}</span>
      )}
    </Link>
  );
}

interface Props {
  holdings?: Holding[];
  cashEntries?: CashEntry[];
}

export default function PortfolioSummary({ holdings: holdingsProp, cashEntries: cashEntriesProp }: Props) {
  const { holdings: ctxHoldings, cashEntries: ctxCashEntries, quotes, exchangeRates, isLoading, activePortfolioCurrency } = usePortfolio();
  const holdings = holdingsProp ?? ctxHoldings;
  const cashEntries = cashEntriesProp ?? ctxCashEntries;
  const baseCurrency = activePortfolioCurrency;
  const { t } = useI18n();
  const { stealthMode } = useStealthMode();
  const { user } = useAuth();
  const { layoutTheme } = useTheme();
  const {
    totalCurrentEUR,
    totalCostEUR,
    dayGainLossEUR,
    totalGainLoss,
    totalGainLossPercent,
  } = calculatePortfolioTotals(holdings, cashEntries, quotes, exchangeRates, baseCurrency);

  const missingRateCurrencies = useMemo(() => {
    const missing = new Set<string>();
    for (const h of holdings) {
      const q = quotes[h.ticker];
      const cur = normalizeCurrency(q?.currency || h.displayCurrency || "USD");
      if (cur !== "EUR" && !hasExchangeRate(cur, exchangeRates)) missing.add(cur);
    }
    if (baseCurrency !== "EUR" && !hasExchangeRate(baseCurrency, exchangeRates)) missing.add(baseCurrency);
    return [...missing];
  }, [holdings, quotes, exchangeRates, baseCurrency]);

  const dayIsPositive = dayGainLossEUR >= 0;
  const dayPercent = totalCurrentEUR > 0
    ? (dayGainLossEUR / (totalCurrentEUR - dayGainLossEUR)) * 100
    : 0;

  const totalIsPositive = totalGainLoss >= 0;
  const holdingsCount = holdings.length + cashEntries.length;

  const isPro = user?.plan === "pro";
  const limit = PLATFORM_LIMITS.PORTFOLIO_REVIEW_MONTHLY_LIMIT;
  const used = user?.portfolioReviewCount ?? 0;
  const remaining = Math.max(0, limit - used);
  const hasHoldings = holdings.length > 0;

  const [reviewOpen, setReviewOpen] = useState(false);
  const [allocationOpen, setAllocationOpen] = useState(false);
  const allocationRef = useRef<HTMLDivElement>(null);

  const allocationSlices = useMemo(
    () => computeAllocationByType(holdings, cashEntries, quotes, exchangeRates, baseCurrency),
    [holdings, cashEntries, quotes, exchangeRates, baseCurrency],
  );

  useEffect(() => {
    if (!allocationOpen) return;
    function handleClick(e: MouseEvent) {
      if (allocationRef.current && !allocationRef.current.contains(e.target as Node)) {
        setAllocationOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setAllocationOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [allocationOpen]);

  const dayLabel = stealthMode ? "•••••" : `${dayIsPositive ? "+" : ""}${formatCurrency(dayGainLossEUR, baseCurrency)} (${formatPercent(dayPercent)})`;
  const valueLabel = formatStealthCurrency(totalCurrentEUR, baseCurrency, stealthMode);
  const costLabel = formatStealthCurrency(totalCostEUR, baseCurrency, stealthMode);

  const aiReviewBtn = isPro ? (
    <button
      onClick={() => setReviewOpen(!reviewOpen)}
      disabled={!hasHoldings || remaining <= 0}
      className="inline-flex items-center gap-1.5 text-xs font-medium text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 rounded"
    >
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
      </svg>
      AI Review
      <span className="tabular-nums text-gray-400 dark:text-slate-500">{used}/{limit}</span>
    </button>
  ) : (
    <a href="/billing" className="inline-flex items-center gap-1.5 text-xs font-medium text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 rounded">
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
      </svg>
      AI Review <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-300">Pro</span>
    </a>
  );

  const reviewPanel = reviewOpen ? (
    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700">
      <PortfolioReviewCard />
    </div>
  ) : null;

  const missingRateBanner = missingRateCurrencies.length > 0 ? (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 mb-3" role="alert">
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
      <span>{t("missingExchangeRate")}: <strong>{missingRateCurrencies.join(", ")}</strong></span>
    </div>
  ) : null;

  /* ── TERMINAL: Dense inline stats, no card wrapper ─────────── */
  if (layoutTheme === "terminal") {
    return (
      <div className="border-b border-zinc-800 py-2 relative" data-testid="portfolio-summary-terminal" data-tour="summary">
        {isLoading && <div className="absolute top-0 left-0 right-0 h-px bg-emerald-500/50 animate-progress-bar" />}
        <div className="flex items-baseline gap-4 flex-wrap font-mono">
          <span className={`text-xl font-semibold text-zinc-200 ${isLoading ? "animate-value-shimmer" : ""}`}>
            {valueLabel}
          </span>
          <span className={`text-sm px-1.5 py-0.5 rounded ${dayIsPositive ? "text-green-400 bg-green-500/10" : "text-red-400 bg-red-500/10"}`}>
            {dayIsPositive ? "▲" : "▼"} {dayLabel}
          </span>
          <span className="text-xs text-zinc-600">cost <b className="text-zinc-500">{costLabel}</b></span>
          <span className="text-xs text-zinc-600">gain <b className={totalIsPositive ? "text-green-400" : "text-red-400"}>{formatPercent(totalGainLossPercent)}</b></span>
          <span className="text-xs text-zinc-600">holdings <b className="text-zinc-500">{holdingsCount}</b></span>
          {aiReviewBtn}
          <BrokerSyncDot />
        </div>
        {allocationSlices.length > 0 && (
          <div className="flex gap-3 mt-1 text-xs text-zinc-600 font-mono">
            {allocationSlices.map((s) => (
              <span key={s.key} style={{ color: s.color }}>■ {s.label} {formatPercent(s.percent)}</span>
            ))}
          </div>
        )}
        {reviewPanel}
      </div>
    );
  }

  /* ── CANVAS: Big spacious card, large value, allocation bar ── */
  if (layoutTheme === "canvas") {
    return (
      <div className="bg-white border border-slate-200 rounded-[20px] p-7 shadow-sm relative" data-testid="portfolio-summary-canvas" data-tour="summary">
        {isLoading && <div className="absolute top-0 left-0 right-0 h-0.5 overflow-hidden rounded-t-[20px]"><div className="h-full w-1/3 bg-green-500/60 animate-progress-bar" /></div>}
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">{t("portfolioValue")}</p>
        <p className={`text-4xl font-bold text-slate-900 tracking-tight ${isLoading ? "animate-value-shimmer" : ""}`}>{valueLabel}</p>
        <div className="flex gap-2 mt-3">
          <span className={`text-sm font-semibold px-3 py-1 rounded-xl ${dayIsPositive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
            {dayIsPositive ? "▲" : "▼"} {dayLabel}
          </span>
          <span className={`text-sm font-semibold px-3 py-1 rounded-xl ${totalIsPositive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
            {formatPercent(totalGainLossPercent)} {t("totalGainLoss").toLowerCase()}
          </span>
        </div>
        <div className="flex gap-7 mt-5 pt-4 border-t border-slate-100 flex-wrap">
          <div><p className="text-xs text-slate-400 mb-0.5">{t("cost")}</p><p className="text-base font-semibold text-slate-700">{costLabel}</p></div>
          <div><p className="text-xs text-slate-400 mb-0.5">{t("totalGainLoss")}</p><p className={`text-base font-semibold ${totalIsPositive ? "text-green-600" : "text-red-500"}`}>{stealthMode ? "•••••" : `${totalIsPositive ? "+" : ""}${formatCurrency(totalGainLoss, baseCurrency)}`}</p></div>
          <div><p className="text-xs text-slate-400 mb-0.5">{t("holdings")}</p><p className="text-base font-semibold text-slate-700">{holdingsCount}</p></div>
        </div>
        {allocationSlices.length > 0 && (
          <>
            <div className="flex h-2 rounded-full overflow-hidden mt-4 bg-slate-100">
              {allocationSlices.map((s) => <div key={s.key} style={{ width: `${s.percent}%`, background: s.color }} />)}
            </div>
            <div className="flex gap-4 mt-2 flex-wrap text-xs text-slate-500">
              {allocationSlices.map((s) => <span key={s.key}><span style={{ color: s.color }}>●</span> {s.label} {formatPercent(s.percent)}</span>)}
            </div>
          </>
        )}
        <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-100">
          {aiReviewBtn}
          <BrokerSyncDot />
        </div>
        {reviewPanel}
      </div>
    );
  }

  /* ── STUDIO: Hero with gradient glow, embedded chart area ──── */
  if (layoutTheme === "studio") {
    return (
      <div className="relative rounded-[20px] p-7 border border-white/5 overflow-hidden" style={{ background: "linear-gradient(180deg, rgba(34,197,94,0.04) 0%, transparent 100%)" }} data-testid="portfolio-summary-studio" data-tour="summary">
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-emerald-500/[0.06] blur-2xl pointer-events-none" />
        {isLoading && <div className="absolute top-0 left-0 right-0 h-0.5 overflow-hidden rounded-t-[20px]"><div className="h-full w-1/3 bg-emerald-500/50 animate-progress-bar" /></div>}
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">{t("portfolioValue")}</p>
        <p className={`text-[42px] font-extrabold text-white tracking-tighter leading-none ${isLoading ? "animate-value-shimmer" : ""}`}>{valueLabel}</p>
        <div className="flex gap-2 mt-3">
          <span className={`font-mono text-xs font-semibold px-2.5 py-1 rounded-lg ${dayIsPositive ? "text-emerald-400 bg-emerald-500/10" : "text-red-400 bg-red-500/10"}`}>
            {dayIsPositive ? "▲" : "▼"} {dayLabel}
          </span>
          <span className={`font-mono text-xs font-semibold px-2.5 py-1 rounded-lg ${totalIsPositive ? "text-emerald-400 bg-emerald-500/10" : "text-red-400 bg-red-500/10"}`}>
            {formatPercent(totalGainLossPercent)} all time
          </span>
        </div>
        {/* Chart placeholder area */}
        <div className="w-full h-20 mt-5 rounded-lg" style={{ background: "linear-gradient(to top, transparent, rgba(34,197,94,0.04))" }} />
        <div className="flex gap-6 mt-4 pt-3 border-t border-white/5 flex-wrap">
          <div><p className="text-xs text-zinc-500">{t("cost")}</p><p className="text-sm font-bold font-mono text-zinc-300">{costLabel}</p></div>
          <div><p className="text-xs text-zinc-500">{t("totalGainLoss")}</p><p className={`text-sm font-bold font-mono ${totalIsPositive ? "text-emerald-400" : "text-red-400"}`}>{stealthMode ? "•••••" : `${totalIsPositive ? "+" : ""}${formatCurrency(totalGainLoss, baseCurrency)}`}</p></div>
          <div><p className="text-xs text-zinc-500">{t("holdings")}</p><p className="text-sm font-bold font-mono text-zinc-300">{holdingsCount}</p></div>
        </div>
        {allocationSlices.length > 0 && (
          <>
            <div className="flex h-1.5 rounded-full overflow-hidden mt-3 bg-white/[0.03]">
              {allocationSlices.map((s) => <div key={s.key} style={{ width: `${s.percent}%`, background: s.color }} />)}
            </div>
            <div className="flex gap-3 mt-1.5 flex-wrap text-xs text-zinc-500">
              {allocationSlices.map((s) => <span key={s.key}><span style={{ color: s.color }}>●</span> {s.label} {formatPercent(s.percent)}</span>)}
            </div>
          </>
        )}
        <div className="flex justify-between items-center mt-3 pt-2.5 border-t border-white/5">
          {aiReviewBtn}
          <BrokerSyncDot />
        </div>
        {reviewPanel}
      </div>
    );
  }

  /* ── DEFAULT: Current card layout (unchanged) ──────────────── */
  return (
    <div className="card px-5 py-4 relative" data-testid="portfolio-summary-default" data-tour="summary">
      {isLoading && (
        <div className="absolute top-0 left-0 right-0 h-0.5 overflow-hidden rounded-t-2xl">
          <div className="h-full w-1/3 bg-emerald-500/70 dark:bg-emerald-400/50 animate-progress-bar" />
        </div>
      )}
      {missingRateBanner}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <p
              className={`text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white ${isLoading ? "animate-value-shimmer" : ""}`}
              aria-label={stealthMode ? formatCurrency(totalCurrentEUR, baseCurrency) : undefined}
            >
              {valueLabel}
            </p>
            <p className="text-xs text-gray-400 dark:text-slate-500">
              {t("cost")}: <span aria-label={stealthMode ? formatCurrency(totalCostEUR, baseCurrency) : undefined}>{costLabel}</span>
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${
              dayIsPositive
                ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400"
            }`}
            aria-label={stealthMode ? `${formatCurrency(dayGainLossEUR, baseCurrency)} (${formatPercent(dayPercent)})` : undefined}
          >
            {dayLabel}
          </span>
        </div>

        <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-slate-400">
          <span className={`font-medium ${totalIsPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
            {formatPercent(totalGainLossPercent)} {t("totalGainLoss").toLowerCase()}
          </span>
          <span className="text-gray-300 dark:text-slate-600">·</span>
          <span>{holdingsCount} {t("holdings").toLowerCase()}</span>
          {allocationSlices.length > 0 && (
            <>
              <span className="text-gray-300 dark:text-slate-600">·</span>
              <div className="relative" ref={allocationRef}>
                <button
                  onClick={() => setAllocationOpen((v) => !v)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded"
                  aria-label={t("assetAllocation")}
                  title={t("assetAllocation")}
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
                    <path d="M22 12A10 10 0 0 0 12 2v10z" />
                  </svg>
                </button>
                {allocationOpen && (
                  <AllocationPopover slices={allocationSlices} title={t("assetAllocation")} stealthMode={stealthMode} baseCurrency={baseCurrency} />
                )}
              </div>
            </>
          )}
          <span className="text-gray-300 dark:text-slate-600">·</span>
          {aiReviewBtn}
          <BrokerSyncDot />
        </div>
      </div>
      {reviewPanel}
    </div>
  );
}

function getArc(startPct: number, endPct: number): string {
  const startAngle = (startPct / 100) * 2 * Math.PI - Math.PI / 2;
  const endAngle = (endPct / 100) * 2 * Math.PI - Math.PI / 2;
  const r = 40;
  const cx = 50, cy = 50;
  const x1 = cx + r * Math.cos(startAngle);
  const y1 = cy + r * Math.sin(startAngle);
  const x2 = cx + r * Math.cos(endAngle);
  const y2 = cy + r * Math.sin(endAngle);
  const largeArc = endPct - startPct > 50 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
}

function AllocationPopover({
  slices,
  title,
  stealthMode,
  baseCurrency,
}: {
  slices: AllocationSlice[];
  title: string;
  stealthMode: boolean;
  baseCurrency: string;
}) {
  let cumulative = 0;
  const segments = slices.map((s) => {
    const start = cumulative;
    cumulative += s.percent;
    return { ...s, start, end: cumulative };
  });

  return (
    <div className="absolute right-0 top-full mt-2 z-50 w-64 rounded-xl bg-white dark:bg-slate-800 shadow-xl ring-1 ring-gray-200 dark:ring-slate-700 p-4">
      <p className="text-xs font-semibold text-gray-700 dark:text-slate-200 mb-3">{title}</p>
      <div className="flex justify-center mb-3">
        <svg viewBox="0 0 100 100" className="w-28 h-28">
          {segments.map((seg, i) =>
            seg.percent > 0.1 ? (
              <path
                key={i}
                d={getArc(seg.start, seg.end)}
                fill="none"
                stroke={seg.color}
                strokeWidth="16"
                strokeLinecap="butt"
              />
            ) : null,
          )}
        </svg>
      </div>
      <div className="space-y-1.5">
        {slices.map((s) => (
          <div key={s.key} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
              <span className="text-gray-600 dark:text-slate-300">{s.label}</span>
            </div>
            <div className="flex items-center gap-2 tabular-nums">
              <span className="text-gray-500 dark:text-slate-400">
                {stealthMode ? "•••••" : formatCurrency(s.valueEUR, baseCurrency)}
              </span>
              <span className="font-medium text-gray-700 dark:text-slate-200 w-12 text-right">
                {formatPercent(s.percent)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
