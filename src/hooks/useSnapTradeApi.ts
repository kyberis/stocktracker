import { useState, useCallback } from "react";
import type {
  SnapTradeConnectionInfo,
  DisabledBrokerageConnection,
  ExtractedTransaction,
} from "./import-types";

export type { SnapTradeConnectionInfo, ExtractedTransaction };

export interface UseSnapTradeApiReturn {
  connection: SnapTradeConnectionInfo | null;
  isFetching: boolean;
  transactions: ExtractedTransaction[];
  step: "idle" | "connecting" | "reconnecting" | "fetching" | "preview" | "importing" | "done" | "error";
  importedCount: number;
  errorMsg: string;
  needsReconnect: boolean;
  disabledConnections: DisabledBrokerageConnection[];
  importProgress: { current: number; total: number; errors: number };
  holdingsCapped: number;
  loadConnection: () => Promise<void>;
  connect: () => Promise<void>;
  reconnect: (connectionId: string) => Promise<void>;
  fetchPortfolio: (portfolioId?: string | null) => Promise<void>;
  resync: () => Promise<void>;
  disconnect: () => Promise<void>;
  importAll: (portfolioId?: string | null) => Promise<void>;
  removeTransaction: (idx: number) => void;
  reset: () => void;
}

function openPortalPopup(
  url: string,
  windowName: string,
  onSuccess: () => void,
  onError: (msg: string) => void,
) {
  const popup = window.open(url, windowName, "width=800,height=700");
  let resolved = false;

  const cleanup = () => {
    resolved = true;
    clearInterval(pollInterval);
    window.removeEventListener("message", handleMessage);
  };

  const handleMessage = (e: MessageEvent) => {
    if (resolved) return;
    const data = e.data;
    if (data?.status === "SUCCESS") {
      cleanup();
      popup?.close();
      onSuccess();
    } else if (data?.status === "ERROR") {
      cleanup();
      popup?.close();
      onError(data.detail || "Connection failed.");
    } else if (data === "ABANDONED") {
      cleanup();
      popup?.close();
      onSuccess();
    }
  };

  window.addEventListener("message", handleMessage);

  const pollInterval = setInterval(() => {
    if (resolved) return;
    if (!popup || popup.closed) {
      cleanup();
      onSuccess();
    }
  }, 1000);
}

function normalizeTransaction(tx: Record<string, unknown>): ExtractedTransaction {
  return {
    date: String(tx.date || ""),
    type: String(tx.type || "buy") as ExtractedTransaction["type"],
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

export function useSnapTradeApi(): UseSnapTradeApiReturn {
  const [connection, setConnection] = useState<SnapTradeConnectionInfo | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [transactions, setTransactions] = useState<ExtractedTransaction[]>([]);
  const [step, setStep] = useState<UseSnapTradeApiReturn["step"]>("idle");
  const [importedCount, setImportedCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [needsReconnect, setNeedsReconnect] = useState(false);
  const [disabledConnections, setDisabledConnections] = useState<DisabledBrokerageConnection[]>([]);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, errors: 0 });
  const [holdingsCapped, setHoldingsCapped] = useState(0);

  const loadConnection = useCallback(async () => {
    try {
      const form = new FormData();
      form.append("action", "get-connection");
      const res = await fetch("/api/snaptrade", { method: "POST", body: form });
      if (res.ok) {
        const data = await res.json();
        setConnection(data);
        const disabled: DisabledBrokerageConnection[] = data.disabledConnections || [];
        setDisabledConnections(disabled);
        setNeedsReconnect(disabled.length > 0);
      }
    } catch {
      // ignore
    }
  }, []);

  const connect = useCallback(async () => {
    setErrorMsg("");
    setStep("connecting");
    try {
      // Step 1: Register SnapTrade user if needed
      const regForm = new FormData();
      regForm.append("action", "register-user");
      const regRes = await fetch("/api/snaptrade", { method: "POST", body: regForm });
      const regData = await regRes.json();

      if (!regRes.ok) {
        setErrorMsg(regData.error || "Failed to register with SnapTrade.");
        setStep("error");
        return;
      }

      // Step 2: Get Connection Portal URL
      const urlForm = new FormData();
      urlForm.append("action", "connect-url");
      const urlRes = await fetch("/api/snaptrade", { method: "POST", body: urlForm });
      const urlData = await urlRes.json();

      if (!urlRes.ok) {
        setErrorMsg(urlData.error || "Failed to get connection URL.");
        setStep("error");
        return;
      }

      // Step 3: Open connection portal and listen for postMessage events
      openPortalPopup(
        urlData.redirectUrl,
        "snaptrade-connect",
        async () => { await loadConnection(); setStep("idle"); },
        (msg) => { setErrorMsg(msg); setStep("error"); },
      );
    } catch {
      setErrorMsg("Failed to connect to SnapTrade.");
      setStep("error");
    }
  }, [loadConnection]);

  const reconnect = useCallback(async (connectionId: string) => {
    setErrorMsg("");
    setStep("reconnecting");
    try {
      const form = new FormData();
      form.append("action", "reconnect-url");
      form.append("connectionId", connectionId);
      const res = await fetch("/api/snaptrade", { method: "POST", body: form });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "Failed to get reconnect URL.");
        setStep("error");
        return;
      }

      openPortalPopup(
        data.redirectUrl,
        "snaptrade-reconnect",
        async () => { await loadConnection(); setStep("idle"); },
        (msg) => { setErrorMsg(msg); setStep("error"); },
      );
    } catch {
      setErrorMsg("Failed to reconnect to SnapTrade.");
      setStep("error");
    }
  }, [loadConnection]);

  const fetchPortfolio = useCallback(async (portfolioId?: string | null) => {
    setErrorMsg("");
    setIsFetching(true);
    setStep("fetching");
    try {
      const form = new FormData();
      form.append("action", "fetch");
      if (portfolioId) form.append("portfolioId", portfolioId);
      const res = await fetch("/api/snaptrade", { method: "POST", body: form });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "Failed to fetch portfolio.");
        if (data.needsReconnect && data.disabledConnections?.length > 0) {
          setNeedsReconnect(true);
          setDisabledConnections(data.disabledConnections);
        }
        setStep("error");
        return;
      }

      setTransactions(
        (data.transactions || []).map((tx: Record<string, unknown>) =>
          normalizeTransaction(tx),
        ),
      );
      setStep("preview");
    } catch {
      setErrorMsg("Failed to fetch portfolio.");
      setStep("error");
    } finally {
      setIsFetching(false);
    }
  }, []);

  const resync = useCallback(async () => {
    await fetchPortfolio();
  }, [fetchPortfolio]);

  const disconnect = useCallback(async () => {
    try {
      const form = new FormData();
      form.append("action", "disconnect");
      await fetch("/api/snaptrade", { method: "POST", body: form });
      setConnection({ connected: false });
      setTransactions([]);
      setStep("idle");
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
    setNeedsReconnect(false);
    setImportProgress({ current: 0, total: 0, errors: 0 });
    setHoldingsCapped(0);
  }, []);

  const importAll = useCallback(async (portfolioId?: string | null) => {
    const validTransactions = transactions.filter((tx) => tx.date);
    const total = validTransactions.length;

    setImportProgress({ current: 0, total, errors: 0 });
    setStep("importing");

    let txCount = 0;
    let errorCount = 0;
    const importSource = "SnapTrade import";

    const CHUNK_SIZE = 50;
    let limitReached = false;
    let totalHoldingsCapped = 0;

    for (let i = 0; i < validTransactions.length; i += CHUNK_SIZE) {
      const chunk = validTransactions.slice(i, i + CHUNK_SIZE);
      const isLastChunk = i + CHUNK_SIZE >= validTransactions.length || limitReached;
      const payload = chunk.map((tx) => ({
        holdingId: "",
        ticker: tx.ticker || (tx.type === "fee" ? "FEE" : "UNKNOWN"),
        name: tx.name,
        exchange: "",
        isin: tx.isin || "",
        assetType:
          tx.name.toUpperCase().includes("ETF") || tx.name.toUpperCase().includes("UCITS")
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
        const bulkUrl = portfolioId
          ? `/api/transactions/bulk?portfolioId=${encodeURIComponent(portfolioId)}`
          : "/api/transactions/bulk";
        const res = await fetch(bulkUrl, {
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
    needsReconnect,
    disabledConnections,
    importProgress,
    holdingsCapped,
    loadConnection,
    connect,
    reconnect,
    fetchPortfolio,
    resync,
    disconnect,
    importAll,
    removeTransaction,
    reset,
  };
}
