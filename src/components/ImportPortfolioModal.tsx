"use client";

import { useState, useRef, useCallback, DragEvent } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { downloadImportTemplate } from "@/lib/download-import-template";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import ProCompareCard from "@/components/ProCompareCard";

type CsvFormat = "degiro" | "interactive_brokers" | "trading_212" | "revolut" | "charles_schwab" | "fidelity" | "nordnet" | "tastytrade" | "freetrade" | "etoro" | "wealthsimple" | "questrade" | "firstrade" | "simple" | "ai_import";

interface ImportPortfolioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete?: () => void;
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

interface ExtractedTransaction {
  date: string;
  type: "buy" | "sell" | "dividend" | "fee";
  ticker: string;
  name: string;
  isin?: string;
  shares: number;
  pricePerShare: number;
  totalAmount: number;
  fees: number;
  currency: string;
  sourceRef?: string;
}

interface CashBalance {
  currency: string;
  amount: number;
}

type Step = "upload" | "extracting" | "preview" | "importing" | "done" | "error";
type PreviewTab = "holdings" | "transactions";
const TX_TYPE_COLORS: Record<string, string> = {
  buy: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  sell: "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400",
  dividend: "bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400",
  fee: "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400",
};

export default function ImportPortfolioModal({ isOpen, onClose, onImportComplete }: ImportPortfolioModalProps) {
  const { t } = useI18n();
  const { user } = useAuth();
  const isPro = user?.plan === "pro";

  const [step, setStep] = useState<Step>("upload");
  const [csvFormat, setCsvFormat] = useState<CsvFormat>("degiro");

  const [holdings, setHoldings] = useState<ExtractedHolding[]>([]);
  const [transactions, setTransactions] = useState<ExtractedTransaction[]>([]);
  const [previewTab, setPreviewTab] = useState<PreviewTab>("holdings");
  const [errorMsg, setErrorMsg] = useState("");
  const [importedCount, setImportedCount] = useState(0);
  const [importedTxCount, setImportedTxCount] = useState(0);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, errors: 0 });
  const [isDragOver, setIsDragOver] = useState(false);
  const [isImageImport, setIsImageImport] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [cashBalances, setCashBalances] = useState<CashBalance[]>([]);
  const [duplicatesRemoved, setDuplicatesRemoved] = useState(0);
  const [importWarning, setImportWarning] = useState("");
  const [holdingsCapped, setHoldingsCapped] = useState(0);
  const rawCsvRef = useRef<string>("");
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep("upload");
    setCsvFormat("degiro");
    setHoldings([]);
    setTransactions([]);
    setPreviewTab("holdings");
    setErrorMsg("");
    setImportedCount(0);
    setImportedTxCount(0);
    setImportProgress({ current: 0, total: 0, errors: 0 });
    setIsDragOver(false);
    setIsImageImport(false);
    setPreview(null);
    setCashBalances([]);
    setDuplicatesRemoved(0);
    setImportWarning("");
    setHoldingsCapped(0);
    rawCsvRef.current = "";
  };

  const isBusy = step === "extracting" || step === "importing";

  const handleClose = () => {
    if (isBusy) return;
    const wasImport = step === "done";
    reset();
    onClose();
    if (wasImport && onImportComplete) onImportComplete();
  };

  const processFile = useCallback(async (file: File) => {
    setStep("extracting");
    setErrorMsg("");
    setPreview(null);

    const isImage = file.type.startsWith("image/");
    setIsImageImport(isImage);

    if (isImage) {
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
    }

    try {
      const isCsv = file.type === "text/csv" || file.name.endsWith(".csv") || file.type === "application/vnd.ms-excel";

      if (isCsv && csvFormat !== "ai_import") {
        const csv = await file.text();
        rawCsvRef.current = csv;
        const parseForm = new FormData();
        parseForm.append("action", "parse");
        parseForm.append("broker", csvFormat);
        parseForm.append("file", new Blob([csv], { type: "text/csv" }), "import.csv");
        const parseController = new AbortController();
        const parseTimer = setTimeout(() => parseController.abort(), 30_000);
        let parseRes: Response;
        try {
          parseRes = await fetch("/api/transactions/import-broker", {
            method: "POST",
            body: parseForm,
            signal: parseController.signal,
          });
        } finally {
          clearTimeout(parseTimer);
        }
        if (!parseRes.ok) {
          const data = await parseRes.json().catch(() => null);
          const apiError = data?.error || "";
          if (parseRes.status === 401) {
            setErrorMsg(apiError || "Session expired. Please log in again.");
          } else if (parseRes.status === 403) {
            setErrorMsg(apiError || "Access denied.");
          } else {
            setErrorMsg(apiError || t("importDegiroFailed"));
          }
          setStep("error");
          return;
        }
        const data = await parseRes.json();
        const parsedTransactions = Array.isArray(data.transactions) ? data.transactions : [];

        const dupCount = Number(data.summary?.duplicatesRemoved) || 0;

        if (parsedTransactions.length === 0) {
          if (dupCount > 0) {
            setErrorMsg(
              (t("importAllDuplicates") || "All {count} transactions in this file are already in your portfolio.")
                .replace("{count}", String(dupCount))
            );
          } else {
            const unmapped = data.summary?.unmapped;
            const hint = unmapped?.length
              ? ` ${t("importUnmappedIsins")}: ${unmapped.join(", ")}`
              : "";
            setErrorMsg((t("importNoTransactions") || "No transactions found in CSV.") + hint);
          }
          setStep("error");
          return;
        }

        const parsedCash: CashBalance[] = Array.isArray(data.summary?.cashBalances)
          ? data.summary.cashBalances.filter((c: CashBalance) => c.currency && c.amount > 0)
          : [];
        setCashBalances(parsedCash);
        setDuplicatesRemoved(Number(data.summary?.duplicatesRemoved) || 0);

        setHoldings([]);
        setTransactions(parsedTransactions.map((tx: Record<string, unknown>) => ({
          date: String(tx.date || ""),
          type: (String(tx.type || "buy") as ExtractedTransaction["type"]),
          ticker: String(tx.ticker || "").toUpperCase(),
          name: String(tx.name || ""),
          isin: String(tx.isin || ""),
          shares: Number(tx.shares || 0),
          pricePerShare: Number(tx.pricePerShare || 0),
          totalAmount: Number(tx.totalAmount || 0),
          fees: Number(tx.fees || 0),
          currency: String(tx.currency || "EUR").toUpperCase(),
          sourceRef: tx.sourceRef ? String(tx.sourceRef) : undefined,
        })));
        setPreviewTab("transactions");
        setStep("preview");
        return;
      }

      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/import-portfolio", { method: "POST", body: formData });

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
      const h = data.holdings || [];
      const tx = data.transactions || [];

      if (h.length === 0 && tx.length === 0) {
        setErrorMsg(data.warning || t("importNoData"));
        setStep("error");
        return;
      }

      if (data.warning) setImportWarning(data.warning);
      setHoldings(h);
      setTransactions(tx);
      setPreviewTab(h.length > 0 ? "holdings" : "transactions");
      setStep("preview");
    } catch (err) {
      console.error("[ImportPortfolio] upload failed:", err);
      if (err instanceof DOMException && err.name === "AbortError") {
        setErrorMsg("Parsing took too long. Try a smaller CSV or check your network.");
      } else {
        setErrorMsg(err instanceof Error ? err.message : "Network error.");
      }
      setStep("error");
    }
  }, [t, csvFormat]);

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

  const removeHolding = (idx: number) => {
    setHoldings((prev) => prev.filter((_, i) => i !== idx));
  };

  const removeTx = (idx: number) => {
    setTransactions((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleImportAll = async () => {
    const unsorted: ExtractedTransaction[] = transactions.length > 0
      ? transactions
      : holdings.map((h) => ({
          date: new Date().toISOString().slice(0, 10),
          type: "buy" as const,
          ticker: h.ticker,
          name: h.name,
          shares: h.shares,
          pricePerShare: h.purchasePrice,
          totalAmount: h.shares * h.purchasePrice,
          fees: 0,
          currency: h.displayCurrency || "EUR",
        }));

    // Sort chronologically so buys happen before sells for correct holding sync
    const derivedTransactions = [...unsorted].sort((a, b) => a.date.localeCompare(b.date));

    const validTransactions = derivedTransactions.filter((tx) => tx.date);
    const total = validTransactions.length;
    setImportProgress({ current: 0, total, errors: 0 });
    setStep("importing");

    const hCount = holdings.length;
    let txCount = 0;
    let errorCount = 0;
    const formatLabels: Record<CsvFormat, string> = {
      degiro: "DEGIRO", interactive_brokers: "IBKR", trading_212: "Trading 212",
      revolut: "Revolut", charles_schwab: "Charles Schwab", fidelity: "Fidelity",
      nordnet: "Nordnet", tastytrade: "Tastytrade", freetrade: "Freetrade",
      etoro: "eToro", wealthsimple: "Wealthsimple", questrade: "Questrade",
      firstrade: "Firstrade", simple: "CSV", ai_import: "AI",
    };
    const importSource = isImageImport ? "Image import" : `${formatLabels[csvFormat]} import`;

    const CHUNK_SIZE = 50;
    let limitReached = false;
    let totalHoldingsCapped = 0;
    for (let i = 0; i < validTransactions.length; i += CHUNK_SIZE) {
      const chunk = validTransactions.slice(i, i + CHUNK_SIZE);
      const isLastChunk = i + CHUNK_SIZE >= validTransactions.length || limitReached;
      const payload = chunk.map((tx) => ({
        holdingId: "",
        ticker: tx.ticker || tx.isin || (tx.type === "fee" ? "FEE" : "UNKNOWN"),
        name: tx.name,
        exchange: holdings.find((h) => h.ticker === tx.ticker)?.exchange || "",
        isin: tx.isin || "",
        assetType: holdings.find((h) => h.ticker === tx.ticker)?.assetType
          || ((tx.name.toUpperCase().includes("ETF") || tx.name.toUpperCase().includes("UCITS")) ? "etf" : "stock"),
        accountId: "",
        type: tx.type,
        date: tx.date,
        shares: tx.shares,
        pricePerShare: tx.pricePerShare,
        totalAmount: tx.totalAmount || tx.shares * tx.pricePerShare,
        fees: tx.fees,
        taxes: 0,
        currency: tx.currency,
        displayCurrency: tx.currency,
        notes: importSource,
        sourceRef: tx.sourceRef || "",
      }));

      try {
        const res = await fetch("/api/transactions/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transactions: payload, finalize: isLastChunk }),
        });
        if (res.ok) {
          const data = await res.json();
          txCount += data.inserted || 0;
          errorCount += data.skipped || 0;
          if (data.holdingsCapped > 0) {
            totalHoldingsCapped = data.holdingsCapped;
            limitReached = true;
          }
        } else {
          errorCount += chunk.length;
        }
      } catch {
        errorCount += chunk.length;
      }
      setImportProgress({ current: txCount + errorCount, total, errors: errorCount });

      if (limitReached) break;
    }
    setHoldingsCapped(totalHoldingsCapped);

    // Import cash balances for DEGIRO imports
    let cashCount = 0;
    if (csvFormat === "degiro" && cashBalances.length > 0 && rawCsvRef.current) {
      try {
        const cashForm = new FormData();
        cashForm.append("action", "import-cash");
        cashForm.append("broker", "degiro");
        cashForm.append("file", new Blob([rawCsvRef.current], { type: "text/csv" }), "import.csv");
        const cashRes = await fetch("/api/transactions/import-broker", {
          method: "POST",
          body: cashForm,
        });
        if (cashRes.ok) {
          const cashData = await cashRes.json();
          cashCount = cashData.cashImported || 0;
        }
      } catch {
        // cash import failure is non-blocking
      }
    }

    setImportedCount(hCount);
    setImportedTxCount(txCount);
    if (errorCount > 0 && txCount === 0) {
      setErrorMsg(t("importError"));
      setStep("error");
    } else {
      setStep("done");
    }
  };

  const focusTrapRef = useFocusTrap(isOpen, isBusy ? undefined : handleClose);

  if (!isOpen) return null;

  const totalItems = holdings.length + transactions.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className={`absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm${isBusy ? " cursor-not-allowed" : ""}`} onClick={isBusy ? undefined : handleClose} />
      <div ref={focusTrapRef} role="dialog" aria-modal="true" aria-labelledby="import-modal-title" className="relative bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl w-full max-w-2xl mx-4 shadow-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-700">
          <div>
            <h2 id="import-modal-title" className="text-lg font-bold text-gray-900 dark:text-white">{t("importPortfolio")}</h2>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{t("importDesc")}</p>
          </div>
          <button
            onClick={handleClose}
            disabled={isBusy}
            aria-label="Close"
            className={`p-1.5 rounded-lg transition-colors ${isBusy ? "opacity-30 cursor-not-allowed text-gray-400 dark:text-slate-500" : "hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 dark:text-slate-500"}`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {step === "upload" && (
            <>
              {/* Broker Sync banner */}
              {isPro && (
                <a
                  href="/import?method=snaptrade_api"
                  onClick={onClose}
                  className="flex items-center gap-3 mb-4 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-500/10 dark:to-indigo-500/10 border border-blue-200 dark:border-blue-500/30 hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-500/15 dark:hover:to-indigo-500/15 transition-colors"
                >
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75" />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-900 dark:text-white">{t("brokerSyncConnect")}</p>
                    <p className="text-[10px] text-gray-500 dark:text-slate-400 truncate">{t("brokerSyncBrokerages")}</p>
                  </div>
                  <span className="text-[9px] font-bold bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-full flex-shrink-0">Pro</span>
                </a>
              )}

              {/* Broker selector */}
              <div className="flex flex-col gap-2 mb-4">
                {([
                  { id: "degiro" as CsvFormat, label: "DEGIRO", desc: "Account.csv" },
                  { id: "interactive_brokers" as CsvFormat, label: "Interactive Brokers", desc: "Activity Statement CSV" },
                  { id: "trading_212" as CsvFormat, label: "Trading 212", desc: "History CSV export" },
                  { id: "revolut" as CsvFormat, label: "Revolut", desc: "Account statement (Excel/CSV)" },
                  { id: "charles_schwab" as CsvFormat, label: "Charles Schwab", desc: "Brokerage History CSV" },
                  { id: "fidelity" as CsvFormat, label: "Fidelity", desc: "Activity & Orders CSV" },
                  { id: "nordnet" as CsvFormat, label: "Nordnet", desc: "Transactions CSV export" },
                  { id: "tastytrade" as CsvFormat, label: "Tastytrade", desc: "Transaction History CSV" },
                  { id: "freetrade" as CsvFormat, label: "Freetrade", desc: "Activity CSV export" },
                  { id: "etoro" as CsvFormat, label: "eToro", desc: "Account Statement XLS/CSV" },
                  { id: "wealthsimple" as CsvFormat, label: "Wealthsimple", desc: "Activities Export CSV" },
                  { id: "questrade" as CsvFormat, label: "Questrade", desc: "Account Activity CSV" },
                  { id: "firstrade" as CsvFormat, label: "Firstrade", desc: "Account History CSV" },
                  { id: "simple" as CsvFormat, label: t("simpleCSV"), desc: "ticker, type, price, amount, currency" },
                  { id: "ai_import" as CsvFormat, label: t("aiImportLabel"), desc: t("aiImportDesc") },
                ]).map((fmt) => (
                  <button
                    key={fmt.id}
                    onClick={() => setCsvFormat(fmt.id)}
                    className={`text-left px-3 py-2.5 rounded-xl border-2 transition-all ${
                      csvFormat === fmt.id
                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10"
                        : "border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 hover:border-gray-300 dark:hover:border-slate-500"
                    }`}
                  >
                    <p className="text-xs font-semibold text-gray-900 dark:text-white">{fmt.label}</p>
                    <p className="text-[10px] text-gray-500 dark:text-slate-400 mt-0.5">{fmt.desc}</p>
                  </button>
                ))}
              </div>

              {csvFormat === "degiro" && (
                <div className="bg-blue-50 dark:bg-blue-500/10 rounded-xl p-3 mb-4">
                  <p className="text-xs text-blue-700 dark:text-blue-300 font-medium mb-1">{t("degiroOnlySupportTitle")}</p>
                  <p className="text-[10px] text-blue-600 dark:text-blue-400">{t("degiroInstructionsDetail")}</p>
                </div>
              )}
              {csvFormat === "interactive_brokers" && (
                <div className="bg-blue-50 dark:bg-blue-500/10 rounded-xl p-3 mb-4">
                  <p className="text-xs text-blue-700 dark:text-blue-300 font-medium mb-1">Interactive Brokers</p>
                  <p className="text-[10px] text-blue-600 dark:text-blue-400">{t("ibkrCsvInstructions")}</p>
                </div>
              )}
              {csvFormat === "trading_212" && (
                <div className="bg-blue-50 dark:bg-blue-500/10 rounded-xl p-3 mb-4">
                  <p className="text-xs text-blue-700 dark:text-blue-300 font-medium mb-1">Trading 212</p>
                  <p className="text-[10px] text-blue-600 dark:text-blue-400">{t("trading212Instructions")}</p>
                </div>
              )}
              {csvFormat === "revolut" && (
                <div className="bg-blue-50 dark:bg-blue-500/10 rounded-xl p-3 mb-4">
                  <p className="text-xs text-blue-700 dark:text-blue-300 font-medium mb-1">Revolut</p>
                  <p className="text-[10px] text-blue-600 dark:text-blue-400">{t("revolutInstructions")}</p>
                </div>
              )}
              {csvFormat === "simple" && (
                <div className="bg-blue-50 dark:bg-blue-500/10 rounded-xl p-3 mb-4">
                  <p className="text-xs text-blue-700 dark:text-blue-300 font-medium mb-1">{t("simpleCsvTitle")}</p>
                  <p className="text-[10px] text-blue-600 dark:text-blue-400 font-mono">ticker,type,price,amount,currency</p>
                  <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-1">{t("simpleCsvDesc")}</p>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); downloadImportTemplate(); }}
                    className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-medium text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-100 underline underline-offset-2 decoration-blue-300 dark:decoration-blue-500/40 hover:decoration-blue-500 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    {t("downloadTemplate")}
                  </button>
                </div>
              )}
              {csvFormat === "ai_import" && (
                <div className="bg-violet-50 dark:bg-violet-500/10 rounded-xl p-3 mb-4">
                  <p className="text-xs text-violet-700 dark:text-violet-300 font-medium mb-1">{t("aiImportGuideTitle")}</p>
                  <p className="text-[10px] text-violet-600 dark:text-violet-400">{t("aiImportGuideDetail")}</p>
                </div>
              )}

              <div
                  role="button"
                  tabIndex={0}
                  aria-label={t("importDragDrop")}
                  onClick={() => fileRef.current?.click()}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileRef.current?.click(); } }}
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
                  <p className="text-xs text-gray-400 dark:text-slate-500">
                    {csvFormat === "ai_import" ? t("importAcceptedAi") : t("importAccepted")}
                  </p>
                  <input
                    ref={fileRef}
                    type="file"
                    accept={csvFormat === "ai_import" ? ".csv,text/csv,image/png,image/jpeg,image/webp" : ".csv,text/csv"}
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
            </>
          )}

          {step === "extracting" && (
            <div className="py-16 text-center space-y-4">
              {preview && (
                <img src={preview} alt="Upload preview" className="max-h-40 mx-auto rounded-xl border border-gray-200 dark:border-slate-700 mb-4" />
              )}
              <div className="w-10 h-10 mx-auto border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-600 dark:text-slate-300">
                {isImageImport ? t("importExtracting") : t("importParsingCsv")}
              </p>
            </div>
          )}

          {step === "error" && (
            <div className="py-12 text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-full bg-red-100 dark:bg-red-500/15 flex items-center justify-center">
                <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
              </div>
              <p className="text-sm text-red-600 dark:text-red-400" role="alert">{errorMsg || t("importError")}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400">{t("importErrorHintFormat")}</p>
              <div className="flex flex-col items-center gap-2">
                <button onClick={reset} className="btn-secondary text-sm">
                  {t("cancel")} & {t("importPortfolio")}
                </button>
                {csvFormat !== "ai_import" && (
                  <button
                    onClick={() => { setCsvFormat("ai_import"); setStep("upload"); setErrorMsg(""); }}
                    className="text-xs text-violet-600 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-300 underline underline-offset-2 transition-colors"
                  >
                    {t("aiImportLabel")}
                  </button>
                )}
              </div>
            </div>
          )}

          {step === "preview" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t("importPreview")}</h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400">{t("importPreviewDesc")}</p>
                </div>
              </div>

              {preview && (
                <img src={preview} alt="Source" className="max-h-28 rounded-xl border border-gray-200 dark:border-slate-700" />
              )}

              {importWarning && (
                <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 px-3 py-2">
                  <svg className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                  </svg>
                  <p className="text-xs text-amber-700 dark:text-amber-300">{importWarning}</p>
                </div>
              )}

              {duplicatesRemoved > 0 && (
                <div className="flex items-start gap-2 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 px-3 py-2">
                  <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                  </svg>
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    {(t("importDuplicatesRemoved") || "{count} duplicate transactions already in your portfolio were removed.").replace("{count}", String(duplicatesRemoved))}
                  </p>
                </div>
              )}

              {/* Tab toggles */}
              <div className="flex gap-1 bg-gray-100 dark:bg-slate-700/50 rounded-xl p-1">
                {holdings.length > 0 && (
                  <button
                    onClick={() => setPreviewTab("holdings")}
                    className={`flex-1 text-xs font-medium px-3 py-2 rounded-lg transition-colors ${
                      previewTab === "holdings"
                        ? "bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm"
                        : "text-gray-500 dark:text-slate-400"
                    }`}
                  >
                    {t("importHoldings")} ({holdings.length})
                  </button>
                )}
                {transactions.length > 0 && (
                  <button
                    onClick={() => setPreviewTab("transactions")}
                    className={`flex-1 text-xs font-medium px-3 py-2 rounded-lg transition-colors ${
                      previewTab === "transactions"
                        ? "bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm"
                        : "text-gray-500 dark:text-slate-400"
                    }`}
                  >
                    {t("importPreviewTx")} ({transactions.length})
                  </button>
                )}
              </div>

              {/* Holdings table */}
              {previewTab === "holdings" && holdings.length > 0 && (
                <div className="border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto max-h-72 overflow-y-auto">
                    <table className="w-full text-xs">
                      <caption className="sr-only">Imported holdings preview</caption>
                      <thead className="bg-gray-50 dark:bg-slate-800/50 sticky top-0">
                        <tr className="text-gray-500 dark:text-slate-400">
                          <th scope="col" className="text-left p-2 font-medium">{t("name")}</th>
                          <th scope="col" className="text-left p-2 font-medium">{t("ticker")}</th>
                          <th scope="col" className="text-right p-2 font-medium">{t("shares")}</th>
                          <th scope="col" className="text-right p-2 font-medium">{t("purchasePrice")}</th>
                          <th scope="col" className="text-left p-2 font-medium">{t("currency")}</th>
                          <th scope="col" className="text-left p-2 font-medium">{t("editExchange")}</th>
                          <th scope="col" className="text-left p-2 font-medium">{t("assetType")}</th>
                          <th scope="col" className="p-2"></th>
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
                                onClick={() => removeHolding(i)}
                                className="text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors"
                                title={t("importRemoveRow")}
                                aria-label="Remove holding"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
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
              )}

              {/* Transactions table */}
              {previewTab === "transactions" && transactions.length > 0 && (
                <div className="border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto max-h-72 overflow-y-auto">
                    <table className="w-full text-xs">
                      <caption className="sr-only">Imported transactions preview</caption>
                      <thead className="bg-gray-50 dark:bg-slate-800/50 sticky top-0">
                        <tr className="text-gray-500 dark:text-slate-400">
                          <th scope="col" className="text-left p-2 font-medium">{t("transactionDate")}</th>
                          <th scope="col" className="text-left p-2 font-medium">{t("transactionType")}</th>
                          <th scope="col" className="text-left p-2 font-medium">{t("ticker")}</th>
                          <th scope="col" className="text-right p-2 font-medium">{t("transactionShares")}</th>
                          <th scope="col" className="text-right p-2 font-medium">{t("transactionPrice")}</th>
                          <th scope="col" className="text-right p-2 font-medium">{t("transactionTotal")}</th>
                          <th scope="col" className="text-right p-2 font-medium">{t("transactionFees")}</th>
                          <th scope="col" className="p-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.map((tx, i) => (
                          <tr key={i} className="border-t border-gray-100 dark:border-slate-700 text-gray-700 dark:text-slate-300">
                            <td className="p-2">{tx.date}</td>
                            <td className="p-2">
                              <span className={`inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-medium ${TX_TYPE_COLORS[tx.type] || ""}`}>
                                {tx.type}
                              </span>
                            </td>
                            <td className="p-2 font-mono font-medium text-gray-900 dark:text-white">{tx.ticker}</td>
                            <td className="p-2 text-right font-mono">{tx.shares > 0 ? tx.shares : "—"}</td>
                            <td className="p-2 text-right font-mono">{tx.pricePerShare > 0 ? tx.pricePerShare.toFixed(2) : "—"}</td>
                            <td className="p-2 text-right font-mono font-medium text-gray-900 dark:text-white">{tx.totalAmount.toFixed(2)}</td>
                            <td className="p-2 text-right font-mono text-gray-400">{tx.fees > 0 ? tx.fees.toFixed(2) : "—"}</td>
                            <td className="p-2">
                              <button
                                onClick={() => removeTx(i)}
                                className="text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors"
                                aria-label="Remove transaction"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
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
              )}

              {/* Cash balances from DEGIRO */}
              {cashBalances.length > 0 && (
                <div className="flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-3 py-2.5">
                  <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                  </svg>
                  <div className="text-xs text-emerald-700 dark:text-emerald-300">
                    <span className="font-medium">{t("cash")}:</span>{" "}
                    {cashBalances.map((c) =>
                      `${c.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${c.currency}`
                    ).join(", ")}
                    <span className="text-emerald-600/70 dark:text-emerald-400/70 ml-1">
                      ({t("importCashWillBeAdded")})
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === "importing" && (
            <div className="py-16 text-center space-y-5">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center">
                <svg className="w-7 h-7 text-emerald-600 dark:text-emerald-400 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-700 dark:text-slate-200" aria-live="polite">
                {t("importImporting").replace("{current}", String(importProgress.current)).replace("{total}", String(importProgress.total))}
              </p>
              <div className="max-w-xs mx-auto">
                <div
                  className="h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden"
                  role="progressbar"
                  aria-valuenow={importProgress.total > 0 ? Math.round((importProgress.current / importProgress.total) * 100) : 0}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-300 ease-out"
                    style={{ width: importProgress.total > 0 ? `${(importProgress.current / importProgress.total) * 100}%` : "0%" }}
                  />
                </div>
                {importProgress.errors > 0 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                    {importProgress.errors} {importProgress.errors === 1 ? "error" : "errors"}
                  </p>
                )}
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
              <div className="space-y-1">
                {importedCount > 0 && (
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {t("importSuccess").replace("{count}", String(importedCount))}
                  </p>
                )}
                {importedTxCount > 0 && (
                  <p className="text-sm text-gray-600 dark:text-slate-300">
                    {t("importTxSuccess").replace("{count}", String(importedTxCount))}
                  </p>
                )}
                {importProgress.errors > 0 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    {importProgress.errors} {importProgress.errors === 1 ? "transaction" : "transactions"} failed
                  </p>
                )}
              </div>
              {holdingsCapped > 0 && (
                <div className="space-y-3 max-w-md mx-auto">
                  <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">
                    {(t("importHoldingsCapped") || "{count} holding(s) skipped — Free plan allows up to 15 holdings.")
                      .replace("{count}", String(holdingsCapped))}
                  </p>
                  <ProCompareCard surface="import_holdings_capped" reason="holdings_limit_reached" compact />
                </div>
              )}
              <button onClick={handleClose} className="btn-primary text-sm">
                {t("close")}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === "preview" && (
          <div className="border-t border-gray-100 dark:border-slate-700 px-6 py-4 flex items-center justify-between">
            <button onClick={reset} className="btn-secondary text-sm">
              {t("cancel")}
            </button>
            {totalItems > 0 && (
              <button onClick={handleImportAll} className="btn-primary text-sm flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                {t("importConfirm")} ({totalItems})
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
