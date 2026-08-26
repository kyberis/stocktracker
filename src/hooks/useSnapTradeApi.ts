import { useState, useCallback, useMemo, useRef } from "react";
import type {
  SnapTradeConnectionInfo,
  DisabledBrokerageConnection,
  BrokerageConnection,
  BrokerSyncInfo,
  ExtractedTransaction,
  ImportAssetType,
} from "./import-types";
import { inferAssetType } from "@/lib/infer-asset-type";
import { trackImportError } from "@/lib/track-import-error";
import {
  SNAPTRADE_OAUTH_RETRY_DELAY_MS,
  markSnapTradeOAuthPending,
} from "@/lib/snaptrade-first-sync";

export type { SnapTradeConnectionInfo, ExtractedTransaction, BrokerSyncInfo };

export interface MergedBrokerInfo {
  brokerageAuthorizationId: string;
  brokerageName: string;
  disabled: boolean;
  disabledDate: string | null;
  lastImportedAt: string;
  connectedAt?: string;
  transactionCount?: number;
  hasSyncRecord: boolean;
}

export interface SnapTradeFetchResult {
  syncTriggered: boolean;
  positionsSynced: number;
  transactionCount: number;
}

export interface UseSnapTradeApiOptions {
  portfolioId?: string | null;
  onAfterFetch?: () => void | Promise<void>;
}

export interface UseSnapTradeApiReturn {
  connection: SnapTradeConnectionInfo | null;
  brokerSyncs: BrokerSyncInfo[];
  mergedBrokers: MergedBrokerInfo[];
  activeBrokerCount: number;
  connectionLimit: number;
  isFetching: boolean;
  transactions: ExtractedTransaction[];
  step: "idle" | "connecting" | "reconnecting" | "fetching" | "preview" | "importing" | "backfilling" | "done" | "error";
  importedCount: number;
  errorMsg: string;
  needsReconnect: boolean;
  disabledConnections: DisabledBrokerageConnection[];
  importProgress: { current: number; total: number; errors: number };
  holdingsCapped: number;
  lastFetchHadDateFilter: boolean;
  lastFetchSummary: { total: number; duplicatesRemoved: number } | null;
  lastFetchSyncTriggered: boolean;
  lastFetchPositionsSynced: number;
  loadConnection: () => Promise<void>;
  connect: (brokerSlug?: string) => Promise<void>;
  reconnect: (connectionId: string) => Promise<void>;
  fetchPortfolio: (portfolioId?: string | null, startDate?: string | null, brokerStartDates?: Record<string, string> | null) => Promise<SnapTradeFetchResult | null>;
  fetchAfterOAuth: () => Promise<void>;
  resync: () => Promise<void>;
  disconnect: () => Promise<void>;
  disconnectBroker: (brokerConnectionId: string) => Promise<void>;
  importAll: (portfolioId?: string | null) => Promise<void>;
  removeTransaction: (idx: number) => void;
  updateTransactionAssetType: (idx: number, assetType: ImportAssetType) => void;
  reset: () => void;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && (navigator as Record<string, unknown>).standalone === true)
  );
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
  const name = String(tx.name || "");
  const rawType = tx.assetType != null ? String(tx.assetType) : "";
  const assetType: ImportAssetType =
    rawType === "etf" || rawType === "fund" || rawType === "stock"
      ? rawType
      : (inferAssetType({ name }) as ImportAssetType);
  return {
    date: String(tx.date || ""),
    type: String(tx.type || "buy") as ExtractedTransaction["type"],
    ticker: String(tx.ticker || "").toUpperCase(),
    name,
    isin: tx.isin ? String(tx.isin) : undefined,
    shares: Number(tx.shares || 0),
    pricePerShare: Number(tx.pricePerShare || 0),
    totalAmount: Number(tx.totalAmount || 0),
    fees: Number(tx.fees || 0),
    currency: String(tx.currency || "EUR").toUpperCase(),
    sourceRef: tx.sourceRef ? String(tx.sourceRef) : undefined,
    brokerName: tx.brokerName ? String(tx.brokerName) : undefined,
    assetType,
  };
}

function persistSyncConfidence(positions: number, newTx: number, brokerNames: string[]) {
  try {
    sessionStorage.setItem("syncConfidenceResult", JSON.stringify({
      variant: "manual",
      positions,
      newTx,
      brokerNames,
      ts: new Date().toISO.stringify(),
    }));
  } catch {
    // private browsing or storage quota exceeded
  }
}

export function useSnapTradeApi(options: UseSnapTradeApiOptions = {}): UseSnapTradeApiReturn {
  const { portfolioId: defaultPortfolioId = null, onAfterFetch } = options;
  const onAfterFetchRef = useRef(onAfterFetch);
  onAfterFetchRef.current = onAfterFetch;
  const oauthRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [connection, setConnection] = useState<SnapTradeConnectionInfo | null>(null);
  const [brokerSyncs, setBrokerSyncs] = useState<BrokerSyncInfo[]>([]);
  const [brokerageConnections, setBrokerageConnections] = useState<BrokerageConnection[]>([]);
  const [activeBrokerCount, setActiveBrokerCount] = useState(0);
  const [connectionLimit, setConnectionLimit] = useState(0);
  const [isFetching, setIsFetching] = useState(false);
  const [transactions, setTransactions] = useState<ExtractedTransaction[]>([]);
  const [step, setStep] = useState<UseSnapTradeApiReturn["step"]>("idle");
  const [importedCount, setImportedCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [needsReconnect, setNeedsReconnect] = useState(false);
  const [disabledConnections, setDisabledConnections] = useState<DisabledBrokerageConnection[]>([]);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, errors: 0 });
  const [holdingsCapped, setHoldingsCapped] = useState(0);
  const [lastFetchHadDateFilter, setLastFetchHadDateFilter] = useState(false);
  const [lastFetchSummary, setLastFetchSummary] = useState<{ total: number; duplicatesRemoved: number } | null>(null);
  const [lastFetchSyncTriggered, setLastFetchSyncTriggered] = useState(false);
  const [lastFetchPositionsSynced, setLastFetchPositionsSynced] = useState(0);

  const mergedBrokers = useMemo<MergedBrokerInfo[]>(() => {
    const syncById = new Map(brokerSyncs.map((s) => [s.brokerageAuthorizationId, s]));
    const seen = new Set<string>();
    const result: MergedBrokerInfo[] = [];

    for (const conn of brokerageConnections) {
      seen.add(conn.id);
      const sync = syncById.get(conn.id);
      result.push({
        brokerageAuthorizationId: conn.id,
        brokerageName: conn.brokerageName,
        disabled: conn.disabled,
        disabledDate: conn.disabledDate,
        lastImportedAt: sync?.lastImportedAt ?? "",
        connectedAt: sync?.connectedAt,
        transactionCount: sync?.transactionCount,
        hasSyncRecord: !!sync,
      });
    }

    for (const sync of brokerSyncs) {
      if (!seen.has(sync.brokerageAuthorizationId)) {
        result.push({
          brokerageAuthorizationId: sync.brokerageAuthorizationId,
          brokerageName: sync.brokerageName,
          disabled: false,
          disabledDate: null,
          lastImportedAt: sync.lastImportedAt,
          connectedAt: sync.connectedAt,
          transactionCount: sync.transactionCount,
          hasSyncRecord: true,
        });
      }
    }

    return result;
  }, [brokerageConnections, brokerSyncs]);

  const loadConnection = useCallback(async (isRetry = false): Promise<void> => {
    try {
      const form = new FormData();
      form.append("action", "get-connection");
      const res = await fetch("/api/snaptrade", { method: "POST", body: form });
      if (res.ok) {
        const data = await res.json();
        if (data.statusCheckFailed && !isRetry) {
          await new Promise((r) => setTimeout(r, 2000));
          return loadConnection(true);
        }
        setConnection(data);
        const disabled: DisabledBrokerageConnection[] = data.disabledConnections || [];
        setDisabledConnections(disabled);
        setNeedsReconnect(disabled.length > 0);
        setBrokerSyncs(data.brokerSyncs || []);
        setBrokerageConnections(data.brokerageConnections || []);
        if (typeof data.activeBrokerCount === "number") setActiveBrokerCount(data.activeBrokerCount);
        if (typeof data.connectionLimit === "number") setConnectionLimit(data.connectionLimit);
      }
    } catch {
      // ignore
    }
  }, []);

  const fetchPortfolio = useCallback(async (
    portfolioId?: string | null,
    startDate?: string | null,
    brokerStartDates?: Record<string, string> | null,
  ): Promise<SnapTradeFetchResult | null> => {
    setErrorMsg("");
    setIsFetching(true);
    setStep("fetching");

    const hasExplicitDateFilter = !!startDate ||
      (brokerStartDates ? Object.values(brokerStartDates).some((v) => v !== "") : false);
    const hasSyncMapDefaults = !startDate && !brokerStartDates && brokerSyncs.some((bs) => bs.lastImportedAt);
    setLastFetchHadDateFilter(hasExplicitDateFilter || hasSyncMapDefaults);

    try {
      const form = new FormData();
      form.append("action", "fetch");
      const effectivePortfolioId = portfolioId ?? defaultPortfolioId;
      if (effectivePortfolioId) form.append("portfolioId", effectivePortfolioId);
      if (startDate) form.append("startDate", startDate);
      if (brokerStartDates && Object.keys(brokerStartDates).length > 0) {
        form.append("brokerStartDates", JSON.stringify(brokerStartDates));
      }
      const res = await fetch("/api/snaptrade", { method: "POST", body: form });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "Failed to fetch portfolio.");
        if (data.needsReconnect && data.disabledConnections?.length > 0) {
          setNeedsReconnect(true);
          setDisabledConnections(data.disabledConnections);
        }
        setStep("error");
        return null;
      }

      const normalized = (data.transactions || []).map((tx: Record<string, unknown>) =>
        normalizeTransaction(tx),
      );
      const positionsSynced = Number(data.positionsSynced) || 0;
      const syncTriggered = !!data.syncTriggered;

      setTransactions(normalized);
      setLastFetchSummary(data.summary ?? null);
      setLastFetchSyncTriggered(syncTriggered);
      setLastFetchPositionsSynced(positionsSynced);
      setStep("preview");

      await onAfterFetchRef.current?.();

      if (positionsSynced > 0 && normalized.length === 0) {
        persistSyncConfidence(positionsSynced, 0, []);
      }

      return {
        syncTriggered,
        positionsSynced,
        transactionCount: normalized.length,
      };
    } catch {
      trackImportError("broker_sync", "network");
      setErrorMsg("Failed to fetch portfolio.");
      setStep("error");
      return null;
    } finally {
      setIsFetching(false);
    }
  }, [brokerSyncs, defaultPortfolioId]);

  const fetchAfterOAuth = useCallback(async () => {
    if (oauthRetryTimerRef.current) {
      clearTimeout(oauthRetryTimerRef.current);
      oauthRetryTimerRef.current = null;
    }

    const first = await fetchPortfolio(defaultPortfolioId);
    if (!first?.syncTriggered) return;

    await new Promise<void>((resolve) => {
      oauthRetryTimerRef.current = setTimeout(() => {
        oauthRetryTimerRef.current = null;
        resolve();
      }, SNAPTRADE_OAUTH_RETRY_DELAY_MS);
    });
    await fetchPortfolio(defaultPortfolioId);
  }, [defaultPortfolioId, fetchPortfolio]);

  const runPostOAuthFlow = useCallback(async () => {
    await loadConnection();
    await fetchAfterOAuth();
  }, [loadConnection, fetchAfterOAuth]);

  const connect = useCallback(async (brokerSlug?: string) => {
    setErrorMsg("");
    setStep("connecting");
    try {
      const regForm = new FormData();
      regForm.append("action", "register-user");
      const regRes = await fetch("/api/snaptrade", { method: "POST", body: regForm });
      const regData = await regRes.json();

      if (!regRes.ok) {
        setErrorMsg(regData.error || "Failed to register with SnapTrade.");
        setStep("error");
        return;
      }

      const pwa = isStandalone();
      const urlForm = new FormData();
      urlForm.append("action", "connect-url");
      if (brokerSlug) {
        urlForm.append("broker", brokerSlug);
      }
      if (pwa) {
        urlForm.append("customRedirect", `${window.location.origin}/snaptrade/callback`);
      }
      const urlRes = await fetch("/api/snaptrade", { method: "POST", body: urlForm });
      const urlData = await urlRes.json();

      if (!urlRes.ok) {
        setErrorMsg(urlData.error || "Failed to get connection URL.");
        setStep("error");
        return;
      }

      if (pwa) {
        markSnapTradeOAuthPending();
        window.location.href = urlData.redirectUrl;
        return;
      }

      openPortalPopup(
        urlData.redirectUrl,
        "snaptrade-connect",
        runPostOAuthFlow,
        (msg) => { trackImportError("broker_sync", "oauth_popup_error"); setErrorMsg(msg); setStep("error"); },
      );
    } catch {
      trackImportError("broker_sync", "network");
      setErrorMsg("Failed to connect to SnapTrade.");
      setStep("error");
    }
  }, [runPostOAuthFlow]);

  const reconnect = useCallback(async (connectionId: string) => {
    setErrorMsg("");
    setStep("reconnecting");
    try {
      const pwa = isStandalone();
      const form = new FormData();
      form.append("action", "reconnect-url");
      form.append("connectionId", connectionId);
      if (pwa) {
        form.append("customRedirect", `${window.location.origin}/snaptrade/callback`);
      }
      const res = await fetch("/api/snaptrade", { method: "POST", body: form });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "Failed to get reconnect URL.");
        setStep("error");
        return;
      }

      if (pwa) {
        markSnapTradeOAuthPending();
        window.location.href = data.redirectUrl;
        return;
      }

      openPortalPopup(
        data.redirectUrl,
        "snaptrade-reconnect",
        runPostOAuthFlow,
        (msg) => { trackImportError("broker_sync", "oauth_popup_error"); setErrorMsg(msg); setStep("error"); },
      );
    } catch {
      trackImportError("broker_sync", "network");
      setErrorMsg("Failed to reconnect to SnapTrade.");
      setStep("error");
    }
  }, [runPostOAuthFlow]);

  const resync = useCallback(async () => {
    await fetchPortfolio(defaultPortfolioId);
  }, [fetchPortfolio, defaultPortfolioId]);

  const disconnect = useCallback(async () => {
    try {
      const form = new FormData();
      form.append("action", "disconnect");
      await fetch("/api/snaptrade", { method: "POST", body: form });
      setConnection({ connected: false });
      setBrokerSyncs([]);
      setBrokerageConnections([]);
      setTransactions([]);
      setStep("idle");
    } catch {
      // ignore
    }
  }, []);

  const disconnectBroker = useCallback(async (brokerConnectionId: string) => {
    try {
      const form = new FormData();
      form.append("action", "disconnect-broker");
      form.append("brokerConnectionId", brokerConnectionId);
      const res = await fetch("/api/snaptrade", { method: "POST", body: form });
      if (res.ok) {
        setBrokerageConnections((prev) => prev.filter((c) => c.id !== brokerConnectionId));
        setBrokerSyncs((prev) => prev.filter((s) => s.brokerageAuthorizationId !== brokerConnectionId));
        setActiveBrokerCount((prev) => Math.max(0, prev - 1));
      }
    } catch {
      // ignore
    }
  }, []);

  const removeTransaction = useCallback((idx: number) => {
    setTransactions((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const updateTransactionAssetType = useCallback((idx: number, assetType: ImportAssetType) => {
    setTransactions((prev) =>
      prev.map((tx, i) => (i === idx ? { ...tx, assetType } : tx)),
    );
  }, []);

  const reset = useCallback(() => {
    if (oauthRetryTimerRef.current) {
      clearTimeout(oauthRetryTimerRef.current);
      oauthRetryTimerRef.current = null;
    }
    setStep("idle");
    setTransactions([]);
    setImportedCount(0);
    setErrorMsg("");
    setImportProgress({ current: 0, total: 0, errors: 0 });
    setHoldingsCapped(0);
    setLastFetchSummary(null);
    setLastFetchSyncTriggered(false);
    setLastFetchPositionsSynced(0);
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
    const effectivePortfolioId = portfolioId ?? defaultPortfolioId;

    for (let i = 0; i < validTransactions.length; i += CHUNK_SIZE) {
      const chunk = validTransactions.slice(i, i + CHUNK_SIZE);
      const isLastChunk = i + CHUNK_SIZE >= validTransactions.length || limitReached;
      const payload = chunk.map((tx) => ({
        holdingId: "",
        ticker: tx.ticker || (tx.type === "fee" ? "FEE" : "UNKNOWN"),
        name: tx.name,
        exchange: tx.exchange || "",
        isin: tx.isin || "",
        assetType: tx.assetType || inferAssetType({ name: tx.name }),
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
        notes: tx.brokerName ? `SnapTrade · ${tx.brokerName}` : importSource,
        brokerName: tx.brokerName || "",
        sourceRef: tx.sourceRef || "",
      }));

      try {
        const bulkUrl = effectivePortfolioId
          ? `/api/transactions/bulk?portfolioId=${encodeURIComponent(effectivePortfolioId)}`
          : "/api/transactions/bulk";
        const res = await fetch(bulkUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transactions: payload, finalize: isLastChunk, skipRebuild: true }),
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

    if (txCount > 0 && effectivePortfolioId) {
      const sourceRefs = validTransactions
        .map((tx) => tx.sourceRef || "")
        .filter(Boolean);
      if (sourceRefs.length > 0) {
        try {
          const mapForm = new FormData();
          mapForm.append("action", "map-transactions");
          mapForm.append("portfolioId", effectivePortfolioId);
          mapForm.append("sourceRefs", JSON.stringify(sourceRefs));
          await fetch("/api/snaptrade", { method: "POST", body: mapForm });
        } catch { /* mapping is best-effort; auto-sync will catch up */ }
      }
    }

    if (errorCount > 0 && txCount === 0) {
      trackImportError("broker_sync", "bulk_all_failed");
      setErrorMsg("Import failed.");
      setStep("error");
    } else {
      const brokerNames = [...new Set(
        transactions.map((tx) => tx.brokerName).filter(Boolean) as string[]
      )];
      const positionCount = Math.max(
        lastFetchPositionsSynced,
        [...new Set(
          transactions.filter((tx) => tx.type === "buy" || tx.type === "sell").map((tx) => tx.ticker)
        )].length,
      );
      persistSyncConfidence(positionCount, txCount, brokerNames);
      setStep("backfilling");
      fetch("/api/portfolio/backfill-snapshots", { method: "POST" })
        .catch(() => {})
        .finally(() => setStep("done"));
    }
  }, [transactions, defaultPortfolioId, lastFetchPositionsSynced]);

  return {
    connection,
    brokerSyncs,
    mergedBrokers,
    activeBrokerCount,
    connectionLimit,
    isFetching,
    transactions,
    step,
    importedCount,
    errorMsg,
    needsReconnect,
    disabledConnections,
    importProgress,
    holdingsCapped,
    lastFetchHadDateFilter,
    lastFetchSummary,
    lastFetchSyncTriggered,
    lastFetchPositionsSynced,
    loadConnection,
    connect,
    reconnect,
    fetchPortfolio,
    fetchAfterOAuth,
    resync,
    disconnect,
    disconnectBroker,
    importAll,
    removeTransaction,
    updateTransactionAssetType,
    reset,
  };
}
