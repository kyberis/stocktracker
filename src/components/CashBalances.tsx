"use client";

import { useState } from "react";
import { usePortfolio } from "@/lib/portfolio-context";
import { useI18n } from "@/lib/i18n";
import { formatCurrency } from "@/lib/utils";

export default function CashBalances() {
  const { cashEntries, addCashEntry, updateCashEntry, removeCashEntry, activePortfolioCurrency } = usePortfolio();
  const baseCurrency = activePortfolioCurrency;
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editAmount, setEditAmount] = useState("");

  const handleAdd = async () => {
    const parsedAmount = parseFloat(amount);
    if (!name.trim() || Number.isNaN(parsedAmount) || parsedAmount < 0) return;
    await addCashEntry({ name: name.trim(), amountEUR: parsedAmount });
    setName("");
    setAmount("");
  };

  const startEdit = (id: string, currentName: string, currentAmount: number) => {
    setEditingId(id);
    setEditName(currentName);
    setEditAmount(String(currentAmount));
  };

  const saveEdit = async (id: string) => {
    const parsedAmount = parseFloat(editAmount);
    if (!editName.trim() || Number.isNaN(parsedAmount) || parsedAmount < 0) return;
    await updateCashEntry(id, { name: editName.trim(), amountEUR: parsedAmount });
    setEditingId(null);
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">{t("cashBalances")}</h3>
      </div>

      <div className="space-y-2 mb-4">
        {cashEntries.length === 0 && (
          <p className="text-sm text-gray-400 dark:text-slate-500">{t("noCashEntries")}</p>
        )}
        {cashEntries.map((entry) => {
          const isEditing = editingId === entry.id;
          return (
            <div
              key={entry.id}
              className="rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50/50 dark:bg-slate-800/50 px-3 py-2.5 flex items-center gap-2"
            >
              {isEditing ? (
                <>
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 min-w-[160px]"
                  />
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    className="w-36"
                  />
                  <button className="btn-primary text-sm px-2 py-1" onClick={() => saveEdit(entry.id)}>
                    {t("saveChanges")}
                  </button>
                  <button className="btn-secondary text-sm px-2 py-1" onClick={() => setEditingId(null)}>
                    {t("cancel")}
                  </button>
                </>
              ) : (
                <>
                  <p className="text-sm text-gray-700 dark:text-slate-200 flex-1">{entry.name}</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white w-36 text-right">
                    {formatCurrency(entry.amountEUR, baseCurrency)}
                  </p>
                  <button
                    className="text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 px-2"
                    onClick={() => startEdit(entry.id, entry.name, entry.amountEUR)}
                  >
                    {t("editValues")}
                  </button>
                  <button
                    className="text-sm text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 px-2"
                    onClick={() => removeCashEntry(entry.id)}
                  >
                    {t("removeStock")}
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_180px_auto] gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("cashName")}
          className="w-full"
        />
        <input
          type="number"
          min="0"
          step="any"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="EUR"
          className="w-full"
        />
        <button
          className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
          disabled={!name.trim() || !amount}
          onClick={handleAdd}
        >
          {t("addCash")}
        </button>
      </div>
    </div>
  );
}
