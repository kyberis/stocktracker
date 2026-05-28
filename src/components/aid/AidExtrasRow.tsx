"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { usePortfolio } from "@/lib/portfolio-context";
import { useStealthMode } from "@/lib/stealth-context";
import { computeAllocationByType } from "@/lib/portfolio-summary";
import {
  computeEstimatedDividends,
  computeEstimatedYield,
  computeTotalEstimatedEUR,
} from "@/lib/services/dividend-calculator";
import { computeTypeAllocationDrifts } from "@/lib/aid/allocation-drift";
import { computeTopHoldingsConcentration } from "@/lib/aid/concentration";
import { formatCurrency, formatPercent } from "@/lib/utils";
import type { CashEntry, Holding, PriceAlert, RebalanceTarget } from "@/lib/types";

interface Props {
  holdings: Holding[];
  cashEntries: CashEntry[];
}

const AID_FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--background)]";

function Tile({
  title,
  children,
  href,
  ariaLabel,
}: {
  title: string;
  children: React.ReactNode;
  href?: string;
  ariaLabel?: string;
}) {
  const inner = (
    <>
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--muted)]">{title}</h3>
      {children}
    </>
  );

  const className =
    `card flex min-h-[88px] flex-col rounded-[var(--radius-card)] p-3 transition-colors hover:border-emerald-500/20 ${AID_FOCUS}`;

  if (href) {
    return (
      <Link href={href} className={className} aria-label={ariaLabel ?? title}>
        {inner}
      </Link>
    );
  }

  return <div className={className}>{inner}</div>;
}

export default function AidExtrasRow({ holdings, cashEntries }: Props) {
  const { t } = useI18n();
  const { quotes, exchangeRates, activePortfolioCurrency, activePortfolioId, alertedTickers } = usePortfolio();
  const { stealthMode } = useStealthMode();
  const [targets, setTargets] = useState<RebalanceTarget[]>([]);
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [alertsDisabled, setAlertsDisabled] = useState(false);
  const [eventCount, setEventCount] = useState(0);
  const [eventHint, setEventHint] = useState("");

  useEffect(() => {
    fetch("/api/rebalance-targets", { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setTargets(Array.isArray(data) ? data : []))
      .catch(() => setTargets([]));
  }, []);

  useEffect(() => {
    fetch("/api/alerts", { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { alerts: [] }))
      .then((data) => {
        setAlertsDisabled(Boolean(data.disabled));
        setAlerts(Array.isArray(data.alerts) ? data.alerts : []);
      })
      .catch(() => {
        setAlerts([]);
        setAlertsDisabled(false);
      });
  }, []);

  useEffect(() => {
    const from = new Date().toISOString().slice(0, 10);
    const toDate = new Date();
    toDate.setDate(toDate.getDate() + 7);
    const to = toDate.toISOString().slice(0, 10);
    const params = new URLSearchParams({ from, to, holdings_only: "true", type: "earnings,economic" });
    if (activePortfolioId) params.set("portfolioId", activePortfolioId);

    fetch(`/api/events?${params}`, { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { events: [] }))
      .then((data) => {
        const events = Array.isArray(data.events) ? data.events : [];
        setEventCount(events.length);
        const hint = events
          .slice(0, 2)
          .map((ev: { title?: string; symbol?: string; type?: string }) => ev.symbol ?? ev.title ?? ev.type ?? "")
          .filter(Boolean)
          .join(" · ");
        setEventHint(hint);
      })
      .catch(() => {
        setEventCount(0);
        setEventHint("");
      });
  }, [activePortfolioId]);

  const movers = useMemo(() => {
    return holdings
      .map((h) => ({
        ticker: h.ticker,
        pct: quotes[h.ticker]?.regularMarketChangePercent ?? null,
      }))
      .filter((m) => m.pct != null)
      .sort((a, b) => Math.abs(b.pct!) - Math.abs(a.pct!))
      .slice(0, 2);
  }, [holdings, quotes]);

  const allocation = useMemo(
    () => computeAllocationByType(holdings, cashEntries, quotes, exchangeRates, activePortfolioCurrency),
    [holdings, cashEntries, quotes, exchangeRates, activePortfolioCurrency],
  );

  const drifts = useMemo(() => computeTypeAllocationDrifts(allocation, targets).slice(0, 2), [allocation, targets]);

  const concentration = useMemo(
    () => computeTopHoldingsConcentration(holdings, cashEntries, quotes, exchangeRates, activePortfolioCurrency),
    [holdings, cashEntries, quotes, exchangeRates, activePortfolioCurrency],
  );

  const dividendSummary = useMemo(() => {
    const estimated = computeEstimatedDividends(holdings, quotes, exchangeRates);
    const monthTotal = computeTotalEstimatedEUR(estimated);
    const portfolioYield = computeEstimatedYield(holdings, quotes, exchangeRates, monthTotal);
    return { monthTotal, portfolioYield };
  }, [holdings, quotes, exchangeRates]);

  const triggeredAlerts = useMemo(
    () => alerts.filter((a) => a.active && (a.triggered || alertedTickers.has(a.ticker))),
    [alerts, alertedTickers],
  );

  const activeAlertCount = alerts.filter((a) => a.active).length;
  const fmt = (v: number) => (stealthMode ? "•••" : formatCurrency(v, activePortfolioCurrency));

  if (holdings.length === 0 && cashEntries.length === 0) return null;

  return (
    <section className="card rounded-[var(--radius-card)] p-4" aria-label={t("aidExtrasTitle")}>
      <h2 className="mb-3 text-sm font-semibold text-[color:var(--foreground)]">{t("aidExtrasTitle")}</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {movers.length > 0 && (
          <Tile title={t("aidPreviewMovers")}>
            <ul className="space-y-1 text-xs">
              {movers.map((m) => (
                <li key={m.ticker} className="flex justify-between gap-2">
                  <span className="font-medium">{m.ticker}</span>
                  <span
                    className={`tabular-nums font-semibold ${
                      (m.pct ?? 0) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"
                    }`}
                  >
                    {stealthMode ? "•••" : `${(m.pct ?? 0) >= 0 ? "+" : ""}${formatPercent(m.pct ?? 0)}`}
                  </span>
                </li>
              ))}
            </ul>
          </Tile>
        )}

        {drifts.length > 0 && (
          <Tile title={t("aidVsTargetTile")} href="/?tab=diversification" ariaLabel={t("aidOpenDiversification")}>
            <p className="text-sm font-semibold tabular-nums text-[color:var(--foreground)]">
              {stealthMode
                ? "•••"
                : `${drifts[0].label} ${drifts[0].driftPercent >= 0 ? "+" : ""}${drifts[0].driftPercent.toFixed(0)} pp`}
            </p>
            {drifts[1] && (
              <p className="mt-1 text-[10px] text-[color:var(--muted)]">
                {stealthMode
                  ? "•••"
                  : `${drifts[1].label} ${drifts[1].driftPercent >= 0 ? "+" : ""}${drifts[1].driftPercent.toFixed(0)} pp · ${t("aidRebalanceHint")}`}
              </p>
            )}
          </Tile>
        )}

        <Tile title={t("aidEventsNext7")} href="/?tab=events" ariaLabel={t("aidOpenEvents")}>
          <p className="text-sm font-semibold text-[color:var(--foreground)]">
            {eventCount} {t("aidEventsCountLabel")}
          </p>
          {eventHint && <p className="mt-1 truncate text-[10px] text-[color:var(--muted)]">{eventHint}</p>}
        </Tile>

        <Tile title={t("aidPreviewAlerts")} href="/tools?tab=alerts" ariaLabel={t("aidOpenAlerts")}>
          {alertsDisabled ? (
            <p className="text-xs text-[color:var(--muted)]">{t("aidAlertsDisabled")}</p>
          ) : (
            <>
              <p className="text-sm font-semibold text-[color:var(--foreground)]">
                {triggeredAlerts.length > 0
                  ? t("aidAlertsTriggered").replace("{n}", String(triggeredAlerts.length))
                  : activeAlertCount > 0
                    ? t("aidAlertsActive").replace("{n}", String(activeAlertCount))
                    : t("aidAlertsNone")}
              </p>
              {triggeredAlerts[0] && (
                <p className="mt-1 truncate text-[10px] text-amber-700 dark:text-amber-300">
                  {triggeredAlerts[0].ticker || t("aidPortfolioWideAlert")}
                </p>
              )}
            </>
          )}
        </Tile>

        {dividendSummary.monthTotal > 0 && (
          <Tile title={t("aidDivThisMonth")} href="/?tab=dividends" ariaLabel={t("aidDivOpenFull")}>
            <p className="text-sm font-semibold tabular-nums text-[color:var(--foreground)]">{fmt(dividendSummary.monthTotal / 12)}</p>
            <p className="mt-1 text-[10px] text-[color:var(--muted)]">
              {stealthMode ? "•••" : `${t("aidDivPortfolioYield")}: ${formatPercent(dividendSummary.portfolioYield)}`}
            </p>
          </Tile>
        )}

        {concentration.topThreePercent > 0 && (
          <Tile title={t("aidConcentration")}>
            <p className="text-sm font-semibold tabular-nums text-[color:var(--foreground)]">
              {stealthMode ? "•••" : `${t("aidTop3Label")} = ${concentration.topThreePercent.toFixed(0)}%`}
            </p>
            {concentration.topTickers.length > 0 && (
              <p className="mt-1 truncate text-[10px] text-[color:var(--muted)]">
                {concentration.topTickers.join(" · ")}
              </p>
            )}
          </Tile>
        )}
      </div>
    </section>
  );
}
