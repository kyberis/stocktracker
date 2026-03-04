"use client";

import { useState, useRef } from "react";
import { useI18n } from "@/lib/i18n";
import type { TransactionType } from "@/lib/types";

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

type Broker = "degiro";
type Step = "upload" | "preview" | "importing" | "done";

const TYPE_COLORS: Record<TransactionType, string> = {
  buy: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  sell: "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400",
  dividend: "bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400",
  fee: "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400",
};

const BROKERS: { id: Broker; label: string; desc: string; serverParsed: boolean }[] = [
  { id: "degiro", label: "DEGIRO", desc: "Account.csv", serverParsed: true },
];

/* ── Client-side parsing for non-DEGIRO brokers ── */

interface ColConfig {
  dateCol: string; typeCol: string; tickerCol: string; sharesCol: string;
  priceCol: string; totalCol: string; feesCol: string; currencyCol: string;
  buyKw: string[]; sellKw: string[]; divKw: string[];
}

const COL_CONFIGS: Record<string, ColConfig> = {
  interactive_brokers: {
    dateCol: "Date/Time", typeCol: "Buy/Sell", tickerCol: "Symbol", sharesCol: "Quantity",
    priceCol: "T. Price", totalCol: "Proceeds", feesCol: "Comm/Fee", currencyCol: "Currency",
    buyKw: ["BUY", "BOT"], sellKw: ["SELL", "SLD"], divKw: ["DIVIDEND"],
  },
  trade_republic: {
    dateCol: "Date", typeCol: "Type", tickerCol: "ISIN", sharesCol: "Shares",
    priceCol: "Rate", totalCol: "Amount", feesCol: "Fee", currencyCol: "Currency",
    buyKw: ["Buy", "Purchase", "Kauf"], sellKw: ["Sell", "Verkauf"], divKw: ["Dividend", "Dividende"],
  },
  generic: {
    dateCol: "date", typeCol: "type", tickerCol: "ticker", sharesCol: "shares",
    priceCol: "price", totalCol: "total", feesCol: "fees", currencyCol: "currency",
    buyKw: ["buy"], sellKw: ["sell"], divKw: ["dividend"],
  },
};

function parseCSVLines(text: string): string[][] {
  return text.split("\n").filter((l) => l.trim()).map((line) => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; continue; }
      if (ch === "," && !inQuotes) { result.push(current.trim()); current = ""; continue; }
      current += ch;
    }
    result.push(current.trim());
    return result;
  });
}

function clientParse(text: string, broker: Broker): ParsedTx[] {
  const cfg = COL_CONFIGS[broker];
  if (!cfg) return [];
  const rows = parseCSVLines(text);
  if (rows.length < 2) return [];
  const hdrs = rows[0];
  const find = (target: string) => hdrs.findIndex((h) => h.toLowerCase().includes(target.toLowerCase()));
  const dateIdx = find(cfg.dateCol);
  const typeIdx = find(cfg.typeCol);
  const tickerIdx = find(cfg.tickerCol);
  const sharesIdx = find(cfg.sharesCol);
  const priceIdx = find(cfg.priceCol);
  const totalIdx = find(cfg.totalCol);
  const feesIdx = find(cfg.feesCol);
  const currIdx = find(cfg.currencyCol);

  const detect = (val: string): ParsedTx["type"] => {
    const lower = val.toLowerCase();
    if (cfg.divKw.some((k) => lower.includes(k.toLowerCase()))) return "dividend";
    if (cfg.sellKw.some((k) => lower.includes(k.toLowerCase()))) return "sell";
    if (cfg.buyKw.some((k) => lower.includes(k.toLowerCase()))) return "buy";
    return "buy";
  };

  const txs: ParsedTx[] = [];
  for (const row of rows.slice(1)) {
    if (row.length < 3) continue;
    const rawDate = dateIdx >= 0 ? row[dateIdx] : "";
    const date = rawDate.length >= 10 ? rawDate.slice(0, 10) : rawDate;
    if (!date) continue;
    txs.push({
      date,
      type: typeIdx >= 0 ? detect(row[typeIdx]) : "buy",
      ticker: tickerIdx >= 0 ? row[tickerIdx].replace(/['"]/g, "") : "",
      shares: sharesIdx >= 0 ? Math.abs(parseFloat(row[sharesIdx]) || 0) : 0,
      price: priceIdx >= 0 ? Math.abs(parseFloat(row[priceIdx]) || 0) : 0,
      total: totalIdx >= 0 ? Math.abs(parseFloat(row[totalIdx]) || 0) : 0,
      fees: feesIdx >= 0 ? Math.abs(parseFloat(row[feesIdx]) || 0) : 0,
      currency: currIdx >= 0 ? row[currIdx] || "EUR" : "EUR",
    });
  }
  return txs.filter((tx) => tx.ticker && tx.date);
}

/* ── Component ── */

export default function BrokerImport() {
  const { t } = useI18n();
  const [broker, setBroker] = useState<Broker>("degiro");
  const [parsed, setParsed] = useState<ParsedTx[]>([]);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [step, setStep] = useState<Step>("upload");
  const [importedCount, setImportedCount] = useState(0);
  const [error, setError] = useState("");
  const [csvText, setCsvText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const brokerInfo = BROKERS.find((b) => b.id === broker)!;

  const reset = () => {
    setStep("upload");
    setParsed([]);
    setSummary(null);
    setError("");
    setCsvText("");
    setImportedCount(0);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    const text = await file.text();

    if (brokerInfo.serverParsed) {
      setCsvText(text);
      const form = new FormData();
      form.append("action", "parse");
      form.append("broker", broker);
      form.append("csv", text);
      try {
        const res = await fetch("/api/transactions/import-broker", { method: "POST", body: form });
        if (!res.ok) {
          setError("Failed to parse CSV.");
          return;
        }
        const data = await res.json();
        const txs: ParsedTx[] = (data.transactions || []).map((tx: Record<string, unknown>) => ({
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
        }));
        setParsed(txs);
        setSummary(data.summary);
        setStep("preview");
      } catch {
        setError("Failed to parse CSV.");
      }
    } else {
      const txs = clientParse(text, broker);
      setParsed(txs);
      setSummary({
        total: txs.length,
        buys: txs.filter((t) => t.type === "buy").length,
        sells: txs.filter((t) => t.type === "sell").length,
        dividends: txs.filter((t) => t.type === "dividend").length,
        fees: txs.filter((t) => t.type === "fee").length,
        unmapped: [],
      });
      setStep("preview");
    }
  };

  const handleImport = async () => {
    setStep("importing");
    setError("");

    if (brokerInfo.serverParsed) {
      const form = new FormData();
      form.append("action", "import");
      form.append("broker", broker);
      form.append("csv", csvText);
      try {
        const res = await fetch("/api/transactions/import-broker", { method: "POST", body: form });
        if (!res.ok) { setError("Import failed."); setStep("preview"); return; }
        const data = await res.json();
        setImportedCount(data.imported || 0);
        setStep("done");
      } catch {
        setError("Import failed.");
        setStep("preview");
      }
    } else {
      let count = 0;
      for (const tx of parsed) {
        const res = await fetch("/api/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            holdingId: "",
            ticker: tx.ticker,
            type: tx.type,
            date: tx.date,
            shares: tx.shares,
            pricePerShare: tx.price,
            totalAmount: tx.total || tx.shares * tx.price,
            fees: tx.fees,
            taxes: tx.taxes || 0,
            currency: tx.currency,
            notes: `Imported from ${brokerInfo.label}`,
          }),
        });
        if (res.ok) count++;
      }
      setImportedCount(count);
      setStep("done");
    }
  };

  return (
    <div className="card">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{t("brokerImport")}</h3>
      <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">{t("brokerImportDesc")}</p>

      {/* ── Upload step ── */}
      {step === "upload" && (
        <>
          <div className="mb-4">
            <label className="text-xs text-gray-600 dark:text-slate-400 block mb-2">{t("selectBroker")}</label>
            <div className="grid grid-cols-1 gap-2">
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
                  <img
                    src="/degiro-logo.svg"
                    alt="DEGIRO"
                    className="h-5 w-auto mb-1"
                  />
                  <p className="text-xs font-semibold text-gray-900 dark:text-white">{b.label}</p>
                  <p className="text-[10px] text-gray-500 dark:text-slate-400 mt-0.5">{b.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {broker === "degiro" && (
            <div className="bg-blue-50 dark:bg-blue-500/10 rounded-xl p-3 mb-4">
              <img
                src="/degiro-logo.svg"
                alt="DEGIRO logo"
                className="h-5 w-auto mb-2"
              />
              <p className="text-xs text-blue-700 dark:text-blue-300 font-medium mb-1">{t("degiroInstructions")}</p>
              <p className="text-[10px] text-blue-600 dark:text-blue-400">{t("degiroInstructionsDetail")}</p>
            </div>
          )}

          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-xl p-8 text-center cursor-pointer hover:border-emerald-400 dark:hover:border-emerald-500/50 transition-colors"
          >
            <svg className="w-8 h-8 mx-auto mb-2 text-gray-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            <p className="text-sm text-gray-600 dark:text-slate-400">{t("clickToUpload")} {brokerInfo.label} CSV</p>
            <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={handleFile} className="hidden" />
          </div>

          {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
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

          {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
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
          <button onClick={reset} className="btn-secondary text-xs px-3 py-1.5 mt-3">
            {t("importMore")}
          </button>
        </div>
      )}
    </div>
  );
}
