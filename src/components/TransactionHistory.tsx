"use client";

import { useState, useEffect, useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import type { Transaction, TransactionType } from "@/lib/types";

interface Props {
  holdingId?: string;
  ticker?: string;
}

const TYPE_COLORS: Record<TransactionType, string> = {
  buy: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  sell: "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400",
  dividend: "bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400",
  fee: "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400",
};

export default function TransactionHistory({ holdingId, ticker }: Props) {
  const { t } = useI18n();
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<TransactionType>("buy");
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [formShares, setFormShares] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formFees, setFormFees] = useState("");
  const [formTaxes, setFormTaxes] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchTxs = useCallback(async () => {
    const params = new URLSearchParams();
    if (holdingId) params.set("holdingId", holdingId);
    const res = await fetch(`/api/transactions?${params}`);
    if (res.ok) setTxs(await res.json());
  }, [holdingId]);

  useEffect(() => { fetchTxs(); }, [fetchTxs]);

  const handleAdd = async () => {
    if (!formDate) return;
    setLoading(true);
    const shares = parseFloat(formShares) || 0;
    const price = parseFloat(formPrice) || 0;
    const total = formType === "dividend" || formType === "fee" ? parseFloat(formPrice) || 0 : shares * price;
    await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        holdingId: holdingId || "",
        ticker: ticker || "",
        type: formType,
        date: formDate,
        shares,
        pricePerShare: price,
        totalAmount: total,
        fees: parseFloat(formFees) || 0,
        taxes: parseFloat(formTaxes) || 0,
        notes: formNotes,
        currency: "EUR",
      }),
    });
    setShowForm(false);
    setFormShares("");
    setFormPrice("");
    setFormFees("");
    setFormTaxes("");
    setFormNotes("");
    setLoading(false);
    fetchTxs();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/transactions?id=${id}`, { method: "DELETE" });
    fetchTxs();
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
            <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} className="text-sm" />
            {(formType === "buy" || formType === "sell") && (
              <input type="number" placeholder={t("transactionShares")} value={formShares} onChange={(e) => setFormShares(e.target.value)} className="text-sm" step="any" />
            )}
            <input
              type="number"
              placeholder={formType === "dividend" || formType === "fee" ? t("transactionTotal") : t("transactionPrice")}
              value={formPrice}
              onChange={(e) => setFormPrice(e.target.value)}
              className="text-sm"
              step="any"
            />
            <input type="number" placeholder={t("transactionFees")} value={formFees} onChange={(e) => setFormFees(e.target.value)} className="text-sm" step="any" />
            <input type="number" placeholder={t("transactionTaxes")} value={formTaxes} onChange={(e) => setFormTaxes(e.target.value)} className="text-sm" step="any" />
            <input type="text" placeholder={t("transactionNotes")} value={formNotes} onChange={(e) => setFormNotes(e.target.value)} className="text-sm" />
          </div>
          <button onClick={handleAdd} disabled={loading} className="btn-primary text-xs px-4 py-1.5 disabled:opacity-50">
            {t("addTransaction")}
          </button>
        </div>
      )}

      {txs.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-slate-500">{t("noTransactions")}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-gray-500 dark:text-slate-400">
              <tr>
                <th className="text-left p-2 font-medium">{t("transactionDate")}</th>
                <th className="text-left p-2 font-medium">{t("transactionType")}</th>
                {!holdingId && <th className="text-left p-2 font-medium">{t("ticker")}</th>}
                <th className="text-right p-2 font-medium">{t("transactionShares")}</th>
                <th className="text-right p-2 font-medium">{t("transactionPrice")}</th>
                <th className="text-right p-2 font-medium">{t("transactionTotal")}</th>
                <th className="text-right p-2 font-medium">{t("transactionFees")}</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {txs.map((tx) => (
                <tr key={tx.id} className="border-t border-gray-100 dark:border-slate-700">
                  <td className="p-2 text-gray-700 dark:text-slate-300">{tx.date}</td>
                  <td className="p-2">
                    <span className={`inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-medium ${TYPE_COLORS[tx.type]}`}>
                      {typeLabel(tx.type)}
                    </span>
                  </td>
                  {!holdingId && <td className="p-2 font-mono font-medium text-gray-900 dark:text-white">{tx.ticker}</td>}
                  <td className="p-2 text-right font-mono">{tx.shares > 0 ? tx.shares : "—"}</td>
                  <td className="p-2 text-right font-mono">{tx.pricePerShare > 0 ? tx.pricePerShare.toFixed(2) : "—"}</td>
                  <td className="p-2 text-right font-mono font-medium text-gray-900 dark:text-white">{tx.totalAmount.toFixed(2)}</td>
                  <td className="p-2 text-right font-mono text-gray-400">{tx.fees > 0 ? tx.fees.toFixed(2) : "—"}</td>
                  <td className="p-2">
                    <button onClick={() => handleDelete(tx.id)} className="text-red-400 hover:text-red-600 text-[10px]">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
