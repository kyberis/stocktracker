"use client";

import { useMemo } from "react";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useI18n } from "@/lib/i18n";
import { txAmountToEUR } from "@/lib/performance";
import type { Transaction, ExchangeRates } from "@/lib/types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  currentValueEUR: number;
  totalInvestedEUR: number;
  exchangeRates: ExchangeRates;
  ttwror: number;
  irr: number | null;
}

interface TtwrorRow {
  date: string;
  type: "buy" | "sell";
  ticker: string;
  amountEUR: number;
  feesEUR: number;
  taxesEUR: number;
  flow: number;
  daysSinceStart: number;
  weight: number;
  weightedFlow: number;
}

interface IrrRow {
  date: string;
  type: string;
  ticker: string;
  amount: number;
  label: string;
}

const eur = (v: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v);

const pct = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;

export default function PerformanceExplainerModal({
  isOpen,
  onClose,
  transactions,
  currentValueEUR,
  totalInvestedEUR,
  exchangeRates,
  ttwror,
  irr,
}: Props) {
  const focusTrapRef = useFocusTrap(isOpen, onClose);
  const { t } = useI18n();

  const ttwrorData = useMemo(() => {
    const sorted = [...transactions]
      .filter((tx) => tx.type === "buy" || tx.type === "sell")
      .sort((a, b) => a.date.localeCompare(b.date));

    if (sorted.length === 0) return null;

    const firstDate = new Date(sorted[0].date).getTime();
    const today = Date.now();
    const totalDays = Math.max((today - firstDate) / 86400000, 1);

    let netCashFlow = 0;
    let weightedCashFlow = 0;

    const rows: TtwrorRow[] = sorted.map((tx) => {
      const amountEUR = txAmountToEUR(tx.totalAmount, tx, exchangeRates);
      const feesEUR = txAmountToEUR(tx.fees || 0, tx, exchangeRates);
      const taxesEUR = txAmountToEUR(tx.taxes || 0, tx, exchangeRates);

      const flow =
        tx.type === "buy"
          ? amountEUR + feesEUR + taxesEUR
          : -(amountEUR - feesEUR - taxesEUR);

      const txDate = new Date(tx.date).getTime();
      const daysSinceStart = Math.max((txDate - firstDate) / 86400000, 0);
      const weight = (totalDays - daysSinceStart) / totalDays;
      const wf = weight * flow;

      netCashFlow += flow;
      weightedCashFlow += wf;

      return {
        date: tx.date,
        type: tx.type as "buy" | "sell",
        ticker: tx.ticker,
        amountEUR,
        feesEUR,
        taxesEUR,
        flow,
        daysSinceStart,
        weight,
        weightedFlow: wf,
      };
    });

    const denominator = weightedCashFlow;
    const usedFallback = Math.abs(denominator) < 0.01;
    const result = usedFallback
      ? totalInvestedEUR > 0
        ? ((currentValueEUR - totalInvestedEUR) / totalInvestedEUR) * 100
        : 0
      : ((currentValueEUR - netCashFlow) / denominator) * 100;

    return { rows, totalDays, netCashFlow, weightedCashFlow, denominator, result, usedFallback };
  }, [transactions, exchangeRates, currentValueEUR, totalInvestedEUR]);

  const irrData = useMemo(() => {
    const rows: IrrRow[] = [];

    for (const tx of transactions) {
      const d = new Date(tx.date);
      if (isNaN(d.getTime())) continue;

      const amount = txAmountToEUR(tx.totalAmount, tx, exchangeRates);
      const fees = txAmountToEUR(tx.fees || 0, tx, exchangeRates);
      const taxes = txAmountToEUR(tx.taxes || 0, tx, exchangeRates);

      switch (tx.type) {
        case "buy":
          rows.push({
            date: tx.date,
            type: "buy",
            ticker: tx.ticker,
            amount: -(amount + fees + taxes),
            label: t("perfExplBuy"),
          });
          break;
        case "sell":
          rows.push({
            date: tx.date,
            type: "sell",
            ticker: tx.ticker,
            amount: amount - fees - taxes,
            label: t("perfExplSell"),
          });
          break;
        case "dividend":
          rows.push({
            date: tx.date,
            type: "dividend",
            ticker: tx.ticker,
            amount: amount - taxes,
            label: t("perfExplDividend"),
          });
          break;
        case "fee":
          rows.push({
            date: tx.date,
            type: "fee",
            ticker: tx.ticker,
            amount: -amount,
            label: t("perfExplFee"),
          });
          break;
      }
    }

    rows.sort((a, b) => a.date.localeCompare(b.date));

    if (currentValueEUR > 0) {
      rows.push({
        date: new Date().toISOString().slice(0, 10),
        type: "value",
        ticker: "",
        amount: currentValueEUR,
        label: t("perfExplCurrentValue"),
      });
    }

    return rows;
  }, [transactions, exchangeRates, currentValueEUR, t]);

  if (!isOpen) return null;

  const hasTxs = transactions.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-8 px-4">
      <div
        className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={focusTrapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="perf-explainer-title"
        className="relative bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl w-full max-w-2xl shadow-xl"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-t-2xl">
          <h2 id="perf-explainer-title" className="text-base font-bold text-gray-900 dark:text-white">
            {t("perfExplTitle")}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
            aria-label={t("cancel")}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-8 max-h-[80vh] overflow-y-auto">
          {!hasTxs ? (
            <div className="text-center py-8">
              <p className="text-sm text-gray-500 dark:text-slate-400">{t("perfExplNoTxs")}</p>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-2">{t("perfExplNoTxsHint")}</p>
            </div>
          ) : (
            <>
              {/* ── Section 1: TTWROR ── */}
              <section>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">
                  {t("perfExplTtwrorTitle")}
                </h3>
                <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">
                  {t("perfExplTtwrorDesc")}
                </p>

                {/* Your numbers */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <NumBox label={t("perfExplCurrentValue")} value={eur(currentValueEUR)} />
                  <NumBox label={t("perfExplTotalInvested")} value={eur(totalInvestedEUR)} />
                  <NumBox
                    label="TTWROR"
                    value={pct(ttwror)}
                    highlight={ttwror >= 0 ? "green" : "red"}
                  />
                </div>

                {ttwrorData && (
                  <>
                    {/* Transaction breakdown table */}
                    <div className="overflow-x-auto -mx-6 px-6">
                      <table className="w-full text-[11px]">
                        <thead>
                          <tr className="text-left text-gray-500 dark:text-slate-400 border-b border-gray-100 dark:border-slate-700">
                            <th className="py-1.5 pr-2 font-medium">{t("date")}</th>
                            <th className="py-1.5 pr-2 font-medium">{t("type")}</th>
                            <th className="py-1.5 pr-2 font-medium">{t("ticker")}</th>
                            <th className="py-1.5 pr-2 font-medium text-right">{t("perfExplFlowEUR")}</th>
                            <th className="py-1.5 pr-2 font-medium text-right">{t("perfExplWeight")}</th>
                            <th className="py-1.5 font-medium text-right">{t("perfExplWeightedFlow")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ttwrorData.rows.map((row, i) => (
                            <tr
                              key={i}
                              className="border-b border-gray-50 dark:border-slate-700/50"
                            >
                              <td className="py-1.5 pr-2 text-gray-600 dark:text-slate-300 whitespace-nowrap">
                                {row.date}
                              </td>
                              <td className="py-1.5 pr-2">
                                <span
                                  className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                    row.type === "buy"
                                      ? "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400"
                                      : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                  }`}
                                >
                                  {row.type === "buy" ? t("perfExplBuy") : t("perfExplSell")}
                                </span>
                              </td>
                              <td className="py-1.5 pr-2 font-mono text-gray-700 dark:text-slate-200">
                                {row.ticker}
                              </td>
                              <td
                                className={`py-1.5 pr-2 text-right font-mono ${
                                  row.flow > 0
                                    ? "text-red-600 dark:text-red-400"
                                    : "text-emerald-600 dark:text-emerald-400"
                                }`}
                              >
                                {row.flow >= 0 ? "+" : ""}{eur(row.flow)}
                              </td>
                              <td className="py-1.5 pr-2 text-right text-gray-400 dark:text-slate-500 font-mono">
                                {row.weight.toFixed(4)}
                              </td>
                              <td
                                className={`py-1.5 text-right font-mono ${
                                  row.weightedFlow > 0
                                    ? "text-red-600 dark:text-red-400"
                                    : "text-emerald-600 dark:text-emerald-400"
                                }`}
                              >
                                {row.weightedFlow >= 0 ? "+" : ""}{eur(row.weightedFlow)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t-2 border-gray-200 dark:border-slate-600 font-medium">
                            <td colSpan={3} className="py-2 text-gray-700 dark:text-slate-200">
                              {t("perfExplTotals")}
                            </td>
                            <td className="py-2 text-right font-mono text-gray-700 dark:text-slate-200">
                              {eur(ttwrorData.netCashFlow)}
                            </td>
                            <td className="py-2" />
                            <td className="py-2 text-right font-mono text-gray-700 dark:text-slate-200">
                              {eur(ttwrorData.weightedCashFlow)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {/* Formula */}
                    <div className="mt-4 rounded-xl bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-700 p-4">
                      <p className="text-[11px] font-semibold text-gray-700 dark:text-slate-200 mb-2">
                        {t("perfExplFormula")}
                      </p>
                      {ttwrorData.usedFallback ? (
                        <p className="text-xs text-gray-500 dark:text-slate-400">
                          {t("perfExplFallback")}
                        </p>
                      ) : (
                        <>
                          <p className="text-xs text-gray-600 dark:text-slate-300 font-mono leading-relaxed">
                            R = ({eur(currentValueEUR)} &minus; {eur(ttwrorData.netCashFlow)}) / {eur(ttwrorData.weightedCashFlow)} &times; 100
                          </p>
                          <p className="text-xs text-gray-600 dark:text-slate-300 font-mono mt-1">
                            R = {eur(currentValueEUR - ttwrorData.netCashFlow)} / {eur(ttwrorData.weightedCashFlow)} &times; 100
                          </p>
                          <p className="mt-2 text-sm font-bold text-gray-900 dark:text-white">
                            R = {pct(ttwrorData.result)}
                          </p>
                        </>
                      )}
                    </div>

                    {/* Plain language */}
                    <p className="mt-3 text-xs text-gray-600 dark:text-slate-300 leading-relaxed">
                      {t("perfExplTtwrorSummary")
                        .replace("{value}", eur(currentValueEUR))
                        .replace("{invested}", eur(ttwrorData.netCashFlow))
                        .replace("{return}", pct(ttwror))}
                    </p>
                  </>
                )}
              </section>

              <hr className="border-gray-200 dark:border-slate-700" />

              {/* ── Section 2: IRR (XIRR) ── */}
              <section>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">
                  {t("perfExplIrrTitle")}
                </h3>
                <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">
                  {t("perfExplIrrDesc")}
                </p>

                {/* Cash flow timeline */}
                <div className="space-y-1.5 mb-4">
                  {irrData.map((row, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 text-[11px] py-1.5 px-3 rounded-lg bg-gray-50 dark:bg-slate-900/40"
                    >
                      <span className="text-gray-500 dark:text-slate-400 w-20 shrink-0 font-mono">
                        {row.date}
                      </span>
                      <span
                        className={`w-16 shrink-0 text-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          row.amount < 0
                            ? "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400"
                            : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        }`}
                      >
                        {row.label}
                      </span>
                      {row.ticker && (
                        <span className="text-gray-600 dark:text-slate-300 font-mono w-16 shrink-0">
                          {row.ticker}
                        </span>
                      )}
                      <span
                        className={`ml-auto font-mono font-medium ${
                          row.amount < 0
                            ? "text-red-600 dark:text-red-400"
                            : "text-emerald-600 dark:text-emerald-400"
                        }`}
                      >
                        {row.amount >= 0 ? "+" : ""}{eur(row.amount)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Result */}
                <div className="rounded-xl bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-700 p-4">
                  {irr !== null ? (
                    <>
                      <p className="text-sm font-bold text-gray-900 dark:text-white mb-1">
                        IRR = {pct(irr)}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-slate-300 leading-relaxed">
                        {t("perfExplIrrSummary").replace("{irr}", pct(irr))}
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      {t("irrNeedsTime")}
                    </p>
                  )}
                </div>
              </section>

              <hr className="border-gray-200 dark:border-slate-700" />

              {/* ── Section 3: Transaction Contributions ── */}
              <section>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">
                  {t("perfExplContribTitle")}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <ContribCard
                    icon="↗"
                    type={t("perfExplBuy")}
                    color="red"
                    desc={t("perfExplBuyDesc")}
                  />
                  <ContribCard
                    icon="↙"
                    type={t("perfExplSell")}
                    color="green"
                    desc={t("perfExplSellDesc")}
                  />
                  <ContribCard
                    icon="$"
                    type={t("perfExplDividend")}
                    color="green"
                    desc={t("perfExplDividendDesc")}
                  />
                  <ContribCard
                    icon="−"
                    type={t("perfExplFee")}
                    color="red"
                    desc={t("perfExplFeeDesc")}
                  />
                </div>
              </section>
            </>
          )}

          {/* Disclaimer */}
          <p className="text-[10px] text-gray-400 dark:text-slate-500 pt-2 border-t border-gray-100 dark:border-slate-700">
            {t("financialDataDisclaimer")}
          </p>
        </div>
      </div>
    </div>
  );
}

function NumBox({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: "green" | "red";
}) {
  const bg = highlight === "green"
    ? "bg-emerald-50 dark:bg-emerald-500/10"
    : highlight === "red"
    ? "bg-red-50 dark:bg-red-500/10"
    : "bg-gray-50 dark:bg-slate-900/40";
  const valueColor = highlight === "green"
    ? "text-emerald-600 dark:text-emerald-400"
    : highlight === "red"
    ? "text-red-500 dark:text-red-400"
    : "text-gray-900 dark:text-white";

  return (
    <div className={`${bg} rounded-xl p-3 text-center`}>
      <p className="text-[10px] text-gray-500 dark:text-slate-400 font-medium uppercase mb-1">{label}</p>
      <p className={`text-sm font-bold ${valueColor}`}>{value}</p>
    </div>
  );
}

function ContribCard({
  icon,
  type,
  color,
  desc,
}: {
  icon: string;
  type: string;
  color: "green" | "red";
  desc: string;
}) {
  const iconBg = color === "green"
    ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
    : "bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400";
  const badge = color === "green"
    ? "text-emerald-600 dark:text-emerald-400"
    : "text-red-600 dark:text-red-400";

  return (
    <div className="flex items-start gap-3 rounded-xl border border-gray-200 dark:border-slate-700 p-3">
      <span className={`${iconBg} w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold shrink-0`}>
        {icon}
      </span>
      <div className="min-w-0">
        <p className={`text-xs font-semibold ${badge}`}>{type}</p>
        <p className="text-[11px] text-gray-600 dark:text-slate-300 mt-0.5 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}
