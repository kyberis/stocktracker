import { useState, useRef, useCallback } from "react";
import type {
  BrokerFormat,
  ExtractedTransaction,
  ExtractedHolding,
  CashBalance,
} from "./import-types";

export type { ExtractedTransaction, ExtractedHolding, CashBalance, BrokerFormat };

const FORMAT_LABELS: Record<BrokerFormat, string> = {
  degiro: "DEGIRO",
  interactive_brokers: "IBKR",
  trading_212: "Trading 212",
  revolut: "Revolut",
  charles_schwab: "Charles Schwab",
  fidelity: "Fidelity",
  nordnet: "Nordnet",
  tastytrade: "Tastytrade",
  freetrade: "Freetrade",
  etoro: "eToro",
  wealthsimple: "Wealthsimple",
  questrade: "Questrade",
  firstrade: "Firstrade",
  simple: "CSV",
};

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

export interface UseImportBrokerCSVReturn {
  step: "idle" | "parsing" | "preview" | "importing" | "done" | "error";
  transactions: ExtractedTransaction[];
  holdings: ExtractedHolding[];
  cashBalances: CashBalance[];
  duplicatesRemoved: number;
  holdingsCapped: number;
  importProgress: { current: number; total: number; errors: number };
  importedTxCount: number;
  errorMsg: string;
  parseFile: (file: File, broker: BrokerFormat, portfolioId?: string | null) => Promise<void>;
  importAll: (broker: BrokerFormat, isImageImport?: boolean, portfolioId?: string | null) => Promise<void>;
  removeTransaction: (idx: number) => void;
  removeHolding: (idx: number) => void;
  reset: () => void;
}

export function useImportBrokerCSV(): UseImportBrokerCSVReturn {
  const [step, setStep] = useState<UseImportBrokerCSVReturn["step"]>("idle");
  const [transactions, setTransactions] = useState<ExtractedTransaction[]>([]);
  const [holdings, setHoldings] = useState<ExtractedHolding[]>([]);
  const [cashBalances, setCashBalances] = useState<CashBalance[]>([]);
  const [duplicatesRemoved, setDuplicatesRemoved] = useState(0);
  const [holdingsCapped, setHoldingsCapped] = useState(0);
  const [importProgress, setImportProgress] = useState({
    current: 0,
    total: 0,
    errors: 0,
  });
  const [importedTxCount, setImportedTxCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const rawCsvRef = useRef<string>("");

  const reset = useCallback(() => {
    setStep("idle");
    setTransactions([]);
    setHoldings([]);
    setCashBalances([]);
    setDuplicatesRemoved(0);
    setHoldingsCapped(0);
    setImportProgress({ current: 0, total: 0, errors: 0 });
    setImportedTxCount(0);
    setErrorMsg("");
    rawCsvRef.current = "";
  }, []);

  const parseFile = useCallback(async (file: File, broker: BrokerFormat, portfolioId?: string | null) => {
    setStep("parsing");
    setErrorMsg("");

    try {
      const csv = await file.text();
      rawCsvRef.current = csv;

      const parseForm = new FormData();
      parseForm.append("action", "parse");
      parseForm.append("broker", broker);
      if (portfolioId) parseForm.append("portfolioId", portfolioId);
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
          setErrorMsg(apiError || "Failed to parse CSV.");
        }
        setStep("error");
        return;
      }

      const data = await parseRes.json();
      const parsedTransactions = Array.isArray(data.transactions)
        ? data.transactions
        : [];
      const dupCount = Number(data.summary?.duplicatesRemoved) || 0;

      const parsedCash: CashBalance[] = Array.isArray(data.summary?.cashBalances)
        ? data.summary.cashBalances.filter(
            (c: CashBalance) => c.currency && c.amount > 0
          )
        : [];
      setCashBalances(parsedCash);

      if (parsedTransactions.length === 0 && parsedCash.length === 0) {
        if (dupCount > 0) {
          setErrorMsg(
            `All ${dupCount} transactions in this file are already in your portfolio.`
          );
        } else {
          const unmapped = data.summary?.unmapped;
          const hint = unmapped?.length
            ? ` Unmapped ISINs: ${unmapped.join(", ")}`
            : "";
          setErrorMsg("No transactions found in CSV." + hint);
        }
        setStep("error");
        return;
      }
      setDuplicatesRemoved(dupCount);
      setHoldings([]);
      setTransactions(
        parsedTransactions.map((tx: Record<string, unknown>) =>
          normalizeTransaction(tx)
        )
      );
      setStep("preview");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setErrorMsg("Parsing took too long. Try a smaller CSV or check your network.");
      } else {
        setErrorMsg(err instanceof Error ? err.message : "Network error.");
      }
      setStep("error");
    }
  }, []);

  const removeTransaction = useCallback((idx: number) => {
    setTransactions((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const removeHolding = useCallback((idx: number) => {
    setHoldings((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const importAll = useCallback(
    async (broker: BrokerFormat, isImageImport = false, portfolioId?: string | null) => {
      const unsorted: ExtractedTransaction[] =
        transactions.length > 0
          ? transactions
          : holdings.map((h) => ({
              date: new Date().toISOString().slice(0, 10),
              type: "buy" as const,
              ticker: h.ticker,
              name: h.name,
              isin: undefined,
              shares: h.shares,
              pricePerShare: h.purchasePrice,
              totalAmount: h.shares * h.purchasePrice,
              fees: 0,
              currency: h.displayCurrency || "EUR",
            }));

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
      const importSource = isImageImport
        ? "Image import"
        : `${FORMAT_LABELS[broker]} import`;

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
            holdings.find((h) => h.ticker === tx.ticker)?.assetType ||
            (tx.name.toUpperCase().includes("ETF") ||
            tx.name.toUpperCase().includes("UCITS")
              ? "etf"
              : "stock"),
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

      if (cashBalances.length > 0 && rawCsvRef.current) {
        try {
          const cashForm = new FormData();
          cashForm.append("action", "import-cash");
          cashForm.append("broker", broker);
          if (portfolioId) cashForm.append("portfolioId", portfolioId);
          cashForm.append(
            "file",
            new Blob([rawCsvRef.current], { type: "text/csv" }),
            "import.csv"
          );
          const cashRes = await fetch("/api/transactions/import-broker", {
            method: "POST",
            body: cashForm,
          });
          if (!cashRes.ok) {
            console.warn("[import] cash import failed:", cashRes.status);
          }
        } catch (err) {
          console.warn("[import] cash import error:", err);
        }
      }

      setImportedTxCount(txCount);
      if (errorCount > 0 && txCount === 0) {
        setErrorMsg("Import failed.");
        setStep("error");
      } else {
        setStep("done");
      }
    },
    [transactions, holdings, cashBalances]
  );

  return {
    step,
    transactions,
    holdings,
    cashBalances,
    duplicatesRemoved,
    holdingsCapped,
    importProgress,
    importedTxCount,
    errorMsg,
    parseFile,
    importAll,
    removeTransaction,
    removeHolding,
    reset,
  };
}
