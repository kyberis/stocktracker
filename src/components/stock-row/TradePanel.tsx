"use client";

import { useI18n } from "@/lib/i18n";

interface TradePanelProps {
  tradeAction: "buy" | "sell";
  setTradeAction: (v: "buy" | "sell") => void;
  tradeQuantity: string;
  setTradeQuantity: (v: string) => void;
  tradePrice: string;
  setTradePrice: (v: string) => void;
  tradeError: string | null;
  onApply: () => void;
}

export default function TradePanel({
  tradeAction, setTradeAction,
  tradeQuantity, setTradeQuantity,
  tradePrice, setTradePrice,
  tradeError, onApply,
}: TradePanelProps) {
  const { t } = useI18n();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4 pt-3">
      <div>
        <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">{t("tradeAction")}</label>
        <select value={tradeAction} onChange={(e) => setTradeAction(e.target.value as "buy" | "sell")} className="w-full" onClick={(e) => e.stopPropagation()}>
          <option value="buy">{t("buy")}</option>
          <option value="sell">{t("sell")}</option>
        </select>
      </div>
      <div>
        <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">{t("tradeQuantity")}</label>
        <input type="number" min="0" step="any" value={tradeQuantity} onChange={(e) => setTradeQuantity(e.target.value)} className="w-full" onClick={(e) => e.stopPropagation()} />
      </div>
      <div>
        <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">{t("tradePrice")}</label>
        <input type="number" min="0" step="any" value={tradePrice} onChange={(e) => setTradePrice(e.target.value)} className="w-full" onClick={(e) => e.stopPropagation()} />
      </div>
      <div className="flex items-end">
        <button
          onClick={(e) => { e.stopPropagation(); onApply(); }}
          className="btn-primary text-sm px-3 py-2 w-full"
        >
          {t("applyTrade")}
        </button>
      </div>
      {tradeError && (
        <p className="text-xs text-red-500 sm:col-span-4">{tradeError}</p>
      )}
    </div>
  );
}
