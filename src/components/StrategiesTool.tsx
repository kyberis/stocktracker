"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { useSettings } from "@/lib/settings-context";
import { formatCurrency, formatCompactNumber } from "@/lib/utils";
import TierFeatureBadge from "@/components/TierFeatureBadge";
import ProCompareCard from "@/components/ProCompareCard";
import { useTrack } from "@/lib/use-track";
import { useAlerts } from "@/lib/hooks/use-api";
import { usePortfolio } from "@/lib/portfolio-context";
import type {
  SearchResult,
  QuoteData,
  MoatEvaluation,
  NotificationChannel,
  CompanyOverview,
  InvestmentStrategy,
} from "@/lib/types";

export default function StrategiesTool() {
  const { t } = useI18n();
  const { getApiHeaders } = useSettings();
  const track = useTrack();
  const { mutate: mutateAlerts } = useAlerts();
  const { refreshAlertedTickers } = usePortfolio();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<SearchResult | null>(null);

  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [evaluation, setEvaluation] = useState<MoatEvaluation | null>(null);
  const [moatLoading, setMoatLoading] = useState(false);
  const [moatUpgrade, setMoatUpgrade] = useState(false);

  const [purchasePrice, setPurchasePrice] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  const [channelsPreview, setChannelsPreview] = useState<NotificationChannel[]>([]);
  const [savedStrategies, setSavedStrategies] = useState<InvestmentStrategy[]>([]);
  const [loadedStrategy, setLoadedStrategy] = useState<InvestmentStrategy | null>(null);

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshSavedStrategies = useCallback(() => {
    fetch("/api/strategies", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { strategies?: InvestmentStrategy[] } | null) => {
        if (d?.strategies) setSavedStrategies(d.strategies);
      })
      .catch(() => {});
  }, []);

  const searchStocks = useCallback(
    async (q: string) => {
      if (q.length < 1) {
        setResults([]);
        return;
      }
      setSearching(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { headers: getApiHeaders() });
        if (res.ok) setResults(await res.json());
      } finally {
        setSearching(false);
      }
    },
    [getApiHeaders]
  );

  useEffect(() => {
    fetch("/api/notifications/preferences", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.alertChannels) setChannelsPreview(d.alertChannels as NotificationChannel[]);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshSavedStrategies();
  }, [refreshSavedStrategies]);

  useEffect(() => {
    if (!selected) {
      setLoadedStrategy(null);
      return;
    }
    let cancelled = false;
    const sym = selected.symbol;
    const ex = selected.exchange;
    fetch(
      `/api/strategies?symbol=${encodeURIComponent(sym)}&exchange=${encodeURIComponent(ex)}`,
      { cache: "no-store" }
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { strategy: InvestmentStrategy | null } | null) => {
        if (cancelled || !d) return;
        if (d.strategy) {
          const s = d.strategy;
          setLoadedStrategy(s);
          setPurchasePrice(s.purchasePrice > 0 ? String(s.purchasePrice) : "");
          setTargetPrice(s.targetPrice > 0 ? s.targetPrice.toFixed(2) : "");
          setStopLoss(s.stopLossPrice > 0 ? s.stopLossPrice.toFixed(2) : "");
        } else {
          setLoadedStrategy(null);
        }
      })
      .catch(() => {
        if (!cancelled) setLoadedStrategy(null);
      });
    return () => {
      cancelled = true;
    };
  }, [selected]);

  useEffect(() => {
    if (!selected) {
      setQuote(null);
      setEvaluation(null);
      setMoatUpgrade(false);
      return;
    }

    let cancelled = false;
    setQuoteLoading(true);
    setMoatLoading(true);
    setEvaluation(null);
    setMoatUpgrade(false);

    const sym = selected.symbol;
    const headers = getApiHeaders();

    (async () => {
      try {
        const [qRes, eRes] = await Promise.all([
          fetch(`/api/quote?symbols=${encodeURIComponent(sym)}`, { headers }),
          fetch(`/api/stock-evaluation?symbol=${encodeURIComponent(sym)}`),
        ]);

        if (cancelled) return;

        if (qRes.ok) {
          const data = (await qRes.json()) as Record<string, QuoteData & { error?: boolean }>;
          const q =
            data[sym] ??
            data[sym.toUpperCase()] ??
            data[Object.keys(data)[0] ?? ""] ??
            null;
          setQuote(q && !q.error && q.regularMarketPrice > 0 ? q : null);
        } else {
          setQuote(null);
        }

        if (eRes.ok) {
          const ev = (await eRes.json()) as MoatEvaluation;
          setEvaluation(ev);
          setMoatUpgrade(false);
        } else {
          setEvaluation(null);
          setMoatUpgrade(eRes.status === 403);
        }
      } catch {
        if (!cancelled) {
          setQuote(null);
          setEvaluation(null);
        }
      } finally {
        if (!cancelled) {
          setQuoteLoading(false);
          setMoatLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selected, getApiHeaders]);

  /** Prefill target from analyst consensus when no saved strategy target is present. */
  useEffect(() => {
    if (!evaluation) return;
    if (loadedStrategy && loadedStrategy.targetPrice > 0) return;
    const ov = evaluation.overview as unknown as CompanyOverview | undefined;
    const atp = ov?.analystTargetPrice;
    if (atp == null || atp <= 0) return;
    setTargetPrice((prev) => (prev === "" ? atp.toFixed(2) : prev));
  }, [evaluation, loadedStrategy]);

  const handleQueryChange = (val: string) => {
    setQuery(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => searchStocks(val), 300);
  };

  const handleSelectStock = (r: SearchResult) => {
    setSelected(r);
    setQuery("");
    setResults([]);
    setPurchasePrice("");
    setTargetPrice("");
    setStopLoss("");
    setFormError("");
    setFormSuccess("");
  };

  const currency = quote?.currency || "USD";

  const createThresholdAlert = useCallback(
    async (
      condition: "above" | "below",
      threshold: number
    ): Promise<{ ok: boolean; alertId?: string }> => {
      if (!selected) return { ok: false };
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker: selected.symbol,
          name: selected.shortname,
          condition,
          threshold,
          currency,
          alertType: "threshold",
          source: "strategies-tool",
        }),
      });
      if (!res.ok) return { ok: false };
      const data = (await res.json().catch(() => null)) as { alert?: { id: string } } | null;
      return { ok: true, alertId: data?.alert?.id };
    },
    [selected, currency]
  );

  const handleSubmit = () => {
    setFormError("");
    setFormSuccess("");
    const parseNum = (s: string) => parseFloat(s.replace(",", "."));
    const tp = parseNum(targetPrice);
    const sl = parseNum(stopLoss);
    const pp = parseNum(purchasePrice);
    const hasTp = !isNaN(tp) && tp > 0;
    const hasSl = !isNaN(sl) && sl > 0;
    if (!selected) {
      setFormError(t("strategiesSelectStock"));
      return;
    }
    if (!hasTp && !hasSl) {
      setFormError(t("strategiesValidationTargets"));
      return;
    }

    setSubmitting(true);
    (async () => {
      try {
        let targetAlertId = "";
        let stopAlertId = "";
        let targetOk = true;
        let stopOk = true;
        if (hasTp) {
          const r = await createThresholdAlert("above", tp);
          targetOk = r.ok;
          if (r.alertId) targetAlertId = r.alertId;
        }
        if (hasSl) {
          const r = await createThresholdAlert("below", sl);
          stopOk = r.ok;
          if (r.alertId) stopAlertId = r.alertId;
        }
        const allAlertsOk = (!hasTp || targetOk) && (!hasSl || stopOk);
        const anyAlertOk = (hasTp && targetOk) || (hasSl && stopOk);

        if (allAlertsOk) {
          const saveRes = await fetch("/api/strategies", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ticker: selected.symbol,
              exchange: selected.exchange,
              name: selected.shortname,
              purchasePrice: !isNaN(pp) && pp > 0 ? pp : 0,
              currency,
              targetPrice: hasTp ? tp : 0,
              stopLossPrice: hasSl ? sl : 0,
              targetAlertId,
              stopAlertId,
            }),
          });
          if (saveRes.ok) {
            const saved = (await saveRes.json().catch(() => null)) as { strategy?: InvestmentStrategy } | null;
            if (saved?.strategy) setLoadedStrategy(saved.strategy);
            refreshSavedStrategies();
          }
          setFormSuccess(t("strategiesAlertsCreated"));
          track("strategies_alerts_created", { ticker: selected.symbol });
          mutateAlerts();
          refreshAlertedTickers();
        } else if (anyAlertOk) {
          setFormError(t("strategiesAlertsPartial"));
          mutateAlerts();
          refreshAlertedTickers();
        } else {
          setFormError(t("strategiesAlertsPartial"));
        }
      } catch {
        setFormError(t("strategiesLoadError"));
      }
      setSubmitting(false);
    })();
  };

  const handleOpenSaved = (s: InvestmentStrategy) => {
    handleSelectStock({
      symbol: s.ticker,
      shortname: s.name || s.ticker,
      exchange: s.exchange,
      quoteType: "EQUITY",
    });
  };

  const handleDeleteSaved = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    fetch(`/api/strategies?id=${encodeURIComponent(id)}`, { method: "DELETE" }).then((r) => {
      if (r.ok) {
        refreshSavedStrategies();
        if (loadedStrategy?.id === id) setLoadedStrategy(null);
      }
    });
  };

  const v = evaluation?.valuation;
  const overview = evaluation?.overview as unknown as CompanyOverview | undefined;
  const analystConsensusTarget =
    overview?.analystTargetPrice != null && overview.analystTargetPrice > 0
      ? overview.analystTargetPrice
      : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-bold text-gray-900 dark:text-white">{t("strategiesNav")}</h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{t("toolDescStrategies")}</p>
      </div>

      {savedStrategies.length > 0 && (
        <div className="card px-4 py-3">
          <h2 className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-2">
            {t("strategiesSavedTitle")}
          </h2>
          <ul className="flex flex-wrap gap-2">
            {savedStrategies.map((s) => (
              <li key={s.id} className="inline-flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleOpenSaved(s)}
                  className="text-xs font-medium px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-200 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
                >
                  {s.ticker}
                  {s.targetPrice > 0 ? (
                    <span className="text-gray-500 dark:text-slate-400 ml-1 tabular-nums">
                      → {formatCurrency(s.targetPrice, s.currency)}
                    </span>
                  ) : null}
                </button>
                <button
                  type="button"
                  onClick={(e) => handleDeleteSaved(s.id, e)}
                  className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-500/10"
                  aria-label={t("strategiesDeleteSaved")}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Search */}
      <div className="card px-4 py-4 space-y-3">
        <label htmlFor="strategy-search" className="block text-xs font-medium text-gray-500 dark:text-slate-400">
          {t("search")}
        </label>
        <div className="relative">
          <input
            id="strategy-search"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder={t("moatEvalSearchPlaceholder")}
            autoComplete="off"
            className="w-full text-sm bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2"
          />
          {searching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-500" />
            </div>
          )}
        </div>
        {results.length > 0 && (
          <ul
            className="border border-gray-200 dark:border-slate-600 rounded-lg divide-y divide-gray-100 dark:divide-slate-700 max-h-48 overflow-y-auto"
            role="listbox"
          >
            {results.map((r) => (
              <li key={`${r.symbol}-${r.exchange}`} role="option">
                <button
                  type="button"
                  onClick={() => handleSelectStock(r)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <span className="font-medium text-gray-900 dark:text-white">{r.shortname}</span>
                  <span className="text-gray-500 dark:text-slate-400 text-xs ml-2">
                    {r.symbol} · {r.exchange}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {selected && (
        <>
          <div className="card px-4 py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{selected.shortname}</p>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  {selected.symbol} · {selected.exchange}
                </p>
              </div>
              {quoteLoading ? (
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-500" />
                </div>
              ) : quote && quote.regularMarketPrice > 0 ? (
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900 dark:text-white tabular-nums">
                    {formatCurrency(quote.regularMarketPrice, quote.currency)}
                  </p>
                  <p
                    className={`text-xs tabular-nums ${
                      quote.regularMarketChange >= 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {quote.regularMarketChange >= 0 ? "+" : ""}
                    {formatCurrency(quote.regularMarketChange, quote.currency)} (
                    {quote.regularMarketChangePercent >= 0 ? "+" : ""}
                    {quote.regularMarketChangePercent.toFixed(2)}%)
                  </p>
                </div>
              ) : (
                <p className="text-xs text-gray-500">{t("strategiesLoadError")}</p>
              )}
            </div>

            {quote && quote.regularMarketPrice > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
                <div className="bg-gray-50 dark:bg-slate-800 rounded-lg px-3 py-2">
                  <p className="text-[10px] text-gray-500 dark:text-slate-400">{t("week52High")}</p>
                  <p className="text-sm font-semibold tabular-nums">
                    {quote.fiftyTwoWeekHigh > 0
                      ? formatCurrency(quote.fiftyTwoWeekHigh, quote.currency)
                      : "—"}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-slate-800 rounded-lg px-3 py-2">
                  <p className="text-[10px] text-gray-500 dark:text-slate-400">{t("week52Low")}</p>
                  <p className="text-sm font-semibold tabular-nums">
                    {quote.fiftyTwoWeekLow > 0
                      ? formatCurrency(quote.fiftyTwoWeekLow, quote.currency)
                      : "—"}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-slate-800 rounded-lg px-3 py-2">
                  <p className="text-[10px] text-gray-500 dark:text-slate-400">{t("marketCap")}</p>
                  <p className="text-sm font-semibold">
                    {quote.marketCap && quote.marketCap > 0
                      ? formatCompactNumber(quote.marketCap)
                      : "—"}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-slate-800 rounded-lg px-3 py-2">
                  <p className="text-[10px] text-gray-500 dark:text-slate-400">{t("analystTarget")}</p>
                  <p className="text-sm font-semibold tabular-nums">
                    {analystConsensusTarget != null
                      ? formatCurrency(analystConsensusTarget, quote.currency)
                      : "—"}
                  </p>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-3 mt-4 text-xs">
              <Link
                href={`/analisis/${encodeURIComponent(selected.symbol)}?exchange=${encodeURIComponent(selected.exchange)}`}
                className="text-violet-600 dark:text-violet-400 font-medium hover:underline"
              >
                {t("strategiesOpenDetail")}
              </Link>
              <Link
                href={`/analisis/${encodeURIComponent(selected.symbol)}?tab=evaluation&exchange=${encodeURIComponent(selected.exchange)}`}
                className="text-violet-600 dark:text-violet-400 font-medium hover:underline inline-flex items-center gap-1"
              >
                {t("strategiesOpenMoat")}
                <TierFeatureBadge requiredPlan="pro" size="xs" />
              </Link>
            </div>
          </div>

          {/* Moat snapshot */}
          <div className="card px-4 py-4 space-y-3">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              {t("strategiesMoatSnapshot")}
              <TierFeatureBadge requiredPlan="pro" size="xs" />
            </h2>
            {moatLoading && (
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-emerald-500" />
              </div>
            )}
            {moatUpgrade && !moatLoading && (
              <div className="space-y-2">
                <p className="text-sm text-gray-600 dark:text-slate-400">{t("strategiesMoatUpgrade")}</p>
                <ProCompareCard surface="stock_detail_locked" reason="upgrade_required" />
              </div>
            )}
            {!moatLoading && !moatUpgrade && !evaluation && (
              <p className="text-xs text-gray-500 dark:text-slate-400">{t("moatEvalSearchNoResults")}</p>
            )}
            {!moatLoading && !moatUpgrade && v && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="bg-gray-50 dark:bg-slate-800 rounded-lg px-3 py-2">
                  <p className="text-[10px] text-gray-500 dark:text-slate-400">{t("moatEvalPE")}</p>
                  <p className="text-sm font-semibold tabular-nums">
                    {v.peRatio != null ? v.peRatio.toFixed(1) : "—"}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-slate-800 rounded-lg px-3 py-2">
                  <p className="text-[10px] text-gray-500 dark:text-slate-400">{t("moatEvalForwardPE")}</p>
                  <p className="text-sm font-semibold tabular-nums">
                    {v.forwardPE != null ? v.forwardPE.toFixed(1) : "—"}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-slate-800 rounded-lg px-3 py-2">
                  <p className="text-[10px] text-gray-500 dark:text-slate-400">{t("moatEvalPEG")}</p>
                  <p className="text-sm font-semibold tabular-nums">
                    {v.pegRatio != null ? v.pegRatio.toFixed(2) : "—"}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-slate-800 rounded-lg px-3 py-2">
                  <p className="text-[10px] text-gray-500 dark:text-slate-400">{t("moatEvalAugPayout")}</p>
                  <p className="text-sm font-semibold tabular-nums">
                    {v.augmentedPayoutRatio != null ? `${v.augmentedPayoutRatio.toFixed(0)}%` : "—"}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Plan + alerts */}
          <div className="card px-4 py-4 space-y-4">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">{t("strategiesPlanTitle")}</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="strategy-purchase" className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">
                  {t("strategiesPurchasePrice")}
                </label>
                <input
                  id="strategy-purchase"
                  type="number"
                  step="0.01"
                  min="0"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)}
                  className="w-full text-sm bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2"
                />
                <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-1">
                  {currency} — {t("strategiesPurchaseHint")}
                </p>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="strategy-target-price" className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">
                  {t("strategiesTargetPrice")}
                </label>
                <input
                  id="strategy-target-price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                  className="w-full text-sm bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2"
                />
                <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-1">{t("strategiesTargetPriceHint")}</p>
              </div>
              <div>
                <label htmlFor="strategy-sl" className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">
                  {t("strategiesStopLossOptional")}
                </label>
                <input
                  id="strategy-sl"
                  type="number"
                  step="0.01"
                  min="0"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(e.target.value)}
                  className="w-full text-sm bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2"
                />
                <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-1">{t("strategiesStopLossHint")}</p>
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-2">{t("strategiesNotifyLegend")}</p>
              <div className="flex flex-wrap gap-2">
                {(["email", "telegram", "push", "device"] as const).map((ch) => {
                  const enabled = channelsPreview.includes(ch);
                  const labelKey =
                    ch === "email"
                      ? "channelEmail"
                      : ch === "telegram"
                        ? "channelTelegram"
                        : ch === "push"
                          ? "channelPush"
                          : "channelDevice";
                  return (
                    <span
                      key={ch}
                      className={`text-[10px] px-2 py-0.5 rounded-md border ${
                        enabled
                          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                          : "border-gray-200 dark:border-slate-600 text-gray-400 dark:text-slate-500"
                      }`}
                    >
                      {t(labelKey)}
                    </span>
                  );
                })}
              </div>
              <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-2">
                {t("strategiesChannelsHint")}{" "}
                <Link href="/profile" className="text-emerald-600 dark:text-emerald-400 hover:underline">
                  {t("profile")}
                </Link>
              </p>
            </div>

            {formError && <p className="text-xs text-red-500">{formError}</p>}
            {formSuccess && <p className="text-xs text-emerald-600 dark:text-emerald-400">{formSuccess}</p>}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="btn-primary disabled:opacity-50"
            >
              {submitting ? t("loading") : t("strategiesCreateAlerts")}
            </button>

            <p className="text-[11px] text-gray-500 dark:text-slate-500">{t("strategiesDisclaimerShort")}</p>
          </div>
        </>
      )}
    </div>
  );
}
