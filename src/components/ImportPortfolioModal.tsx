"use client";

import { useState, useRef, useCallback, DragEvent } from "react";
import { usePortfolio } from "@/lib/portfolio-context";
import { useI18n } from "@/lib/i18n";

interface ImportPortfolioModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ExtractedHolding {
  name: string;
  ticker: string;
  shares: number;
  purchasePrice: number;
  displayCurrency: string;
  exchange: string;
  assetType: "stock" | "etf";
}

type Step = "upload" | "extracting" | "preview" | "done" | "error";

export default function ImportPortfolioModal({ isOpen, onClose }: ImportPortfolioModalProps) {
  const { addHolding } = usePortfolio();
  const { t } = useI18n();

  const [step, setStep] = useState<Step>("upload");
  const [holdings, setHoldings] = useState<ExtractedHolding[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [importedCount, setImportedCount] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep("upload");
    setHoldings([]);
    setErrorMsg("");
    setImportedCount(0);
    setIsDragOver(false);
    setPreview(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const processFile = useCallback(async (file: File) => {
    setStep("extracting");
    setErrorMsg("");
    setPreview(null);

    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/import-portfolio", {
        method: "POST",
        body: formData,
      });

      if (res.status === 501) {
        setErrorMsg("OpenAI API key not configured.");
        setStep("error");
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setErrorMsg(data?.error || "Extraction failed.");
        setStep("error");
        return;
      }

      const data = await res.json();
      if (!data.holdings || data.holdings.length === 0) {
        setErrorMsg(t("importNoData"));
        setStep("error");
        return;
      }

      setHoldings(data.holdings);
      setStep("preview");
    } catch {
      setErrorMsg("Network error.");
      setStep("error");
    }
  }, [t]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const removeRow = (idx: number) => {
    setHoldings((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleImportAll = async () => {
    let count = 0;
    for (const h of holdings) {
      if (!h.ticker) continue;
      try {
        await addHolding({
          name: h.name,
          ticker: h.ticker,
          isin: "",
          assetType: h.assetType,
          shares: h.shares,
          purchasePrice: h.purchasePrice,
          displayCurrency: h.displayCurrency,
          exchange: h.exchange,
          valueInEUR: 0,
        });
        count++;
      } catch {
        // skip failed entries
      }
    }
    setImportedCount(count);
    setStep("done");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl w-full max-w-2xl mx-4 shadow-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-700">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t("importPortfolio")}</h2>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{t("importDesc")}</p>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 dark:text-slate-500 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {step === "upload" && (
            <div
              onClick={() => fileRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={() => setIsDragOver(false)}
              className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-colors ${
                isDragOver
                  ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10"
                  : "border-gray-300 dark:border-slate-600 hover:border-emerald-400 dark:hover:border-emerald-500/50 bg-gray-50 dark:bg-slate-700/30"
              }`}
            >
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center">
                <svg className="w-7 h-7 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">{t("importDragDrop")}</p>
              <p className="text-xs text-gray-400 dark:text-slate-500">{t("importAccepted")}</p>
              <input
                ref={fileRef}
                type="file"
                accept="image/*,.csv,text/csv"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          )}

          {step === "extracting" && (
            <div className="py-16 text-center space-y-4">
              {preview && (
                <img src={preview} alt="Upload preview" className="max-h-40 mx-auto rounded-xl border border-gray-200 dark:border-slate-700 mb-4" />
              )}
              <div className="w-10 h-10 mx-auto border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-600 dark:text-slate-300">{t("importExtracting")}</p>
            </div>
          )}

          {step === "error" && (
            <div className="py-12 text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-full bg-red-100 dark:bg-red-500/15 flex items-center justify-center">
                <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
              </div>
              <p className="text-sm text-red-600 dark:text-red-400">{errorMsg || t("importError")}</p>
              <button onClick={reset} className="btn-secondary text-sm">
                {t("cancel")} & {t("importPortfolio")}
              </button>
            </div>
          )}

          {step === "preview" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t("importPreview")}</h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400">{t("importPreviewDesc")}</p>
                </div>
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-full">
                  {holdings.length} items
                </span>
              </div>

              {preview && (
                <img src={preview} alt="Source" className="max-h-28 rounded-xl border border-gray-200 dark:border-slate-700" />
              )}

              <div className="border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden">
                <div className="overflow-x-auto max-h-72 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 dark:bg-slate-800/50 sticky top-0">
                      <tr className="text-gray-500 dark:text-slate-400">
                        <th className="text-left p-2 font-medium">{t("name")}</th>
                        <th className="text-left p-2 font-medium">{t("ticker")}</th>
                        <th className="text-right p-2 font-medium">{t("shares")}</th>
                        <th className="text-right p-2 font-medium">{t("purchasePrice")}</th>
                        <th className="text-left p-2 font-medium">{t("currency")}</th>
                        <th className="text-left p-2 font-medium">{t("editExchange")}</th>
                        <th className="text-left p-2 font-medium">{t("assetType")}</th>
                        <th className="p-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {holdings.map((h, i) => (
                        <tr key={i} className="border-t border-gray-100 dark:border-slate-700 text-gray-700 dark:text-slate-300">
                          <td className="p-2 max-w-[140px] truncate">{h.name}</td>
                          <td className="p-2 font-mono font-medium text-gray-900 dark:text-white">{h.ticker}</td>
                          <td className="p-2 text-right font-mono">{h.shares}</td>
                          <td className="p-2 text-right font-mono">{h.purchasePrice.toFixed(2)}</td>
                          <td className="p-2">{h.displayCurrency}</td>
                          <td className="p-2">{h.exchange}</td>
                          <td className="p-2">
                            <span className={`inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                              h.assetType === "etf"
                                ? "bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400"
                                : "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400"
                            }`}>
                              {h.assetType.toUpperCase()}
                            </span>
                          </td>
                          <td className="p-2">
                            <button
                              onClick={() => removeRow(i)}
                              className="text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors"
                              title={t("importRemoveRow")}
                            >
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
              </div>
            </div>
          )}

          {step === "done" && (
            <div className="py-12 text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center">
                <svg className="w-7 h-7 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {t("importSuccess").replace("{count}", String(importedCount))}
              </p>
              <button onClick={handleClose} className="btn-primary text-sm">
                {t("close")}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === "preview" && holdings.length > 0 && (
          <div className="border-t border-gray-100 dark:border-slate-700 px-6 py-4 flex items-center justify-between">
            <button onClick={reset} className="btn-secondary text-sm">
              {t("cancel")}
            </button>
            <button onClick={handleImportAll} className="btn-primary text-sm flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              {t("importConfirm")} ({holdings.length})
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
