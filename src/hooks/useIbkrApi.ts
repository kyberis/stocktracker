import { useState, useCallback } from "react";
import type {
  IbkrConnectionInfo,
  ExtractedTransaction,
} from "./import-types";

export type { IbkrConnectionInfo, ExtractedTransaction };

export interface UseIbkrApiReturn {
  connection: IbkrConnectionInfo | null;
  isFetching: boolean;
  transactions: ExtractedTransaction[];
  step: "idle" | "fetching" | "preview" | "importing" | "done" | "error";
  importedCount: number;
  errorMsg: string;
  importProgress: { current: number; total: number; errors: number };
  holdingsCapped: number;
  loadConnection: () => Promise<void>;
  fetchPortfolio: (
    token: string,
    queryId: string,
    save: boolean
  ) => Promise<void>;
  resync: () => Promise<void>;
  disconnect: () => Promise<void>;
  importAll: () => Promise<void>;
  removeTransaction: (idx: number) => void;
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

export function useIbkrApi(): UseIbkrApiReturn {
  const [connection, setConnection] = useState<IbkrConnectionInfo | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [transactions, setTransactions] = useState<ExtractedTransaction[]>([]);
  const [step, setStep] = useState<UseIbkrApiReturn["step"]>("idle");
  const [importedCount, setImportedCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [importProgress, setImportProgress] = useState({
    current: 0,
    total: 0,
    errors: 0,
  });
  const [holdingsCapped, setHoldingsCapped] = useState(0);

  const loadConnection = useCallback(async () => {
    try {
      const form = new FormData();
      form.append("action", "get-connection");
      const res = await fetch("/api/ibkr-flex", { method: "POST", body: form });
      if (res.ok) {
        const data = await res.json();
        setConnection(data);
      }
    } catch {
      // ignore
    }
  }, []);

  const fetchPortfolio = useCallback(
    async (token: string, queryId: string, save: boolean) => {
      setErrorMsg("");
      setIsFetching(true);
      try {
        const form = new FormData();
        form.append("action", "fetch");
        form.append("token", token);
        form.append("queryId", queryId);

        const res = await fetch("/api/ibkr-flex", { method: "POST", body: form });
        const data = await res.json();

        if (!res.ok) {
          setErrorMsg(data.error || "Failed to fetch portfolio.");
          setStep("error");
          return;
        }

        setTransactions(
          (data.transactions || []).map((tx: Record<string, unknown>) =>
            normalizeTransaction(tx)
          )
        );
        setStep("preview");

        if (save && token && queryId) {
          const saveForm = new FormData();
          saveForm.append("action", "save-connection");
          saveForm.append("token", token);
          saveForm.append("queryId", queryId);
          fetch("/api/ibkr-flex", { method: "POST", body: saveForm })
            .then(() => loadConnection())
            .catch(() => {});
        }
      } catch {
        setErrorMsg("Failed to fetch portfolio.");
        setStep("error");
      } finally {
        setIsFetching(false);
      }
    },
    [loadConnection]
  );

  const resync = useCallback(async () => {
    setErrorMsg("");
    setStep("fetching");
    setIsFetching(true);
    try {
      const form = new FormData();
      form.append("action", "fetch");
      form.append("useSaved", "true");

      const res = await fetch("/api/ibkr-flex", { method: "POST", body: form });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "Failed to resync portfolio.");
        setStep("error");
        return;
      }

      setTransactions(
        (data.transactions || []).map((tx: Record<string, unknown>) =>
          normalizeTransaction(tx)
        )
      );
      setStep("preview");
    } catch {
      setErrorMsg("Failed to resync portfolio.");
      setStep("error");
    } finally {
      setIsFetching(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    try {
      const form = new FormData();
      form.append("action", "delete-connection");
      await fetch("/api/ibkr-flex", { method: "POST", body: form });
      setConnection({ connected: false });
    } catch {
      // ignore
    }
  }, []);

  const removeTransaction = useCallback((idx: number) => {
    setTransactions((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const reset = useCallback(() => {
    setStep("idle");
    setTransactions([]);
    setImportedCount(0);
    setErrorMsg("");
    setImportProgress({ current: 0, total: 0, errors: 0 });
    setHoldingsCapped(0);
  }, []);

  const importAll = useCallback(async () => {
    const validTransactions = transactions.filter((tx) => tx.date);
    const total = validTransactions.length;

    setImportProgress({ current: 0, total, errors: 0 });
    setStep("importing");

    let txCount = 0;
    let errorCount = 0;
    const importSource = "IBKR import";

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
        exchange: "",
        isin: tx.isin || "",
        assetType:
          tx.name.toUpperCase().includes("ETF") ||
          tx.name.toUpperCase().includes("UCITS")
            ? "etf"
            : "stock",
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
    setImportedCount(txCount);

    if (errorCount > 0 && txCount === 0) {
      setErrorMsg("Import failed.");
      setStep("error");
    } else {
      setStep("done");
    }
  }, [transactions]);

  return {
    connection,
    isFetching,
    transactions,
    step,
    importedCount,
    errorMsg,
    importProgress,
    holdingsCapped,
    loadConnection,
    fetchPortfolio,
    resync,
    disconnect,
    importAll,
    removeTransaction,
    reset,
  };
}
