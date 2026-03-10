"use client";

import { useI18n } from "@/lib/i18n";

interface EditFormProps {
  isCashHolding: boolean;
  editName: string;
  setEditName: (v: string) => void;
  editTicker: string;
  setEditTicker: (v: string) => void;
  editIsin: string;
  setEditIsin: (v: string) => void;
  editExchange: string;
  setEditExchange: (v: string) => void;
  editAssetType: "stock" | "etf" | "crypto";
  setEditAssetType: (v: "stock" | "etf" | "crypto") => void;
  editShares: string;
  setEditShares: (v: string) => void;
  editPurchasePrice: string;
  setEditPurchasePrice: (v: string) => void;
  editDisplayCurrency: string;
  setEditDisplayCurrency: (v: string) => void;
}

export default function EditForm(props: EditFormProps) {
  const { t } = useI18n();
  const {
    isCashHolding, editName, setEditName, editTicker, setEditTicker,
    editIsin, setEditIsin, editExchange, setEditExchange,
    editAssetType, setEditAssetType, editShares, setEditShares,
    editPurchasePrice, setEditPurchasePrice,
    editDisplayCurrency, setEditDisplayCurrency,
  } = props;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 pt-3">
      <div>
        <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">{t("editName")}</label>
        <input value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full" onClick={(e) => e.stopPropagation()} />
      </div>
      <div>
        <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">{t("editTicker")}</label>
        <input value={editTicker} onChange={(e) => setEditTicker(e.target.value)} className="w-full" onClick={(e) => e.stopPropagation()} />
      </div>
      <div>
        <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">{t("editISIN")}</label>
        <input value={editIsin} onChange={(e) => setEditIsin(e.target.value)} className="w-full" onClick={(e) => e.stopPropagation()} />
      </div>
      <div>
        <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">{t("editExchange")}</label>
        <input value={editExchange} onChange={(e) => setEditExchange(e.target.value)} className="w-full" onClick={(e) => e.stopPropagation()} />
      </div>
      <div>
        <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">{t("assetType")}</label>
        <select value={editAssetType} onChange={(e) => setEditAssetType(e.target.value as "stock" | "etf" | "crypto")} className="w-full" onClick={(e) => e.stopPropagation()}>
          <option value="stock">{t("stockType")}</option>
          <option value="etf">{t("etfType")}</option>
          <option value="crypto">{t("cryptoType")}</option>
        </select>
      </div>
      {!isCashHolding && (
        <div>
          <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">{t("shares")}</label>
          <input type="number" min="0" step="any" value={editShares} onChange={(e) => setEditShares(e.target.value)} className="w-full" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
      <div>
        <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">
          {isCashHolding ? t("cashAmount") : t("purchasePrice")}
        </label>
        <input type="number" min="0" step="any" value={editPurchasePrice} onChange={(e) => setEditPurchasePrice(e.target.value)} className="w-full" onClick={(e) => e.stopPropagation()} />
      </div>
      <div>
        <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">{t("editCurrency")}</label>
        <select value={editDisplayCurrency} onChange={(e) => setEditDisplayCurrency(e.target.value)} className="w-full" onClick={(e) => e.stopPropagation()}>
          <option value="USD">$ USD</option>
          <option value="EUR">€ EUR</option>
          <option value="GBP">£ GBP</option>
          <option value="GBX">GBX (pence)</option>
          <option value="DKK">DKK</option>
          <option value="CAD">CA$ CAD</option>
          <option value="CHF">CHF</option>
          <option value="JPY">¥ JPY</option>
        </select>
      </div>
    </div>
  );
}
