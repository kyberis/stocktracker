"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useAccounts } from "@/lib/hooks/use-api";

interface Props {
  onAccountChange?: () => void;
}

export default function AccountsManager({ onAccountChange }: Props) {
  const { t } = useI18n();
  const { data: accounts = [], mutate } = useAccounts();
  const [newName, setNewName] = useState("");
  const [newBroker, setNewBroker] = useState("");
  const [newCurrency, setNewCurrency] = useState("EUR");

  const handleAdd = async () => {
    if (!newName) return;
    const res = await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, broker: newBroker, currency: newCurrency }),
    });
    if (res.ok) {
      setNewName("");
      setNewBroker("");
      mutate();
      onAccountChange?.();
    }
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/accounts?id=${id}`, { method: "DELETE" });
    mutate();
    onAccountChange?.();
  };

  return (
    <div className="card">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{t("accounts")}</h3>

      <div className="flex gap-2 mb-4">
        <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={t("accountName")} className="flex-1 text-xs px-2 py-1.5" />
        <input value={newBroker} onChange={(e) => setNewBroker(e.target.value)} placeholder={t("broker")} className="w-28 text-xs px-2 py-1.5" />
        <select value={newCurrency} onChange={(e) => setNewCurrency(e.target.value)} className="w-20 text-xs px-2 py-1.5">
          <option>EUR</option><option>USD</option><option>GBP</option><option>CHF</option>
        </select>
        <button onClick={handleAdd} className="btn-primary text-xs px-3 py-1.5">{t("addAccount")}</button>
      </div>

      {accounts.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-slate-500">{t("noAccounts")}</p>
      ) : (
        <div className="space-y-2">
          {accounts.map((acct) => (
            <div key={acct.id} className="flex items-center justify-between bg-gray-50 dark:bg-slate-700/30 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-500/15 flex items-center justify-center">
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{acct.name[0]?.toUpperCase()}</span>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-900 dark:text-white">{acct.name}</p>
                  {acct.broker && <p className="text-[10px] text-gray-500 dark:text-slate-400">{acct.broker} · {acct.currency}</p>}
                </div>
              </div>
              <button onClick={() => handleDelete(acct.id)} className="text-red-400 hover:text-red-600 text-xs">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
