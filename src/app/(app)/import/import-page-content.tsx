"use client";

import { useState, useRef, useCallback, useEffect, DragEvent } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { usePortfolio } from "@/lib/portfolio-context";
import { useSettings } from "@/lib/settings-context";
import { useTrack } from "@/lib/use-track";
import { useImportBrokerCSV } from "@/hooks/useImportBrokerCSV";
import { useImportAI } from "@/hooks/useImportAI";
import { useSnapTradeApi } from "@/hooks/useSnapTradeApi";
import { IMPORT_GUIDES, type ImportGuide } from "@/lib/import-guides";
import { downloadImportTemplate } from "@/lib/download-import-template";
import ProCompareCard from "@/components/ProCompareCard";
import TierFeatureBadge from "@/components/TierFeatureBadge";
import AdSlot from "@/components/AdSlot";
import type { BrokerFormat } from "@/hooks/import-types";
import type { SearchResult } from "@/lib/types";

type ImportMethod = "broker_csv" | "snaptrade_api" | "ai_import" | "manual";

const TX_TYPE_COLORS: Record<string, string> = {
  buy: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  sell: "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400",
  dividend: "bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400",
  fee: "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400",
};

const METHOD_TABS: { key: ImportMethod; icon: string }[] = [
  { key: "broker_csv", icon: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" },
  { key: "snaptrade_api", icon: "M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75" },
  { key: "ai_import", icon: "M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" },
  { key: "manual", icon: "M12 4v16m8-8H4" },
];

const BROKER_OPTIONS: { id: BrokerFormat; label: string; guideId: string }[] = [
  { id: "degiro", label: "DEGIRO", guideId: "degiro" },
  { id: "interactive_brokers", label: "Interactive Brokers", guideId: "interactive_brokers_csv" },
  { id: "trading_212", label: "Trading 212", guideId: "trading_212" },
  { id: "revolut", label: "Revolut", guideId: "revolut" },
  { id: "charles_schwab", label: "Charles Schwab", guideId: "charles_schwab" },
  { id: "fidelity", label: "Fidelity", guideId: "fidelity" },
  { id: "nordnet", label: "Nordnet", guideId: "nordnet" },
  { id: "tastytrade", label: "Tastytrade", guideId: "tastytrade" },
  { id: "freetrade", label: "Freetrade", guideId: "freetrade" },
  { id: "etoro", label: "eToro", guideId: "etoro" },
  { id: "wealthsimple", label: "Wealthsimple", guideId: "wealthsimple" },
  { id: "questrade", label: "Questrade", guideId: "questrade" },
  { id: "firstrade", label: "Firstrade", guideId: "firstrade" },
  { id: "simple", label: "Simple CSV", guideId: "simple_csv" },
];

function InlineGuide({ guide, locale }: { guide: ImportGuide; locale: string }) {
  const isEs = locale === "es";
  const title = isEs ? guide.titleEs : guide.titleEn;
  const steps = isEs ? guide.stepsEs : guide.stepsEn;
  const note = isEs ? guide.noteEs : guide.noteEn;

  return (
    <div className="bg-blue-50 dark:bg-blue-500/10 rounded-xl p-4 space-y-2">
      <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">{title}</p>
      <ol className="list-decimal list-inside space-y-1">
        {steps.map((s, i) => (
          <li key={i} className="text-[11px] text-blue-600 dark:text-blue-400 leading-relaxed">{s}</li>
        ))}
      </ol>
      {note && (
        <p className="text-[10px] text-blue-500 dark:text-blue-400/70 italic">{note}</p>
      )}
    </div>
  );
}

export default function ImportPageContent() {
  const { t, language: locale } = useI18n();
  const { user, isLoading: authLoading } = useAuth();
  const { addHolding, refreshHoldings, activePortfolioId, portfolios } = usePortfolio();
  const { getApiHeaders } = useSettings();
  const track = useTrack();

  const activePortfolioName = activePortfolioId
    ? portfolios.find((p) => p.id === activePortfolioId)?.name
    : undefined;
  const isPro = user?.plan === "pro";
  const canUseBrokerSync = user?.plan === "pro" || user?.plan === "starter";

  // Active import method
  const [method, setMethod] = useState<ImportMethod>("broker_csv");
  const [broker, setBroker] = useState<BrokerFormat>("degiro");
  const [isDragOver, setIsDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Hooks
  const brokerCSV = useImportBrokerCSV();
  const aiImport = useImportAI();
  const snapTradeApi = useSnapTradeApi();
  const [snapTradeStartDate, setSnapTradeStartDate] = useState<Record<string, string>>({});

  // Manual add stock state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedStock, setSelectedStock] = useState<SearchResult | null>(null);
  const [stockName, setStockName] = useState("");
  const [stockTicker, setStockTicker] = useState("");
  const [stockShares, setStockShares] = useState("");
  const [stockPrice, setStockPrice] = useState("");
  const [stockCurrency, setStockCurrency] = useState("USD");
  const [stockExchange, setStockExchange] = useState("");
  const [stockAssetType, setStockAssetType] = useState<"stock" | "etf">("stock");
  const [manualAdded, setManualAdded] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Smart defaults: load last method + broker sync connection on mount
  useEffect(() => {
    track("import_page_viewed");

    // URL param takes precedence (e.g. reconnect banner, PWA redirect callback)
    const urlParams = new URLSearchParams(window.location.search);
    const urlMethod = urlParams.get("method") as ImportMethod | null;
    if (urlMethod && METHOD_TABS.some((m) => m.key === urlMethod)) {
      setMethod(urlMethod);
      localStorage.setItem("trefolio_last_import_method", urlMethod);
    } else {
      const lastMethod = localStorage.getItem("trefolio_last_import_method") as ImportMethod | null;
      if (lastMethod && METHOD_TABS.some((m) => m.key === lastMethod)) {
        setMethod(lastMethod);
      }
    }

    const lastBroker = localStorage.getItem("trefolio_last_import_broker") as BrokerFormat | null;
    if (lastBroker && BROKER_OPTIONS.some((b) => b.id === lastBroker)) {
      setBroker(lastBroker);
    }
    snapTradeApi.loadConnection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMethodChange = (m: ImportMethod) => {
    setMethod(m);
    localStorage.setItem("trefolio_last_import_method", m);
    track("import_method_selected", { method: m });
  };

  const handleBrokerChange = (b: BrokerFormat) => {
    setBroker(b);
    localStorage.setItem("trefolio_last_import_broker", b);
    brokerCSV.reset();
    track("import_method_selected", { method: "broker_csv", broker: b });
  };

  // Broker CSV file handling
  const handleBrokerFile = useCallback(async (file: File) => {
    track("import_file_uploaded", { method: "broker_csv", fileType: file.type, fileSize: String(file.size) });
    await brokerCSV.parseFile(file, broker, activePortfolioId);
  }, [broker, brokerCSV, track, activePortfolioId]);

  const handleBrokerFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleBrokerFile(file);
  };

  const handleBrokerDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleBrokerFile(file);
  };

  // AI file handling
  const aiFileRef = useRef<HTMLInputElement>(null);
  const [aiDragOver, setAiDragOver] = useState(false);

  const handleAiFile = useCallback(async (file: File) => {
    track("import_file_uploaded", { method: "ai_import", fileType: file.type, fileSize: String(file.size) });
    await aiImport.processFile(file);
  }, [aiImport, track]);

  const handleAiFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleAiFile(file);
  };

  const handleAiDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setAiDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleAiFile(file);
  };

  // Stock search
  const searchStocks = useCallback(async (q: string) => {
    if (q.length < 1) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const params = new URLSearchParams({ q });
      const headers = getApiHeaders();
      const res = await fetch(`/api/search?${params}`, { headers });
      if (res.ok) setSearchResults(await res.json());
    } catch { setSearchResults([]); }
    finally { setSearching(false); }
  }, [getApiHeaders]);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setSelectedStock(null);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => searchStocks(value), 300);
  };

  const handleSelectStock = (r: SearchResult) => {
    setSelectedStock(r);
    setSearchQuery(r.symbol);
    setStockName(r.shortname);
    setStockTicker(r.symbol);
    setStockExchange(r.exchange);
    setSearchResults([]);
  };

  const handleAddStock = async () => {
    if (!stockName.trim() || !stockTicker.trim() || !stockExchange.trim() || !stockShares || !stockPrice) return;
    await addHolding({
      name: stockName.trim(),
      ticker: stockTicker.trim().toUpperCase(),
      isin: "",
      assetType: stockAssetType,
      shares: parseFloat(stockShares),
      purchasePrice: parseFloat(stockPrice),
      displayCurrency: stockCurrency,
      exchange: stockExchange.trim().toUpperCase(),
      valueInEUR: 0,
    });
    setManualAdded(true);
    setSearchQuery("");
    setSelectedStock(null);
    setStockName("");
    setStockTicker("");
    setStockShares("");
    setStockPrice("");
    setStockCurrency("USD");
    setStockExchange("");
    setStockAssetType("stock");
    setTimeout(() => setManualAdded(false), 3000);
  };

  // Import complete handlers
  const handleBrokerImportAll = async () => {
    await brokerCSV.importAll(broker, false, activePortfolioId);
    track("import_completed", { method: "broker_csv", broker, txCount: String(brokerCSV.transactions.length) });
    refreshHoldings();
  };

  const handleAiImportAll = async () => {
    await aiImport.importAll(activePortfolioId);
    track("import_completed", { method: "ai_import", holdingsCount: String(aiImport.holdings.length), txCount: String(aiImport.transactions.length) });
    refreshHoldings();
  };

  const handleSnapTradeImportAll = async () => {
    await snapTradeApi.importAll(activePortfolioId);
    track("import_completed", { method: "snaptrade_api", txCount: String(snapTradeApi.transactions.length) });
    refreshHoldings();
  };

  const methodLabel = (key: ImportMethod): string => {
    const map: Record<ImportMethod, string> = {
      broker_csv: t("importSectionBrokerCsv"),
      snaptrade_api: t("importSectionBrokerSync"),
      ai_import: t("importSectionAi"),
      manual: t("importSectionManual"),
    };
    return map[key];
  };

  const currentGuide = BROKER_OPTIONS.find((b) => b.id === broker);
  const guide = currentGuide ? IMPORT_GUIDES.find((g) => g.id === currentGuide.guideId) : undefined;
  const aiGuide = IMPORT_GUIDES.find((g) => g.id === "ai_import");
  const snapTradeGuide = IMPORT_GUIDES.find((g) => g.id === "snaptrade_api");

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-24 sm:pb-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t("importPageTitle")}</h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{t("importPageSubtitle")}</p>
        {activePortfolioName && (
          <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
            <svg className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
            </svg>
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
              {t("importingToPortfolio").replace("{name}", activePortfolioName)}
            </span>
          </div>
        )}
      </div>

      {/* Method tabs */}
      <div className="flex gap-1.5 mb-6 overflow-x-auto scrollbar-none -mx-1 px-1">
        {METHOD_TABS.map((tab) => {
          const active = method === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => handleMethodChange(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all min-h-[44px] ${
                active
                  ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-2 border-emerald-500"
                  : "bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-400 border-2 border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600"
              }`}
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d={tab.icon} />
              </svg>
              {methodLabel(tab.key)}
              {tab.key === "snaptrade_api" && (
                <TierFeatureBadge requiredPlan="starter" size="xs" />
              )}
              {tab.key === "ai_import" && (
                <TierFeatureBadge requiredPlan="pro" size="xs" />
              )}
            </button>
          );
        })}
      </div>

      {/* ═══════════ BROKER CSV ═══════════ */}
      {method === "broker_csv" && (
        <div className="space-y-4">
          {/* Broker selector */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {BROKER_OPTIONS.map((b) => (
              <button
                key={b.id}
                onClick={() => handleBrokerChange(b.id)}
                className={`text-left px-3 py-2.5 rounded-xl border-2 transition-all min-h-[44px] ${
                  broker === b.id
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10"
                    : "border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 hover:border-gray-300 dark:hover:border-slate-500"
                }`}
              >
                <p className="text-xs font-semibold text-gray-900 dark:text-white">{b.label}</p>
              </button>
            ))}
          </div>

          {/* Inline guide */}
          {guide && <InlineGuide guide={guide} locale={locale} />}

          {/* Simple CSV template download */}
          {broker === "simple" && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => downloadImportTemplate()}
                className="inline-flex items-center gap-1.5 text-[11px] font-medium text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-100 underline underline-offset-2 decoration-blue-300 dark:decoration-blue-500/40 hover:decoration-blue-500 transition-colors min-h-[44px]"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                {t("downloadTemplate")}
              </button>
            </div>
          )}

          {/* Upload / Preview / Importing / Done / Error */}
          {brokerCSV.step === "idle" && (
            <div
              role="button"
              tabIndex={0}
              aria-label={t("importDragDrop")}
              onClick={() => fileRef.current?.click()}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileRef.current?.click(); } }}
              onDrop={handleBrokerDrop}
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors min-h-[44px] ${
                isDragOver
                  ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10"
                  : "border-gray-300 dark:border-slate-600 hover:border-emerald-400 dark:hover:border-emerald-500/50 bg-gray-50 dark:bg-slate-700/30"
              }`}
            >
              <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center">
                <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">{t("importDragDrop")}</p>
              <p className="text-xs text-gray-400 dark:text-slate-500">{t("importAccepted")}</p>
              <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={handleBrokerFileSelect} className="hidden" />
            </div>
          )}

          {brokerCSV.step === "parsing" && <LoadingSpinner label={t("importParsingCsv")} />}

          {brokerCSV.step === "error" && (
            <ErrorCard
              message={brokerCSV.errorMsg}
              onReset={brokerCSV.reset}
              onTryAi={() => { handleMethodChange("ai_import"); brokerCSV.reset(); }}
              t={t}
            />
          )}

          {brokerCSV.step === "preview" && (
            <PreviewPanel
              transactions={brokerCSV.transactions}
              holdings={brokerCSV.holdings}
              cashBalances={brokerCSV.cashBalances}
              duplicatesRemoved={brokerCSV.duplicatesRemoved}
              onRemoveTx={brokerCSV.removeTransaction}
              onRemoveHolding={brokerCSV.removeHolding}
              onImport={handleBrokerImportAll}
              onReset={brokerCSV.reset}
              t={t}
              track={track}
            />
          )}

          {brokerCSV.step === "importing" && <ImportingProgress progress={brokerCSV.importProgress} t={t} />}

          {brokerCSV.step === "done" && (
            <DoneCard txCount={brokerCSV.importedTxCount} holdingsCapped={brokerCSV.holdingsCapped} onReset={brokerCSV.reset} t={t} />
          )}
        </div>
      )}

      {/* ═══════════ BROKER SYNC ═══════════ */}
      {method === "snaptrade_api" && (
        <div className="space-y-4">
          {authLoading ? (
            <div className="py-12"><div className="w-8 h-8 mx-auto border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : !canUseBrokerSync ? (
            <div className="bg-white dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden">
              <div className="text-center px-5 py-8">
                <div className="w-12 h-12 rounded-[14px] bg-violet-100 dark:bg-violet-500/15 inline-flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-violet-600 dark:text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                  {t("brokerSyncGateTitle") || "Automatic Broker Sync"}
                </h3>
                <p className="text-sm text-gray-500 dark:text-slate-400 max-w-md mx-auto mb-5">
                  {t("brokerSyncGateDesc") || "Connect your broker and your portfolio syncs automatically every 6 hours. No more manual CSV uploads."}
                </p>

                <div className="flex gap-3 justify-center flex-wrap mb-5">
                  {[
                    t("brokerSyncGateBenefit1") || "Auto-import holdings",
                    t("brokerSyncGateBenefit2") || "Syncs every 6 hours",
                    t("brokerSyncGateBenefit3") || "20+ brokers",
                  ].map((label) => (
                    <div key={label} className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><polyline points="20 6 9 17 4 12" /></svg>
                      <span className="text-xs text-gray-500 dark:text-slate-400">{label}</span>
                    </div>
                  ))}
                </div>

                <a
                  href="/billing"
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors shadow-sm min-h-[44px]"
                >
                  {t("brokerSyncGateCta") || "Upgrade to Bifolio — €2.99/mo"}
                </a>
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-3">
                  {t("brokerSyncGateAlt") || "or"}{" "}
                  <a href="/billing" className="underline hover:text-violet-600 dark:hover:text-violet-400">Trefolio</a>{" "}
                  {t("brokerSyncGateAltSuffix") || "for unlimited connections"}
                </p>
              </div>
            </div>
          ) : (
            <>
              {snapTradeGuide && snapTradeApi.step === "idle" && <InlineGuide guide={snapTradeGuide} locale={locale} />}

              {snapTradeApi.connection?.connected ? (
                <>
                  {snapTradeApi.step === "idle" && (
                    <>
                      {snapTradeApi.needsReconnect && snapTradeApi.disabledConnections.length > 0 && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-amber-200/60 dark:border-amber-500/25 bg-amber-50 dark:bg-amber-500/[0.06]">
                          <svg className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                          </svg>
                          <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">{t("brokerSyncAutoPaused") || "Auto-sync paused"}</span>
                          <span className="text-xs text-gray-400 dark:text-slate-500">·</span>
                          <span className="text-xs text-gray-600 dark:text-slate-400">
                            {snapTradeApi.disabledConnections.length} {snapTradeApi.disabledConnections.length === 1 ? (t("brokerSyncNeedsAttention1") || "connection needs attention") : (t("brokerSyncNeedsAttentionN") || "connections need attention")}
                          </span>
                        </div>
                      )}

                      {/* Per-brokerage cards */}
                      {snapTradeApi.mergedBrokers.length > 0 ? (
                        <div className={`grid gap-3 ${snapTradeApi.mergedBrokers.length > 1 ? "sm:grid-cols-2" : "grid-cols-1"}`}>
                          {snapTradeApi.mergedBrokers.map((bs) => {
                            const isDisabled = bs.disabled;
                            const dateKey = bs.brokerageAuthorizationId;
                            const userTouched = dateKey in snapTradeStartDate;
                            const displayDate = userTouched ? snapTradeStartDate[dateKey] : (bs.lastImportedAt ? bs.lastImportedAt.slice(0, 10) : "");
                            const initials = bs.brokerageName.replace(/[^A-Z]/g, "").slice(0, 2) || bs.brokerageName.slice(0, 2).toUpperCase();
                            const connectedDate = bs.connectedAt ? new Date(bs.connectedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : null;
                            const lastImportDate = bs.lastImportedAt ? new Date(bs.lastImportedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) + " at " + new Date(bs.lastImportedAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) : null;
                            const txCount = bs.transactionCount ?? 0;
                            const neverSynced = !bs.hasSyncRecord;

                            const expiredDate = bs.disabledDate ? new Date(bs.disabledDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : null;
                            const isSyncingThis = snapTradeApi.isFetching && snapTradeApi.syncingBrokerId === dateKey;

                            return (
                              <div key={dateKey} className={`border rounded-xl p-4 ${isDisabled ? "bg-white dark:bg-slate-800/50 border-amber-300/60 dark:border-amber-500/30" : neverSynced ? "bg-white dark:bg-slate-800/60 border-blue-200 dark:border-blue-500/30" : "bg-white dark:bg-slate-800/60 border-gray-200 dark:border-slate-700"}`}>
                                {/* Header: logo + name + status badge */}
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-3">
                                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold text-white ${isDisabled ? "bg-amber-500" : neverSynced ? "bg-blue-600" : "bg-emerald-600"}`}>
                                      {initials}
                                    </div>
                                    <div>
                                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{bs.brokerageName}</p>
                                      <p className="text-[10px] text-gray-400 dark:text-slate-500">
                                        {isDisabled && expiredDate
                                          ? `${t("brokerSyncStatusExpired") || "Expired"} ${expiredDate}`
                                          : connectedDate
                                            ? `${t("brokerSyncConnectedSince") || "Connected"} ${connectedDate}`
                                            : null}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                      isDisabled
                                        ? "bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400"
                                        : neverSynced
                                          ? "bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400"
                                          : "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                                    }`}>
                                      {isDisabled ? (
                                        <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                      ) : (
                                        <span className={`w-1.5 h-1.5 rounded-full ${neverSynced ? "bg-blue-500" : "bg-emerald-500"}`} />
                                      )}
                                      {isDisabled ? t("brokerSyncStatusExpired") || "Expired" : neverSynced ? t("brokerSyncStatusNew") || "New" : t("brokerSyncStatusActive") || "Active"}
                                    </span>
                                    <button
                                      onClick={() => {
                                        if (confirm((t("brokerSyncDisconnectBrokerConfirm") || "Disconnect {name}? You can reconnect it later.").replace("{name}", bs.brokerageName))) {
                                          snapTradeApi.disconnectBroker(bs.brokerageAuthorizationId);
                                        }
                                      }}
                                      className="p-1 rounded-md text-gray-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                                      aria-label={`${t("brokerSyncDisconnectBroker") || "Disconnect"} ${bs.brokerageName}`}
                                      title={t("brokerSyncDisconnectBroker") || "Disconnect broker"}
                                    >
                                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M18.36 5.64a9 9 0 11-12.73 0" /><line x1="12" y1="2" x2="12" y2="12" />
                                      </svg>
                                    </button>
                                  </div>
                                </div>

                                {/* Separator */}
                                <div className={`border-t my-2.5 ${isDisabled ? "border-amber-100 dark:border-amber-500/15" : "border-gray-100 dark:border-slate-700"}`} />

                                {isDisabled ? (
                                  <>
                                    {/* Expired card: last sync + reconnect */}
                                    <div className="flex items-end justify-between">
                                      <div>
                                        <p className="text-[10px] text-gray-400 dark:text-slate-500">{t("brokerSyncLastSuccessSync") || "Last successful sync"}</p>
                                        <p className="text-xs font-medium text-gray-700 dark:text-slate-300">
                                          {lastImportDate || t("brokerSyncNeverImported")}
                                        </p>
                                        <p className="text-[11px] text-amber-600 dark:text-amber-400/80 mt-1.5">
                                          {t("brokerSyncExpiredExplanation") || "Access token expired. Re-authorize to resume syncing."}
                                        </p>
                                      </div>
                                      <button
                                        onClick={() => snapTradeApi.reconnect(bs.brokerageAuthorizationId)}
                                        className="shrink-0 ml-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-white text-xs font-semibold transition-colors min-h-[36px]"
                                      >
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" /></svg>
                                        {t("brokerSyncReconnect")}
                                      </button>
                                    </div>
                                  </>
                                ) : neverSynced ? (
                                  <>
                                    {/* Never-synced card: prompt to sync */}
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <p className="text-[10px] text-gray-400 dark:text-slate-500">{t("brokerSyncLastImported")}</p>
                                        <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
                                          {t("brokerSyncNeverSynced") || "Never synced"}
                                        </p>
                                      </div>
                                      <div className="text-right">
                                        <p className="text-[10px] text-gray-400 dark:text-slate-500">{t("brokerSyncTransactions") || "Transactions"}</p>
                                        <p className="text-xs font-medium text-gray-700 dark:text-slate-300">—</p>
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => snapTradeApi.fetchBroker(dateKey, activePortfolioId, snapTradeStartDate[dateKey] || null)}
                                      disabled={snapTradeApi.isFetching}
                                      className="mt-3 w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold transition-colors min-h-[36px]"
                                    >
                                      <svg className={`w-3.5 h-3.5 ${isSyncingThis ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" /></svg>
                                      {isSyncingThis ? t("brokerSyncFetching") : t("brokerSyncSyncBroker") || "Sync"}
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    {/* Active card: stats + start date */}
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <p className="text-[10px] text-gray-400 dark:text-slate-500">{t("brokerSyncLastImported")}</p>
                                        <p className="text-xs font-medium text-gray-700 dark:text-slate-300">
                                          {lastImportDate || t("brokerSyncNeverImported")}
                                        </p>
                                      </div>
                                      <div className="text-right">
                                        <p className="text-[10px] text-gray-400 dark:text-slate-500">{t("brokerSyncTransactions") || "Transactions"}</p>
                                        <p className="text-xs font-medium text-gray-700 dark:text-slate-300">{txCount > 0 ? `${txCount} synced` : "—"}</p>
                                      </div>
                                    </div>

                                    {!snapTradeApi.needsReconnect && (
                                      <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-gray-100 dark:border-slate-700/50">
                                        <label className="text-[10px] text-gray-400 dark:text-slate-500 whitespace-nowrap">{t("brokerSyncStartDate")}:</label>
                                        <input
                                          type="date"
                                          value={displayDate}
                                          onChange={(e) => setSnapTradeStartDate((prev) => ({ ...prev, [dateKey]: e.target.value }))}
                                          className="text-xs px-2 py-1 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white min-h-[32px]"
                                        />
                                        {displayDate && (
                                          <button
                                            onClick={() => setSnapTradeStartDate((prev) => ({ ...prev, [dateKey]: "" }))}
                                            className="text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"
                                            aria-label="Clear date"
                                          >
                                            ✕
                                          </button>
                                        )}
                                        <button
                                          onClick={() => snapTradeApi.fetchBroker(dateKey, activePortfolioId, snapTradeStartDate[dateKey] || null)}
                                          disabled={snapTradeApi.isFetching}
                                          className="ml-auto shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 disabled:opacity-50 text-gray-700 dark:text-slate-300 text-[11px] font-medium transition-colors min-h-[32px]"
                                        >
                                          <svg className={`w-3 h-3 ${isSyncingThis ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" /></svg>
                                          {isSyncingThis ? t("brokerSyncFetching") : t("brokerSyncSyncBroker") || "Sync"}
                                        </button>
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="bg-white dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700 rounded-xl p-4">
                          <div className="flex items-center gap-2 mb-1">
                            <div className={`w-2 h-2 rounded-full ${snapTradeApi.needsReconnect ? "bg-amber-500" : "bg-emerald-500 animate-pulse"}`} />
                            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">{t("brokerSyncConnected")}</span>
                          </div>
                          <p className="text-[10px] text-gray-500 dark:text-slate-400">
                            {t("brokerSyncLastSynced")}: {snapTradeApi.connection.lastSyncedAt ? new Date(snapTradeApi.connection.lastSyncedAt).toLocaleString() : t("brokerSyncNeverSynced")}
                          </p>
                        </div>
                      )}

                      {/* Auto-sync status bar */}
                      {!snapTradeApi.needsReconnect && snapTradeApi.connection?.lastSyncedAt && (
                        <div className="bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/50 rounded-lg px-3 py-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] font-medium text-gray-600 dark:text-slate-400">{t("brokerSyncAutoSyncActive") || "Auto-sync active"}</span>
                          </div>
                          <div className="text-[10px] text-gray-400 dark:text-slate-500 flex items-center gap-3">
                            <span>{t("brokerSyncLastSynced") || "Last synced"}: {new Date(snapTradeApi.connection.lastSyncedAt).toLocaleString()}</span>
                            <span>•</span>
                            <span>{t("brokerSyncAutoSyncDesc") || "Syncs every 6h"}</span>
                          </div>
                        </div>
                      )}

                      {/* At-limit upgrade card (Bifolio: 1/1 used) */}
                      {snapTradeApi.connectionLimit < 999 && snapTradeApi.activeBrokerCount >= snapTradeApi.connectionLimit && (
                        <div className="rounded-xl border border-violet-300/25 dark:border-violet-500/25 bg-gradient-to-br from-violet-500/[0.06] to-violet-500/[0.02] dark:from-violet-500/10 dark:to-violet-500/[0.03] p-3.5 flex items-center justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2 mb-0.5">
                              <TierFeatureBadge requiredPlan="starter" size="xs" />
                              <span className="text-xs font-semibold text-gray-700 dark:text-slate-300">
                                {snapTradeApi.activeBrokerCount} / {snapTradeApi.connectionLimit} {t("brokerSyncConnectionUsed") || "connection used"}
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-500 dark:text-slate-400">
                              {t("brokerSyncUpgradeForUnlimited") || "Upgrade to Trefolio for unlimited broker connections"}
                            </p>
                          </div>
                          <a href="/billing" className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition-colors shadow-sm min-h-[44px]">
                            {t("upgrade") || "Upgrade"}
                          </a>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex gap-2">
                          {!snapTradeApi.needsReconnect && (
                            <button
                              onClick={() => {
                                const overrides: Record<string, string> = {};
                                for (const bs of snapTradeApi.mergedBrokers) {
                                  const key = bs.brokerageAuthorizationId;
                                  if (key in snapTradeStartDate) {
                                    overrides[key] = snapTradeStartDate[key];
                                  }
                                }
                                const hasOverrides = Object.keys(overrides).length > 0;
                                snapTradeApi.fetchPortfolio(activePortfolioId, null, hasOverrides ? overrides : null);
                              }}
                              disabled={snapTradeApi.isFetching}
                              className="btn-primary text-xs px-4 py-2 min-h-[44px] inline-flex items-center gap-1.5"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <polyline points="23 4 23 10 17 10" />
                                <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
                              </svg>
                              {snapTradeApi.isFetching ? t("brokerSyncFetching") : t("brokerSyncResync")}
                            </button>
                          )}
                          {snapTradeApi.activeBrokerCount < snapTradeApi.connectionLimit && (
                            <button onClick={() => snapTradeApi.connect()} className="btn-secondary text-xs px-4 py-2 min-h-[44px] inline-flex items-center gap-1.5">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <line x1="12" y1="5" x2="12" y2="19" />
                                <line x1="5" y1="12" x2="19" y2="12" />
                              </svg>
                              {t("brokerSyncAddBrokerage")}
                            </button>
                          )}
                          <button
                            onClick={() => { if (confirm(t("brokerSyncDisconnectConfirm"))) snapTradeApi.disconnect(); }}
                            className="btn-secondary text-xs px-3 py-2 text-red-600 dark:text-red-400 min-h-[44px]"
                          >
                            {t("brokerSyncDisconnect")}
                          </button>
                        </div>
                        {snapTradeApi.connectionLimit >= 999 && (
                          <div className="flex items-center gap-2">
                            <TierFeatureBadge requiredPlan="pro" size="xs" />
                            <span className="text-[10px] text-gray-400 dark:text-slate-500">
                              {t("brokerSyncUnlimitedConnections") || "Unlimited connections"}
                            </span>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </>
              ) : snapTradeApi.step === "idle" ? (
                <div className="bg-white dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden">
                  {/* Hero / onboarding area */}
                  <div className="text-center px-5 py-8">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-500/15 inline-flex items-center justify-center mb-4">
                      <svg className="w-7 h-7 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
                        <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                      {t("brokerSyncEmptyTitle") || "Connect your broker"}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-slate-400 max-w-md mx-auto mb-6">
                      {t("brokerSyncEmptyDesc") || "Automatically import your holdings, transactions, and dividends. Your portfolio syncs every 6 hours — no manual uploads needed."}
                    </p>

                    {/* 3-step "How it works" */}
                    <div className="flex gap-4 justify-center flex-wrap mb-6">
                      {[
                        { step: "1", title: t("brokerSyncStep1") || "Select your broker", sub: t("brokerSyncStep1Sub") || "from 20+ supported" },
                        { step: "2", title: t("brokerSyncStep2") || "Log in securely", sub: t("brokerSyncStep2Sub") || "via SnapTrade portal" },
                        { step: "3", title: t("brokerSyncStep3") || "Auto-sync starts", sub: t("brokerSyncStep3Sub") || "every 6 hours" },
                      ].map((s) => (
                        <div key={s.step} className="text-center max-w-[140px]">
                          <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 inline-flex items-center justify-center mb-1.5">
                            <span className="text-sm font-bold text-gray-700 dark:text-slate-300">{s.step}</span>
                          </div>
                          <p className="text-xs font-semibold text-gray-800 dark:text-slate-200">{s.title}</p>
                          <p className="text-[10px] text-gray-400 dark:text-slate-500">{s.sub}</p>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => snapTradeApi.connect()}
                      className="btn-primary text-sm px-6 py-3 min-h-[44px] inline-flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
                        <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
                      </svg>
                      {t("brokerSyncConnect")}
                    </button>
                  </div>

                  {/* Compact trust row */}
                  <div className="border-t border-gray-100 dark:border-slate-700 px-5 py-3 flex flex-wrap gap-x-6 gap-y-2 justify-center">
                    <div className="flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      </svg>
                      <span className="text-xs text-gray-500 dark:text-slate-400">
                        <strong className="text-gray-700 dark:text-slate-200">{t("brokerSyncTrustCompact1Bold") || "trefolio never sees"}</strong>{" "}
                        {t("brokerSyncTrustCompact1") || "your broker credentials"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0110 0v4" />
                      </svg>
                      <span className="text-xs text-gray-500 dark:text-slate-400">
                        {t("brokerSyncTrustCompact2Pre") || "Encrypted via"}{" "}
                        <strong className="text-gray-700 dark:text-slate-200">SnapTrade</strong>{" & "}
                        <strong className="text-gray-700 dark:text-slate-200">Plaid</strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                      </svg>
                      <span className="text-xs text-gray-500 dark:text-slate-400">
                        <strong className="text-gray-700 dark:text-slate-200">{t("brokerSyncTrustCompact3Bold") || "Read-only"}</strong>{" — "}
                        {t("brokerSyncTrustCompact3") || "we cannot trade or move funds"}
                      </span>
                    </div>
                  </div>
                </div>
              ) : null}

              {snapTradeApi.step === "connecting" && <LoadingSpinner label={t("brokerSyncConnecting")} />}

              {snapTradeApi.step === "reconnecting" && <LoadingSpinner label={t("brokerSyncReconnecting")} />}

              {snapTradeApi.step === "fetching" && <LoadingSpinner label={t("brokerSyncFetching")} />}

              {snapTradeApi.step === "error" && (
                <ErrorCard
                  message={snapTradeApi.errorMsg}
                  onReset={snapTradeApi.reset}
                  needsReconnect={snapTradeApi.needsReconnect}
                  disabledConnections={snapTradeApi.disabledConnections}
                  onReconnect={(id) => snapTradeApi.reconnect(id)}
                  t={t}
                />
              )}

              {snapTradeApi.step === "preview" && snapTradeApi.transactions.length === 0 && (
                snapTradeApi.lastFetchSyncTriggered ? (
                  <div className="py-6 space-y-4">
                    <div className="text-center">
                      <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-amber-100 dark:bg-amber-500/15 flex items-center justify-center">
                        <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <p className="text-sm font-medium text-gray-700 dark:text-slate-200">
                        {t("brokerSyncDataSyncTriggered") || "Data sync initiated"}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-slate-400 max-w-sm mx-auto mt-2">
                        {t("brokerSyncDataSyncTriggeredDesc") || "Your broker's transaction history is being synced for the first time. This usually takes a few minutes. Please try syncing again shortly."}
                      </p>
                    </div>
                    <div className="flex flex-col items-center gap-2 pt-1">
                      <button
                        onClick={() => {
                          snapTradeApi.reset();
                        }}
                        className="btn-primary text-sm min-h-[44px] inline-flex items-center gap-2"
                      >
                        {t("close") || "Close"}
                      </button>
                    </div>
                  </div>
                ) : snapTradeApi.lastFetchHadDateFilter ? (
                  <div className="py-6 space-y-4">
                    <div className="text-center">
                      <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-blue-100 dark:bg-blue-500/15 flex items-center justify-center">
                        <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                        </svg>
                      </div>
                      <p className="text-sm font-medium text-gray-700 dark:text-slate-200">{t("brokerSyncNoTransactions")}</p>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl p-4 max-w-md mx-auto">
                      <p className="text-xs text-blue-700 dark:text-blue-300 mb-3">{t("brokerSyncNoTransactionsExplain")}</p>
                      <button
                        onClick={() => {
                          setSnapTradeStartDate({});
                          snapTradeApi.fetchPortfolio(activePortfolioId, null, Object.fromEntries(
                            snapTradeApi.brokerSyncs.map((bs) => [bs.brokerageAuthorizationId, ""])
                          ));
                        }}
                        className="btn-primary text-xs px-4 py-2 w-full min-h-[44px]"
                      >
                        {t("brokerSyncFetchAll")}
                      </button>
                    </div>
                    <div className="text-center">
                      <button onClick={snapTradeApi.reset} className="text-xs text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300 underline underline-offset-2 min-h-[44px]">{t("close")}</button>
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center space-y-3">
                    <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center">
                      <svg className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-gray-700 dark:text-slate-200">{t("brokerSyncUpToDate")}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400 max-w-sm mx-auto">
                      {snapTradeApi.lastFetchSummary && snapTradeApi.lastFetchSummary.duplicatesRemoved > 0
                        ? (t("brokerSyncUpToDateStats") || "0 new transactions found. {count} already imported from your brokerage.").replace("{count}", String(snapTradeApi.lastFetchSummary.duplicatesRemoved))
                        : t("brokerSyncUpToDateDesc")}
                    </p>
                    <div className="flex flex-col items-center gap-2 pt-1">
                      <a href="/" className="btn-primary text-sm min-h-[44px] inline-flex items-center gap-2">
                        {t("viewPortfolio") || "View Portfolio"}
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                        </svg>
                      </a>
                      <button onClick={snapTradeApi.reset} className="text-xs text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300 underline underline-offset-2 min-h-[44px]">{t("close")}</button>
                    </div>
                  </div>
                )
              )}

              {snapTradeApi.step === "preview" && snapTradeApi.transactions.length > 0 && (
                <PreviewPanel
                  transactions={snapTradeApi.transactions}
                  holdings={[]}
                  cashBalances={[]}
                  duplicatesRemoved={0}
                  onRemoveTx={snapTradeApi.removeTransaction}
                  onRemoveHolding={() => {}}
                  onImport={handleSnapTradeImportAll}
                  onReset={snapTradeApi.reset}
                  t={t}
                  track={track}
                />
              )}

              {snapTradeApi.step === "importing" && <ImportingProgress progress={snapTradeApi.importProgress} t={t} />}

              {snapTradeApi.step === "done" && (
                <DoneCard txCount={snapTradeApi.importedCount} holdingsCapped={snapTradeApi.holdingsCapped} onReset={snapTradeApi.reset} t={t} />
              )}
            </>
          )}
        </div>
      )}

      {/* ═══════════ AI IMPORT ═══════════ */}
      {method === "ai_import" && (
        <div className="space-y-4">
          {authLoading ? (
            <div className="py-12"><div className="w-8 h-8 mx-auto border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : !isPro ? (
            <ProCompareCard surface="ai_import" reason="upgrade_required" compact />
          ) : (<>
          {/* Guide */}
          {aiGuide && aiImport.step === "idle" && <InlineGuide guide={aiGuide} locale={locale} />}

          {aiImport.step === "idle" && (
            <div
              role="button"
              tabIndex={0}
              aria-label={t("importDragDrop")}
              onClick={() => aiFileRef.current?.click()}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); aiFileRef.current?.click(); } }}
              onDrop={handleAiDrop}
              onDragOver={(e) => { e.preventDefault(); setAiDragOver(true); }}
              onDragLeave={() => setAiDragOver(false)}
              className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors min-h-[44px] ${
                aiDragOver
                  ? "border-violet-500 bg-violet-50 dark:bg-violet-500/10"
                  : "border-gray-300 dark:border-slate-600 hover:border-violet-400 dark:hover:border-violet-500/50 bg-gray-50 dark:bg-slate-700/30"
              }`}
            >
              <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-violet-100 dark:bg-violet-500/15 flex items-center justify-center">
                <svg className="w-6 h-6 text-violet-600 dark:text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">{t("importDragDrop")}</p>
              <p className="text-xs text-gray-400 dark:text-slate-500">{t("importAcceptedAi")}</p>
              <input ref={aiFileRef} type="file" accept=".csv,text/csv,image/png,image/jpeg,image/webp" onChange={handleAiFileSelect} className="hidden" />
            </div>
          )}

          {aiImport.step === "extracting" && (
            <div className="py-12 text-center space-y-4">
              {aiImport.previewImage && (
                <img src={aiImport.previewImage} alt="Upload preview" className="max-h-40 mx-auto rounded-xl border border-gray-200 dark:border-slate-700 mb-4" />
              )}
              <LoadingSpinner label={t("importExtracting")} />
            </div>
          )}

          {aiImport.step === "error" && (
            <ErrorCard message={aiImport.errorMsg} onReset={aiImport.reset} t={t} />
          )}

          {aiImport.step === "preview" && (
            <>
              {aiImport.previewImage && (
                <img src={aiImport.previewImage} alt="Source" className="max-h-28 rounded-xl border border-gray-200 dark:border-slate-700" />
              )}
              {aiImport.importWarning && (
                <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 px-3 py-2">
                  <svg className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                  </svg>
                  <p className="text-xs text-amber-700 dark:text-amber-300">{aiImport.importWarning}</p>
                </div>
              )}
              <PreviewPanel
                transactions={aiImport.transactions}
                holdings={aiImport.holdings}
                cashBalances={[]}
                duplicatesRemoved={0}
                onRemoveTx={aiImport.removeTransaction}
                onRemoveHolding={aiImport.removeHolding}
                onImport={handleAiImportAll}
                onReset={aiImport.reset}
                t={t}
                track={track}
              />
            </>
          )}

          {aiImport.step === "importing" && <ImportingProgress progress={aiImport.importProgress} t={t} />}

          {aiImport.step === "done" && (
            <DoneCard txCount={aiImport.importedTxCount} holdingsCapped={aiImport.holdingsCapped} onReset={aiImport.reset} t={t} />
          )}
          </>)}
        </div>
      )}

      {/* ═══════════ MANUAL ADD ═══════════ */}
      {method === "manual" && (
        <div className="space-y-6">
          {/* Add Stock */}
          <div className="card p-4 sm:p-6">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">{t("addStock")}</h3>
            <div className="space-y-3">
              <div className="relative">
                <label htmlFor="manual-search" className="block text-[11px] text-gray-500 dark:text-slate-400 mb-1">{t("search")}</label>
                <input
                  id="manual-search"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder={t("searchPlaceholder")}
                  className="w-full text-xs px-3 py-2.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none min-h-[44px]"
                />
                {searching && (
                  <div className="absolute right-3 top-8">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-500" />
                  </div>
                )}
                {searchResults.length > 0 && !selectedStock && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                    {searchResults.map((r) => (
                      <button
                        key={r.symbol}
                        onClick={() => handleSelectStock(r)}
                        className="w-full text-left px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors flex items-center justify-between min-h-[44px]"
                      >
                        <div>
                          <span className="font-medium text-gray-900 dark:text-white text-xs">{r.symbol}</span>
                          <span className="text-gray-500 dark:text-slate-400 text-xs ml-2">{r.shortname}</span>
                        </div>
                        <span className="text-[10px] text-gray-400 dark:text-slate-500">{r.exchange}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {(selectedStock || stockName) && (
                <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-lg px-3 py-2 border border-emerald-200 dark:border-emerald-500/20">
                  <span className="text-emerald-700 dark:text-emerald-300 font-medium text-xs">{stockTicker || t("ticker")}</span>
                  <span className="text-gray-600 dark:text-slate-400 text-xs ml-2">{stockName || t("name")}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="manual-name" className="block text-[11px] text-gray-500 dark:text-slate-400 mb-1">{t("name")}</label>
                  <input id="manual-name" type="text" value={stockName} onChange={(e) => setStockName(e.target.value)} placeholder={t("name")} className="w-full text-xs px-3 py-2.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none min-h-[44px]" />
                </div>
                <div>
                  <label htmlFor="manual-ticker" className="block text-[11px] text-gray-500 dark:text-slate-400 mb-1">{t("ticker")}</label>
                  <input id="manual-ticker" type="text" value={stockTicker} onChange={(e) => setStockTicker(e.target.value)} placeholder={t("ticker")} className="w-full text-xs px-3 py-2.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none min-h-[44px]" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="manual-exchange" className="block text-[11px] text-gray-500 dark:text-slate-400 mb-1">{t("editExchange")}</label>
                  <input id="manual-exchange" type="text" value={stockExchange} onChange={(e) => setStockExchange(e.target.value)} placeholder={t("editExchange")} className="w-full text-xs px-3 py-2.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none min-h-[44px]" />
                </div>
                <div>
                  <label htmlFor="manual-assettype" className="block text-[11px] text-gray-500 dark:text-slate-400 mb-1">{t("assetType")}</label>
                  <select id="manual-assettype" value={stockAssetType} onChange={(e) => setStockAssetType(e.target.value as "stock" | "etf")} className="w-full text-xs px-3 py-2.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none min-h-[44px]">
                    <option value="stock">{t("stockType")}</option>
                    <option value="etf">{t("etfType")}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label htmlFor="manual-shares" className="block text-[11px] text-gray-500 dark:text-slate-400 mb-1">{t("shares")}</label>
                  <input id="manual-shares" type="number" value={stockShares} onChange={(e) => setStockShares(e.target.value)} placeholder="0" min="0" step="any" className="w-full text-xs px-3 py-2.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none min-h-[44px]" />
                </div>
                <div>
                  <label htmlFor="manual-price" className="block text-[11px] text-gray-500 dark:text-slate-400 mb-1">{t("purchasePrice")}</label>
                  <input id="manual-price" type="number" value={stockPrice} onChange={(e) => setStockPrice(e.target.value)} placeholder="0.00" min="0" step="any" className="w-full text-xs px-3 py-2.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none min-h-[44px]" />
                </div>
                <div>
                  <label htmlFor="manual-currency" className="block text-[11px] text-gray-500 dark:text-slate-400 mb-1">{t("currency")}</label>
                  <select id="manual-currency" value={stockCurrency} onChange={(e) => setStockCurrency(e.target.value)} className="w-full text-xs px-3 py-2.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none min-h-[44px]">
                    <option value="USD">$ USD</option>
                    <option value="EUR">€ EUR</option>
                    <option value="GBP">£ GBP</option>
                    <option value="GBX">GBX</option>
                    <option value="DKK">DKK</option>
                    <option value="CAD">CA$ CAD</option>
                    <option value="CHF">CHF</option>
                    <option value="JPY">¥ JPY</option>
                  </select>
                </div>
              </div>

              <button
                onClick={handleAddStock}
                disabled={!stockName.trim() || !stockTicker.trim() || !stockExchange.trim() || !stockShares || !stockPrice}
                className="btn-primary text-xs px-4 py-2.5 w-full disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px]"
              >
                {t("addToPortfolio")}
              </button>

              {manualAdded && (
                <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  {t("addStock")} — {t("close")}!
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

/* ── Shared sub-components ── */

function LoadingSpinner({ label }: { label: string }) {
  return (
    <div className="py-12 text-center space-y-4">
      <div className="w-10 h-10 mx-auto border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-gray-600 dark:text-slate-300">{label}</p>
    </div>
  );
}

function ErrorCard({
  message,
  onReset,
  onTryAi,
  needsReconnect,
  disabledConnections,
  onReconnect,
  t,
}: {
  message: string;
  onReset: () => void;
  onTryAi?: () => void;
  needsReconnect?: boolean;
  disabledConnections?: { id: string; brokerageName: string; disabledDate: string | null }[];
  onReconnect?: (connectionId: string) => void;
  t: (key: string) => string;
}) {
  if (needsReconnect) {
    return (
      <div className="py-8 text-center space-y-4">
        <div className="w-12 h-12 mx-auto rounded-full bg-amber-100 dark:bg-amber-500/15 flex items-center justify-center">
          <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-amber-700 dark:text-amber-400" role="alert">{t("brokerSyncExpired")}</p>
        <p className="text-xs text-gray-500 dark:text-slate-400">{t("brokerSyncReconnectDesc")}</p>
        <div className="flex flex-col items-center gap-2">
          {disabledConnections?.map((dc) => (
            <button
              key={dc.id}
              onClick={() => onReconnect?.(dc.id)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-white text-sm font-semibold transition-colors min-h-[44px]"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" /></svg>
              {t("brokerSyncReconnect")}{dc.brokerageName ? ` — ${dc.brokerageName}` : ""}
            </button>
          ))}
          <button onClick={onReset} className="btn-secondary text-xs min-h-[44px]">{t("cancel")}</button>
        </div>
      </div>
    );
  }

  const brokerName = disabledConnections?.[0]?.brokerageName;

  return (
    <div className="border border-rose-200 dark:border-rose-500/25 bg-rose-50 dark:bg-rose-500/[0.06] rounded-xl p-4 flex items-start gap-3">
      <div className="w-9 h-9 rounded-lg bg-rose-100 dark:bg-rose-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
        <svg className="w-[18px] h-[18px] text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-rose-600 dark:text-rose-400" role="alert">
          {brokerName
            ? `${t("brokerSyncFailedFor") || "Sync failed for"} ${brokerName}`
            : (message || t("importError"))}
        </p>
        <p className="text-xs text-gray-600 dark:text-slate-400 mt-0.5 leading-relaxed">
          {t("brokerSyncTempErrorDesc") || "A temporary error occurred while fetching your latest transactions. This usually resolves on its own. The next automatic sync will retry in ~4 hours."}
        </p>
        <div className="flex gap-2 mt-2.5">
          <button
            onClick={onReset}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-xs font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors min-h-[32px]"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" /></svg>
            {t("brokerSyncRetryNow") || "Retry Now"}
          </button>
          <a
            href="mailto:support@trefolio.app"
            className="inline-flex items-center px-3 py-1.5 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-xs font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors min-h-[32px]"
          >
            {t("brokerSyncContactSupport") || "Contact Support"}
          </a>
          {onTryAi && (
            <button onClick={onTryAi} className="text-xs text-violet-600 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-300 underline underline-offset-2 transition-colors ml-1 min-h-[32px]">
              {t("aiImportLabel")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function PreviewPanel({
  transactions,
  holdings,
  cashBalances,
  duplicatesRemoved,
  onRemoveTx,
  onRemoveHolding,
  onImport,
  onReset,
  t,
  track,
}: {
  transactions: { date: string; type: string; ticker: string; name: string; shares: number; pricePerShare: number; totalAmount: number; fees: number; currency: string }[];
  holdings: { name: string; ticker: string; shares: number; purchasePrice: number; displayCurrency: string; exchange: string; assetType: string }[];
  cashBalances: { currency: string; amount: number }[];
  duplicatesRemoved: number;
  onRemoveTx: (idx: number) => void;
  onRemoveHolding: (idx: number) => void;
  onImport: () => void;
  onReset: () => void;
  t: (key: string) => string;
  track: (event: string, metadata?: Record<string, string>) => void;
}) {
  const [previewTab, setPreviewTab] = useState<"holdings" | "transactions">(holdings.length > 0 ? "holdings" : "transactions");
  const totalItems = holdings.length + transactions.length;

  useEffect(() => {
    track("import_preview_shown", { holdingsCount: String(holdings.length), txCount: String(transactions.length) });
  }, [holdings.length, transactions.length, track]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t("importPreview")}</h3>
          <p className="text-xs text-gray-500 dark:text-slate-400">{t("importPreviewDesc")}</p>
        </div>
      </div>

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
            className={`flex-1 text-xs font-medium px-3 py-2 rounded-lg transition-colors min-h-[44px] ${
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
            className={`flex-1 text-xs font-medium px-3 py-2 rounded-lg transition-colors min-h-[44px] ${
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
                    <td className="p-2">
                      <button onClick={() => onRemoveHolding(i)} className="text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="Remove holding">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
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
                  <th scope="col" className="text-right p-2 font-medium">{t("transactionTotal")}</th>
                  <th scope="col" className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx, i) => (
                  <tr key={i} className="border-t border-gray-100 dark:border-slate-700 text-gray-700 dark:text-slate-300">
                    <td className="p-2">{tx.date}</td>
                    <td className="p-2">
                      <span className={`inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-medium ${TX_TYPE_COLORS[tx.type] || ""}`}>{tx.type}</span>
                    </td>
                    <td className="p-2 font-mono font-medium text-gray-900 dark:text-white">{tx.ticker}</td>
                    <td className="p-2 text-right font-mono">{tx.shares > 0 ? tx.shares : "—"}</td>
                    <td className="p-2 text-right font-mono font-medium text-gray-900 dark:text-white">{tx.totalAmount.toFixed(2)}</td>
                    <td className="p-2">
                      <button onClick={() => onRemoveTx(i)} className="text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="Remove transaction">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Cash balances */}
      {cashBalances.length > 0 && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-3 py-2.5">
          <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
          </svg>
          <div className="text-xs text-emerald-700 dark:text-emerald-300">
            <span className="font-medium">{t("cash")}:</span>{" "}
            {cashBalances.map((c) => `${c.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${c.currency}`).join(", ")}
          </div>
        </div>
      )}

      {/* Import actions */}
      <div className="flex items-center justify-between pt-2">
        <button onClick={onReset} className="btn-secondary text-sm min-h-[44px]">{t("cancel")}</button>
        {totalItems > 0 && (
          <button onClick={onImport} className="btn-primary text-sm flex items-center gap-1.5 min-h-[44px]">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            {t("importConfirm")} ({totalItems})
          </button>
        )}
      </div>
    </div>
  );
}

function ImportingProgress({ progress, t }: { progress: { current: number; total: number; errors: number }; t: (key: string) => string }) {
  return (
    <div className="py-12 text-center space-y-5">
      <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center">
        <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
        </svg>
      </div>
      <p className="text-sm font-medium text-gray-700 dark:text-slate-200" aria-live="polite">
        {(t("importImporting") || "Importing {current} of {total}...").replace("{current}", String(progress.current)).replace("{total}", String(progress.total))}
      </p>
      <div className="max-w-xs mx-auto">
        <div className="h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden" role="progressbar" aria-valuenow={progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full bg-emerald-500 rounded-full transition-all duration-300 ease-out" style={{ width: progress.total > 0 ? `${(progress.current / progress.total) * 100}%` : "0%" }} />
        </div>
        {progress.errors > 0 && (
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">{progress.errors} {progress.errors === 1 ? "error" : "errors"}</p>
        )}
      </div>
    </div>
  );
}

function DoneCard({ txCount, holdingsCapped, onReset, t }: { txCount: number; holdingsCapped: number; onReset: () => void; t: (key: string) => string }) {
  return (
    <div className="py-8 text-center space-y-4">
      <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center">
        <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      </div>
      <p className="text-sm font-medium text-gray-900 dark:text-white">
        {(t("importTxSuccess") || "{count} transactions imported successfully.").replace("{count}", String(txCount))}
      </p>
      {holdingsCapped > 0 && (
        <div className="space-y-3 max-w-md mx-auto">
          <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">
            {(t("importHoldingsCapped") || "{count} holding(s) skipped — Free plan allows up to 15 holdings.").replace("{count}", String(holdingsCapped))}
          </p>
          <ProCompareCard surface="import_holdings_capped" reason="holdings_limit_reached" compact />
        </div>
      )}
      <AdSlot slot="import-done" format="auto" className="max-w-md mx-auto" />
      <div className="flex flex-col items-center gap-2">
        <a href="/" className="btn-primary text-sm min-h-[44px] inline-flex items-center gap-2">
          {t("viewPortfolio") || "View Portfolio"}
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </a>
        <button onClick={onReset} className="btn-secondary text-xs min-h-[44px]">{t("importMore") || "Import More"}</button>
      </div>
    </div>
  );
}
