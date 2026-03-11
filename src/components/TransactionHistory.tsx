"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import { usePortfolio } from "@/lib/portfolio-context";
import { useTransactions } from "@/lib/hooks/use-api";
import { useStealthMode } from "@/lib/stealth-context";
import { useTrack } from "@/lib/use-track";
import { calculateFifoRealizedPL } from "@/lib/performance";
import { formatStealthCurrency } from "@/lib/utils";
import type { Transaction, TransactionType } from "@/lib/types";

interface Props {
  holdingId?: string;
  ticker?: string;
  exchange?: string;
  assetType?: string;
  currency?: string;
  name?: string;
}

const PAGE_SIZE = 50;

const TYPE_COLORS: Record<TransactionType, string> = {
  buy: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  sell: "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400",
  dividend: "bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400",
  fee: "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400",
};

export default function TransactionHistory({ holdingId, ticker, exchange: holdingExchange, assetType: holdingAssetType, currency: holdingCurrency, name: holdingName }: Props) {
  const { t } = useI18n();
  const { refreshHoldings, exchangeRates, activePortfolioCurrency, activePortfolioId } = usePortfolio();
  const { data: txs = [], mutate } = useTransactions(holdingId);
  const { stealthMode } = useStealthMode();
  const track = useTrack();

  const baseCurrency = activePortfolioCurrency;
  const hasSells = useMemo(() => txs.some((tx) => tx.type === "sell"), [txs]);
  const fifoMap = useMemo(
    () => (hasSells ? calculateFifoRealizedPL(txs, exchangeRates, baseCurrency) : new Map()),
    [txs, exchangeRates, baseCurrency, hasSells],
  );

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [txs]);
  const visibleTxs = useMemo(() => txs.slice(0, visibleCount), [txs, visibleCount]);
  const hasMore = visibleCount < txs.length;
  const showMore = useCallback(() => setVisibleCount((v) => v + PAGE_SIZE), []);

  useEffect(() => {
    if (hasSells) track("transaction_pl_viewed");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasSells]);

  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<TransactionType>("buy");
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [formShares, setFormShares] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formFees, setFormFees] = useState("");
  const [formTaxes, setFormTaxes] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [mutationLoading, setMutationLoading] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editType, setEditType] = useState<TransactionType>("buy");
  const [editDate, setEditDate] = useState("");
  const [editShares, setEditShares] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editFees, setEditFees] = useState("");
  const [editTaxes, setEditTaxes] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const startEdit = (tx: Transaction) => {
    setEditingId(tx.id);
    setEditType(tx.type);
    setEditDate(tx.date);
    setEditShares(String(tx.shares || ""));
    setEditPrice(String(tx.pricePerShare || ""));
    setEditFees(String(tx.fees || ""));
    setEditTaxes(String(tx.taxes || ""));
    setEditNotes(tx.notes || "");
  };

  const cancelEdit = () => setEditingId(null);

  const handleSaveEdit = async () => {
    if (!editingId) return;
    setMutationLoading(true);
    const shares = parseFloat(editShares) || 0;
    const price = parseFloat(editPrice) || 0;
    const total = editType === "dividend" || editType === "fee" ? price : shares * price;
    const editQp = activePortfolioId ? `?portfolioId=${encodeURIComponent(activePortfolioId)}` : "";
    await fetch(`/api/transactions${editQp}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editingId,
        updates: {
          type: editType,
          date: editDate,
          shares,
          pricePerShare: price,
          totalAmount: total,
          fees: parseFloat(editFees) || 0,
          taxes: parseFloat(editTaxes) || 0,
          notes: editNotes,
        },
      }),
    });
    setEditingId(null);
    await Promise.all([mutate(), refreshHoldings()]);
    setMutationLoading(false);
  };

  const handleAdd = async () => {
    if (!formDate) return;
    setMutationLoading(true);
    const shares = parseFloat(formShares) || 0;
    const price = parseFloat(formPrice) || 0;
    const total = formType === "dividend" || formType === "fee" ? parseFloat(formPrice) || 0 : shares * price;
    const addQp = activePortfolioId ? `?portfolioId=${encodeURIComponent(activePortfolioId)}` : "";
    await fetch(`/api/transactions${addQp}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        holdingId: holdingId || "",
        ticker: ticker || "",
        name: holdingName || "",
        exchange: holdingExchange || "",
        assetType: holdingAssetType || "stock",
        type: formType,
        date: formDate,
        shares,
        pricePerShare: price,
        totalAmount: total,
        fees: parseFloat(formFees) || 0,
        taxes: parseFloat(formTaxes) || 0,
        notes: formNotes,
        currency: holdingCurrency || "EUR",
        displayCurrency: holdingCurrency || "EUR",
      }),
    });
    setShowForm(false);
    setFormShares("");
    setFormPrice("");
    setFormFees("");
    setFormTaxes("");
    setFormNotes("");
    await Promise.all([mutate(), refreshHoldings()]);
    setMutationLoading(false);
  };

  const handleDelete = async (id: string) => {
    const qp = activePortfolioId ? `&portfolioId=${encodeURIComponent(activePortfolioId)}` : "";
    await fetch(`/api/transactions?id=${id}${qp}`, { method: "DELETE" });
    await Promise.all([mutate(), refreshHoldings()]);
  };

  const typeLabel = (type: TransactionType) => {
    const map: Record<TransactionType, string> = { buy: t("txBuy"), sell: t("txSell"), dividend: t("txDividend"), fee: t("txFee") };
    return map[type];
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t("transactions")}</h3>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary text-xs px-3 py-1.5">
          {showForm ? t("cancel") : t("addTransaction")}
        </button>
      </div>

      {showForm && (
        <div className="bg-gray-50 dark:bg-slate-700/30 rounded-xl p-4 mb-4 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(["buy", "sell", "dividend", "fee"] as TransactionType[]).map((tp) => (
              <button
                key={tp}
                onClick={() => setFormType(tp)}
                className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                  formType === tp ? "bg-emerald-500 text-white" : "bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-300"
                }`}
              >
                {typeLabel(tp)}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} aria-label={t("transactionDate")} className="text-sm" />
            {(formType === "buy" || formType === "sell") && (
              <input type="number" placeholder={t("transactionShares")} aria-label={t("transactionShares")} value={formShares} onChange={(e) => setFormShares(e.target.value)} className="text-sm" step="any" />
            )}
            <input
              type="number"
              placeholder={formType === "dividend" || formType === "fee" ? t("transactionTotal") : t("transactionPrice")}
              aria-label={formType === "dividend" || formType === "fee" ? t("transactionTotal") : t("transactionPrice")}
              value={formPrice}
              onChange={(e) => setFormPrice(e.target.value)}
              className="text-sm"
              step="any"
            />
            <input type="number" placeholder={t("transactionFees")} aria-label={t("transactionFees")} value={formFees} onChange={(e) => setFormFees(e.target.value)} className="text-sm" step="any" />
            <input type="number" placeholder={t("transactionTaxes")} aria-label={t("transactionTaxes")} value={formTaxes} onChange={(e) => setFormTaxes(e.target.value)} className="text-sm" step="any" />
            <input type="text" placeholder={t("transactionNotes")} aria-label={t("transactionNotes")} value={formNotes} onChange={(e) => setFormNotes(e.target.value)} className="text-sm" />
          </div>
          <button onClick={handleAdd} disabled={mutationLoading} className="btn-primary text-xs px-4 py-1.5 disabled:opacity-50">
            {t("addTransaction")}
          </button>
        </div>
      )}

      {txs.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-slate-500">{t("noTransactions")}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <caption className="sr-only">Transaction history</caption>
            <thead className="text-gray-500 dark:text-slate-400">
              <tr>
                <th scope="col" className="text-left p-2 font-medium">{t("transactionDate")}</th>
                <th scope="col" className="text-left p-2 font-medium">{t("transactionType")}</th>
                {!holdingId && <th scope="col" className="text-left p-2 font-medium">{t("ticker")}</th>}
                <th scope="col" className="text-right p-2 font-medium">{t("transactionShares")}</th>
                <th scope="col" className="text-right p-2 font-medium">{t("transactionPrice")}</th>
                <th scope="col" className="text-right p-2 font-medium">{t("transactionTotal")}</th>
                <th scope="col" className="text-right p-2 font-medium">{t("transactionFees")}</th>
                {hasSells && <th scope="col" className="text-right p-2 font-medium">{t("realizedPl")}</th>}
                <th scope="col" className="p-2"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {visibleTxs.map((tx) =>
                editingId === tx.id ? (
                  <tr key={tx.id} className="border-t border-emerald-200 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-900/10">
                    <td className="p-1.5">
                      <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} className="text-xs w-full" aria-label={t("transactionDate")} />
                    </td>
                    <td className="p-1.5">
                      <select
                        value={editType}
                        onChange={(e) => setEditType(e.target.value as TransactionType)}
                        className="text-xs w-full rounded-md border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-1.5 py-1"
                        aria-label={t("transactionType")}
                      >
                        <option value="buy">{typeLabel("buy")}</option>
                        <option value="sell">{typeLabel("sell")}</option>
                        <option value="dividend">{typeLabel("dividend")}</option>
                        <option value="fee">{typeLabel("fee")}</option>
                      </select>
                    </td>
                    {!holdingId && <td className="p-1.5 font-mono font-medium text-gray-900 dark:text-white">{tx.ticker}</td>}
                    <td className="p-1.5">
                      <input type="number" value={editShares} onChange={(e) => setEditShares(e.target.value)} className="text-xs w-full text-right" step="any" aria-label={t("transactionShares")} />
                    </td>
                    <td className="p-1.5">
                      <input type="number" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} className="text-xs w-full text-right" step="any" aria-label={t("transactionPrice")} />
                    </td>
                    <td className="p-1.5 text-right font-mono text-gray-400 text-[10px]">
                      {((parseFloat(editShares) || 0) * (parseFloat(editPrice) || 0)).toFixed(2)}
                    </td>
                    <td className="p-1.5">
                      <input type="number" value={editFees} onChange={(e) => setEditFees(e.target.value)} className="text-xs w-full text-right" step="any" aria-label={t("transactionFees")} />
                    </td>
                    {hasSells && <td className="p-1.5" />}
                    <td className="p-1.5">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={handleSaveEdit}
                          disabled={mutationLoading}
                          className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 disabled:opacity-50"
                          title={t("saveTransaction")}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"
                          title={t("cancelEdit")}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={tx.id} className="border-t border-gray-100 dark:border-slate-700">
                    <td className="p-2 text-gray-700 dark:text-slate-300">{tx.date}</td>
                    <td className="p-2">
                      <span className={`inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-medium ${TYPE_COLORS[tx.type]}`}>
                        {typeLabel(tx.type)}
                      </span>
                    </td>
                    {!holdingId && <td className="p-2 font-mono font-medium text-gray-900 dark:text-white">{tx.ticker}</td>}
                    <td className="p-2 text-right font-mono">{tx.shares > 0 ? tx.shares : "—"}</td>
                    <td className="p-2 text-right font-mono">
                      {tx.pricePerShare > 0
                        ? formatStealthCurrency(tx.pricePerShare, tx.currency || baseCurrency, stealthMode)
                        : "—"}
                    </td>
                    <td className="p-2 text-right font-mono font-medium text-gray-900 dark:text-white">
                      <span
                        title={
                          tx.currency && tx.currency !== baseCurrency
                            ? tx.exchangeRateEur
                              ? `1 EUR = ${tx.exchangeRateEur.toFixed(4)} ${tx.currency} (${t("txFxHistorical")})`
                              : exchangeRates[`EUR${tx.currency}`]
                                ? `1 EUR = ${exchangeRates[`EUR${tx.currency}`].toFixed(4)} ${tx.currency} (${t("txFxCurrent")})`
                                : undefined
                            : undefined
                        }
                        className={tx.currency && tx.currency !== baseCurrency ? "underline decoration-dotted decoration-gray-400 dark:decoration-slate-500 cursor-help" : undefined}
                      >
                        {formatStealthCurrency(tx.totalAmount, tx.currency || baseCurrency, stealthMode)}
                      </span>
                    </td>
                    <td className="p-2 text-right font-mono text-gray-400">
                      {tx.fees > 0 ? formatStealthCurrency(tx.fees, tx.currency || baseCurrency, stealthMode) : "—"}
                    </td>
                    {hasSells && (
                      <td className={`p-2 text-right font-mono font-medium ${
                        tx.type === "sell"
                          ? (fifoMap.get(tx.id)?.realizedGainBase ?? 0) >= 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-red-500 dark:text-red-400"
                          : ""
                      }`}>
                        {tx.type === "sell" && fifoMap.has(tx.id)
                          ? formatStealthCurrency(fifoMap.get(tx.id)!.realizedGainBase, baseCurrency, stealthMode)
                          : "—"}
                      </td>
                    )}
                    <td className="p-2">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => startEdit(tx)}
                          className="text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 text-[10px]"
                          title={t("editTransaction")}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(tx.id)}
                          className="text-red-400 hover:text-red-600 text-[10px]"
                          title={t("deleteTransaction")}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
          {hasMore && (
            <div className="flex justify-center pt-3 pb-1">
              <button
                onClick={showMore}
                className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
              >
                {t("showMore")} ({txs.length - visibleCount} {t("remaining")})
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
