"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import type { TransactionType } from "@/lib/types";
import ProCompareCard from "@/components/ProCompareCard";
import { canUseBrokerSync } from "@/lib/subscription";

interface ParsedTx {
  date: string;
  type: "buy" | "sell" | "dividend" | "fee";
  ticker: string;
  name?: string;
  shares: number;
  price: number;
  total: number;
  fees: number;
  taxes?: number;
  currency: string;
}

interface ImportSummary {
  total: number;
  buys: number;
  sells: number;
  dividends: number;
  fees: number;
  unmapped: string[];
}

type Broker = "degiro" | "interactive_brokers" | "trading_212" | "revolut" | "charles_schwab" | "fidelity" | "nordnet" | "tastytrade" | "freetrade" | "etoro" | "wealthsimple" | "questrade" | "firstrade";
type Step = "upload" | "preview" | "importing" | "done";

const TYPE_COLORS: Record<TransactionType, string> = {
  buy: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  sell: "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400",
  dividend: "bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400",
  fee: "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400",
};

const BROKERS: { id: Broker; label: string; desc: string; descEs: string; serverParsed: boolean }[] = [
  { id: "degiro", label: "DEGIRO", desc: "Account.csv", descEs: "Account.csv", serverParsed: true },
  { id: "interactive_brokers", label: "Interactive Brokers", desc: "Activity Statement CSV", descEs: "Extracto de actividad CSV", serverParsed: true },
  { id: "trading_212", label: "Trading 212", desc: "History CSV export", descEs: "Exportar historial CSV", serverParsed: true },
  { id: "revolut", label: "Revolut", desc: "Account statement (Excel/CSV)", descEs: "Extracto de cuenta (Excel/CSV)", serverParsed: true },
  { id: "charles_schwab", label: "Charles Schwab", desc: "Brokerage History CSV", descEs: "Historial CSV de corretaje", serverParsed: true },
  { id: "fidelity", label: "Fidelity", desc: "Activity & Orders CSV", descEs: "CSV de actividad y órdenes", serverParsed: true },
  { id: "nordnet", label: "Nordnet", desc: "Transactions CSV export", descEs: "Exportar transacciones CSV", serverParsed: true },
  { id: "tastytrade", label: "Tastytrade", desc: "Transaction History CSV", descEs: "Historial de transacciones CSV", serverParsed: true },
  { id: "freetrade", label: "Freetrade", desc: "Activity CSV export", descEs: "Exportar actividad CSV", serverParsed: true },
  { id: "etoro", label: "eToro", desc: "Account Statement XLS/CSV", descEs: "Extracto de cuenta XLS/CSV", serverParsed: true },
  { id: "wealthsimple", label: "Wealthsimple", desc: "Activities Export CSV", descEs: "Exportar actividades CSV", serverParsed: true },
  { id: "questrade", label: "Questrade", desc: "Account Activity CSV", descEs: "CSV de actividad de cuenta", serverParsed: true },
  { id: "firstrade", label: "Firstrade", desc: "Account History CSV", descEs: "Historial de cuenta CSV", serverParsed: true },
];

function mapTx(tx: Record<string, unknown>): ParsedTx {
  return {
    date: tx.date as string,
    type: tx.type as ParsedTx["type"],
    ticker: tx.ticker as string,
    name: tx.name as string,
    shares: tx.shares as number,
    price: tx.pricePerShare as number,
    total: tx.totalAmount as number,
    fees: tx.fees as number,
    taxes: tx.taxes as number,
    currency: tx.currency as string,
  };
}

/* ── Component ── */

export default function BrokerImport() {
  const { t } = useI18n();
  const { user } = useAuth();
  const isPro = user?.plan === "pro";
  const brokerSyncAllowed = canUseBrokerSync(
    user?.plan ?? "free",
    user?.planExpiresAt ?? "",
    { isAdmin: user?.role === "admin" },
  );

  const [broker, setBroker] = useState<Broker>("degiro");
  const [parsed, setParsed] = useState<ParsedTx[]>([]);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [step, setStep] = useState<Step>("upload");
  const [importedCount, setImportedCount] = useState(0);
  const [error, setError] = useState("");
  const [csvText, setCsvText] = useState("");
  const [portfolios, setPortfolios] = useState<{ id: string; name: string; isDefault: boolean }[]>([]);
  const [targetPortfolioId, setTargetPortfolioId] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/portfolios")
      .then((r) => r.ok ? r.json() : { portfolios: [] })
      .then((d) => {
        const list = d.portfolios || [];
        setPortfolios(list);
        const def = list.find((p: { isDefault: boolean }) => p.isDefault);
        if (def && !targetPortfolioId) setTargetPortfolioId(def.id);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const brokerInfo = BROKERS.find((b) => b.id === broker)!;

  const reset = () => {
    setStep("upload");
    setParsed([]);
    setSummary(null);
    setError("");
    setCsvText("");
    setImportedCount(0);
    setTargetPortfolioId("");
    if (fileRef.current) fileRef.current.value = "";
  };

  /* ── CSV file handling ── */

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    const text = await file.text();

    setCsvText(text);
    const form = new FormData();
    form.append("action", "parse");
    form.append("broker", broker);
    form.append("csv", text);
    if (targetPortfolioId) form.append("portfolioId", targetPortfolioId);
    try {
      const res = await fetch("/api/transactions/import-broker", { method: "POST", body: form });
      if (!res.ok) { setError("Failed to parse CSV."); return; }
      const data = await res.json();
      setParsed((data.transactions || []).map(mapTx));
      setSummary(data.summary);
      setStep("preview");
    } catch {
      setError("Failed to parse CSV.");
    }
  };

  /* ── Polling ── */

  const pollJobStatus = async (jobId: string, endpoint: string) => {
    const POLL_MS = 1500;
    const MAX_POLLS = 120;
    for (let i = 0; i < MAX_POLLS; i++) {
      await new Promise((r) => setTimeout(r, POLL_MS));
      try {
        const form = new FormData();
        form.append("action", "status");
        form.append("jobId", jobId);
        const res = await fetch(endpoint, { method: "POST", body: form });
        if (!res.ok) continue;
        const data = await res.json();
        if (data.status === "completed") {
          setImportedCount(data.result?.imported || 0);
          setStep("done");
          return;
        }
        if (data.status === "failed") {
          setError(data.error || "Import failed.");
          setStep("preview");
          return;
        }
      } catch { /* transient — keep polling */ }
    }
    setError("Import timed out.");
    setStep("preview");
  };

  /* ── Import ── */

  const handleImport = async () => {
    setStep("importing");
    setError("");

    const form = new FormData();
    form.append("action", "import");
    form.append("broker", broker);
    form.append("csv", csvText);
    if (targetPortfolioId) form.append("portfolioId", targetPortfolioId);
    try {
      const res = await fetch("/api/transactions/import-broker", { method: "POST", body: form });
      if (!res.ok) { setError("Import failed."); setStep("preview"); return; }
      const data = await res.json();
      if (data.jobId) {
        await pollJobStatus(data.jobId, "/api/transactions/import-broker");
      } else {
        setImportedCount(data.imported || 0);
        setStep("done");
      }
    } catch {
      setError("Import failed.");
      setStep("preview");
    }
  };

  return (
    <div className="card">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{t("brokerImport")}</h3>
      <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">{t("brokerImportDesc")}</p>

      {/* ── Upload step ── */}
      {step === "upload" && (
        <>
          {/* Broker Sync banner */}
          {brokerSyncAllowed && (
            <a
              href="/import?method=snaptrade_api"
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

          <div className="mb-4">
            <label className="text-xs text-gray-600 dark:text-slate-400 block mb-2">{t("selectBroker")}</label>
            <div className="grid grid-cols-2 gap-2">
              {BROKERS.map((b) => (
                <button
                  key={b.id}
                  onClick={() => setBroker(b.id)}
                  className={`text-left px-3 py-2.5 rounded-xl border-2 transition-all ${
                    broker === b.id
                      ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10"
                      : "border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 hover:border-gray-300 dark:hover:border-slate-500"
                  }`}
                >
                  <p className="text-xs font-semibold text-gray-900 dark:text-white">{b.label}</p>
                  <p className="text-[10px] text-gray-500 dark:text-slate-400 mt-0.5">{b.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {broker === "degiro" && (
            <div className="bg-blue-50 dark:bg-blue-500/10 rounded-xl p-3 mb-4">
              <p className="text-xs text-blue-700 dark:text-blue-300 font-medium mb-1">{t("degiroInstructions")}</p>
              <p className="text-[10px] text-blue-600 dark:text-blue-400">{t("degiroInstructionsDetail")}</p>
            </div>
          )}

          {broker === "interactive_brokers" && (
            <div className="bg-blue-50 dark:bg-blue-500/10 rounded-xl p-3 mb-4">
              <p className="text-xs text-blue-700 dark:text-blue-300 font-medium mb-1">Interactive Brokers</p>
              <p className="text-[10px] text-blue-600 dark:text-blue-400">Performance &amp; Reports → Statements → CSV format. Supports Activity Statement and Flex Query exports.</p>
            </div>
          )}

          {broker === "trading_212" && (
            <div className="bg-blue-50 dark:bg-blue-500/10 rounded-xl p-3 mb-4">
              <p className="text-xs text-blue-700 dark:text-blue-300 font-medium mb-1">Trading 212</p>
              <p className="text-[10px] text-blue-600 dark:text-blue-400">Menu → History → Export. Select your timeframe and export as CSV.</p>
            </div>
          )}
          {broker === "revolut" && (
            <div className="bg-blue-50 dark:bg-blue-500/10 rounded-xl p-3 mb-4">
              <p className="text-xs text-blue-700 dark:text-blue-300 font-medium mb-1">Revolut</p>
              <p className="text-[10px] text-blue-600 dark:text-blue-400">Invest → More → Statements → Account statement → Excel format.</p>
            </div>
          )}

          {portfolios.length > 1 && (
            <div className="space-y-1 mb-4">
              <label className="text-sm font-medium text-gray-700 dark:text-slate-300">
                Import to portfolio
              </label>
              <select
                value={targetPortfolioId}
                onChange={(e) => setTargetPortfolioId(e.target.value)}
                className="w-full text-sm bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2"
              >
                <option value="">Default Portfolio</option>
                {portfolios.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* CSV upload area */}
          <>
              <div
                role="button"
                tabIndex={0}
                aria-label={t("clickToUpload")}
                onClick={() => fileRef.current?.click()}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileRef.current?.click(); } }}
                className="border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-xl p-8 text-center cursor-pointer hover:border-emerald-400 dark:hover:border-emerald-500/50 transition-colors"
              >
                <svg className="w-8 h-8 mx-auto mb-2 text-gray-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                <p className="text-sm text-gray-600 dark:text-slate-400">{t("clickToUpload")} {brokerInfo.label} CSV</p>
                <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={handleFile} className="hidden" />
              </div>

              {error && <p className="text-xs text-red-500 mt-2" role="alert">{error}</p>}
          </>
        </>
      )}

      {/* ── Preview step ── */}
      {step === "preview" && (
        <>
          {summary && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
              <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-2 text-center">
                <p className="text-[10px] text-gray-500 dark:text-slate-400 uppercase">{t("total")}</p>
                <p className="text-sm font-bold text-gray-900 dark:text-white">{summary.total}</p>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-lg p-2 text-center">
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase">{t("txBuy")}</p>
                <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">{summary.buys}</p>
              </div>
              <div className="bg-red-50 dark:bg-red-500/10 rounded-lg p-2 text-center">
                <p className="text-[10px] text-red-600 dark:text-red-400 uppercase">{t("txSell")}</p>
                <p className="text-sm font-bold text-red-700 dark:text-red-300">{summary.sells}</p>
              </div>
              <div className="bg-violet-50 dark:bg-violet-500/10 rounded-lg p-2 text-center">
                <p className="text-[10px] text-violet-600 dark:text-violet-400 uppercase">{t("txDividend")}</p>
                <p className="text-sm font-bold text-violet-700 dark:text-violet-300">{summary.dividends}</p>
              </div>
              <div className="bg-amber-50 dark:bg-amber-500/10 rounded-lg p-2 text-center">
                <p className="text-[10px] text-amber-600 dark:text-amber-400 uppercase">{t("txFee")}</p>
                <p className="text-sm font-bold text-amber-700 dark:text-amber-300">{summary.fees}</p>
              </div>
            </div>
          )}

          {summary?.unmapped && summary.unmapped.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-500/10 rounded-xl p-3 mb-4">
              <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">{t("unmappedIsins")}</p>
              <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 font-mono">{summary.unmapped.join(", ")}</p>
            </div>
          )}

          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              {parsed.length} {t("transactionsFound")}
            </span>
            <div className="flex gap-2">
              <button onClick={reset} className="btn-secondary text-xs px-3 py-1.5">{t("cancel")}</button>
              <button onClick={handleImport} className="btn-primary text-xs px-3 py-1.5">
                {t("importTransactions")} ({parsed.length})
              </button>
            </div>
          </div>

          <div className="overflow-x-auto max-h-72 overflow-y-auto border border-gray-200 dark:border-slate-700 rounded-xl">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 dark:bg-slate-800/50 sticky top-0">
                <tr className="text-gray-500 dark:text-slate-400">
                  <th className="text-left p-2 font-medium">{t("transactionDate")}</th>
                  <th className="text-left p-2 font-medium">{t("transactionType")}</th>
                  <th className="text-left p-2 font-medium">{t("ticker")}</th>
                  <th className="text-right p-2 font-medium">{t("transactionShares")}</th>
                  <th className="text-right p-2 font-medium">{t("transactionPrice")}</th>
                  <th className="text-right p-2 font-medium">{t("transactionTotal")}</th>
                  <th className="text-right p-2 font-medium">{t("transactionFees")}</th>
                </tr>
              </thead>
              <tbody>
                {parsed.slice(0, 100).map((tx, i) => (
                  <tr key={i} className="border-t border-gray-100 dark:border-slate-700">
                    <td className="p-2 text-gray-700 dark:text-slate-300">{tx.date}</td>
                    <td className="p-2">
                      <span className={`inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-medium ${TYPE_COLORS[tx.type]}`}>
                        {tx.type}
                      </span>
                    </td>
                    <td className="p-2 font-mono font-medium text-gray-900 dark:text-white">
                      {tx.ticker || <span className="text-gray-400 italic">—</span>}
                    </td>
                    <td className="p-2 text-right font-mono">{tx.shares > 0 ? tx.shares : "—"}</td>
                    <td className="p-2 text-right font-mono">{tx.price > 0 ? tx.price.toFixed(2) : "—"}</td>
                    <td className="p-2 text-right font-mono font-medium text-gray-900 dark:text-white">{tx.total.toFixed(2)}</td>
                    <td className="p-2 text-right font-mono text-gray-400">{tx.fees > 0 ? tx.fees.toFixed(2) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {error && <p className="text-xs text-red-500 mt-2" role="alert">{error}</p>}
        </>
      )}

      {/* ── Importing step ── */}
      {step === "importing" && (
        <div className="text-center py-8">
          <div className="w-12 h-12 mx-auto rounded-full bg-indigo-100 dark:bg-indigo-500/15 flex items-center justify-center mb-3 animate-pulse">
            <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-900 dark:text-white">{t("importingTransactions")}</p>
        </div>
      )}

      {/* ── Done step ── */}
      {step === "done" && (
        <div className="text-center py-8">
          <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center mb-3">
            <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-900 dark:text-white">{importedCount} {t("transactionsImported")}</p>
          <div className="flex flex-col items-center gap-2 mt-3">
            <a href="/" className="btn-primary text-xs px-4 py-1.5 inline-flex items-center gap-1.5">
              {t("viewPortfolio") || "View Portfolio"}
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </a>
            <button onClick={reset} className="btn-secondary text-xs px-3 py-1.5">
              {t("importMore")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
