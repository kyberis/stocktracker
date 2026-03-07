"use client";

import { useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { useTrack } from "@/lib/use-track";
import type { Account, Holding } from "@/lib/types";

interface BrokerFilterProps {
  accounts: Account[];
  holdings: Holding[];
  selected: string;
  onChange: (value: string) => void;
}

export default function BrokerFilter({ accounts, holdings, selected, onChange }: BrokerFilterProps) {
  const { t } = useI18n();
  const track = useTrack();

  const sources = useMemo(() => {
    const accountIds = new Set(holdings.map((h) => h.accountId || ""));
    const hasManual = accountIds.has("");
    const brokerAccounts = accounts.filter((a) => accountIds.has(a.id));
    return { brokerAccounts, hasManual };
  }, [accounts, holdings]);

  const totalSources = sources.brokerAccounts.length + (sources.hasManual ? 1 : 0);
  if (totalSources < 2) return null;

  const handleChange = (value: string) => {
    onChange(value);
    if (value !== "all") {
      track("broker_filter_used", { filter: value });
    }
  };

  const pillClass = (active: boolean) =>
    `px-3 py-1.5 text-xs font-medium rounded-full transition-colors whitespace-nowrap ${
      active
        ? "bg-emerald-500 text-white"
        : "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600"
    }`;

  return (
    <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1">
      <span className="text-xs text-gray-400 dark:text-slate-500 shrink-0">{t("filterByBroker")}:</span>
      <button
        onClick={() => handleChange("all")}
        className={pillClass(selected === "all")}
        aria-pressed={selected === "all"}
      >
        {t("allBrokers")}
      </button>
      {sources.brokerAccounts.map((account) => (
        <button
          key={account.id}
          onClick={() => handleChange(account.id)}
          className={pillClass(selected === account.id)}
          aria-pressed={selected === account.id}
        >
          {account.name}
        </button>
      ))}
      {sources.hasManual && (
        <button
          onClick={() => handleChange("manual")}
          className={pillClass(selected === "manual")}
          aria-pressed={selected === "manual"}
        >
          {t("manualHoldings")}
        </button>
      )}
    </div>
  );
}
