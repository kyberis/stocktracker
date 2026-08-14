import { useState, useCallback } from "react";
import type {
  ExtractedTransaction,
  ExtractedHolding,
  ImportAssetType,
} from "./import-types";
import { mergeHoldingsIntoTransactions } from "@/lib/merge-ai-import-rows";
import { inferAssetType } from "@/lib/infer-asset-type";
import { trackImportError } from "@/lib/track-import-error";

export type { ExtractedTransaction, ExtractedHolding };

export interface UseImportAIReturn {
  step: "idle" | "extracting" | "preview" | "importing" | "backfilling" | "done" | "error";
  holdings: ExtractedHolding[];
  transactions: ExtractedTransaction[];
  previewImage: string | null;
  importWarning: string;
  importProgress: { current: number; total: number; errors: number };
  importedCount: number;
  importedTxCount: number;
  holdingsCapped: number;
  errorMsg: string;
  processFile: (file: File) => Promise<void>;
  importAll: (portfolioId?: string | null) => Promise<void>;
  removeHolding: (idx: number) => void;
  removeTransaction: (idx: number) => void;
  updateHoldingAssetType: (idx: number, assetType: ImportAssetType) => void;
  updateTransactionAssetType: (idx: number, assetType: ImportAssetType) => void;
  reset: () => void;
}

function normalizeTransaction(tx: Record<string, unknown>): ExtractedTransaction {
  return {
    date: String(tx.date || ""),
    type: (String(tx.type || "buy") as ExtractedTransaction["type"]),
    ticker: String(tx.ticker || "").toUpperCase(),
    name: String(tx.name || ""),
    isin: tx.isin ? String(tx.isin) : undefined,
    shares: Number(tx.shares || 0),
    pricePerShare: Number(tx.pricePerShare || 0),
    totalAmount: Number(tx.totalAmount || 0),
    fees: Number(tx.fees || 0),
    currency: String(tx.currency || "EUR").toUpperCase(),
    sourceRef: tx.sourceRef ? String(tx.sourceRef) : undefined,
  };
}

export function useImportAI(): UseImportAIReturn {
  const [step, setStep] = useState<UseImportAIReturn["step"]>("idle");
  const [holdings, setHoldings] = useState<ExtractedHolding[]>([]);
  const [transactions, setTransactions] = useState<ExtractedTransaction[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [importWarning, setImportWarning] = useState("");
  const [importProgress, setImportProgress] = useState({
    current: 0,
    total: 0,
    errors: 0,
  });
  const [importedCount, setImportedCount] = useState(0);
  const [importedTxCount, setImportedTxCount] = useState(0);
  const [holdingsCapped, setHoldingsCapped] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");

  const reset = useCallback(() => {
    setStep("idle");
    setHoldings([]);
    setTransactions([]);
    setPreviewImage(null);
    setImportWarning("");
    setImportProgress({ current: 0, total: 0, errors: 0 });
    setImportedCount(0);
    setImportedTxCount(0);
    setHoldingsCapped(0);
    setErrorMsg("");
  }, []);

  const processFile = useCallback(async (file: File) => {
    setStep("extracting");
    setErrorMsg("");
    setPreviewImage(null);

    const isImage = file.type.startsWith("image/");
    if (isImage) {
      const reader = new FileReader();
      reader.onload = () => setPreviewImage(reader.result as string);
      reader.readAsDataURL(file);
    }

    try {
      const formData = new FormData();
      formData.append("file", file);
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
      const h = data.holdings || [];
      const tx = data.transactions || [];

      if (h.length === 0 && tx.length === 0) {
        trackImportError("ai", "ai_no_data");
        setErrorMsg(data.warning || "No data extracted from file.");
        setStep("error");
        return;
      }

      if (data.warning) setImportWarning(data.warning);
      setHoldings(h);
      setTransactions(
        Array.isArray(tx)
          ? tx.map((t: Record<string, unknown>) => normalizeTransaction(t))
          : []
      );
      setStep("preview");
    } catch (err) {
      console.error("[useImportAI] processFile failed:", err);
      trackImportError("ai", "network");
      setErrorMsg(err instanceof Error ? err.message : "Network error.");
      setStep("error");
    }
  }, []);

  const removeHolding = useCallback((idx: number) => {
    setHoldings((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const removeTransaction = useCallback((idx: number) => {
    setTransactions((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const updateHoldingAssetType = useCallback((idx: number, assetType: ImportAssetType) => {
    setHoldings((prev) => prev.map((h, i) => (i === idx ? { ...h, assetType } : h)));
  }, []);

  const updateTransactionAssetType = useCallback((idx: number, assetType: ImportAssetType) => {
    setTransactions((prev) => prev.map((tx, i) => (i === idx ? { ...tx, assetType } : tx)));
  }, []);

  const importAll = useCallback(async (portfolioId?: string | null) => {
    const unsorted = mergeHoldingsIntoTransactions(holdings, transactions);

    const derivedTransactions = [...unsorted].sort((a, b) =>
      a.date.localeCompare(b.date)
    );
    const validTransactions = derivedTransactions.filter((tx) => tx.date);
    const total = validTransactions.length;

    setImportProgress({ current: 0, total, errors: 0 });
    setStep("importing");

    const hCount = holdings.length;
    let txCount = 0;
    let errorCount = 0;
    const importSource = "AI import";

    const CHUNK_SIZE = 50;
    let limitReached = false;
    let totalHoldingsCapped = 0;

    for (let i = 0; i < validTransactions.length; i += CHUNK_SIZE) {
      const chunk = validTransactions.slice(i, i + CHUNK_SIZE);
      const isLastChunk =
        i + CHUNK_SIZE >= validTransactions.length || limitReached;
      const payload = chunk.map((tx) => ({
        holdingId: "",
        ticker:
          tx.ticker ||
          tx.isin ||
          (tx.type === "fee" ? "FEE" : "UNKNOWN"),
        name: tx.name,
        exchange:
          holdings.find((h) => h.ticker === tx.ticker)?.exchange || "",
        isin: tx.isin || "",
        assetType:
          tx.assetType ||
          holdings.find((h) => h.ticker === tx.ticker)?.assetType ||
          inferAssetType({ name: tx.name }),
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
        const bulkUrl = portfolioId
          ? `/api/transactions/bulk?portfolioId=${encodeURIComponent(portfolioId)}`
          : "/api/transactions/bulk";
        const res = await fetch(bulkUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transactions: payload,
            finalize: isLastChunk,
          }),
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
          if (!errorMsg) {
            const data = await res.json().catch(() => null);
            const detail =
              typeof data?.error === "string"
                ? data.error
                : `Import request failed (${res.status}).`;
            setErrorMsg(detail);
          }
        }
      } catch {
        errorCount += chunk.length;
      }
      setImportProgress({
        current: txCount + errorCount,
        total,
        errors: errorCount,
      });
      if (limitReached) break;
    }

    setHoldingsCapped(totalHoldingsCapped);
    setImportedCount(hCount);
    setImportedTxCount(txCount);

    if (errorCount > 0 && txCount === 0) {
      trackImportError("ai", "bulk_all_failed");
      setErrorMsg((prev) => prev || "Import failed.");
      setStep("error");
    } else {
      setStep("backfilling");
      fetch("/api/portfolio/backfill-snapshots", { method: "POST" })
        .catch(() => {})
        .finally(() => setStep("done"));
    }
  }, [transactions, holdings]);

  return {
    step,
    holdings,
    transactions,
    previewImage,
    importWarning,
    importProgress,
    importedCount,
    importedTxCount,
    holdingsCapped,
    errorMsg,
    processFile,
    importAll,
    removeHolding,
    removeTransaction,
    updateHoldingAssetType,
    updateTransactionAssetType,
    reset,
  };
}
