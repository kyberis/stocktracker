"use client";

import { useState, useRef } from "react";
import { useI18n } from "@/lib/i18n";

interface ParsedTx {
  date: string;
  type: "buy" | "sell" | "dividend" | "fee";
  ticker: string;
  shares: number;
  price: number;
  total: number;
  fees: number;
  currency: string;
}

interface BrokerTemplate {
  name: string;
  dateCol: string;
  typeCol: string;
  tickerCol: string;
  sharesCol: string;
  priceCol: string;
  totalCol: string;
  feesCol: string;
  currencyCol: string;
  buyKeywords: string[];
  sellKeywords: string[];
  dividendKeywords: string[];
  delimiter: string;
}

const BROKER_TEMPLATES: BrokerTemplate[] = [
  {
    name: "Interactive Brokers",
    dateCol: "Date/Time", typeCol: "Buy/Sell", tickerCol: "Symbol", sharesCol: "Quantity",
    priceCol: "T. Price", totalCol: "Proceeds", feesCol: "Comm/Fee", currencyCol: "Currency",
    buyKeywords: ["BUY", "BOT"], sellKeywords: ["SELL", "SLD"], dividendKeywords: ["DIVIDEND"],
    delimiter: ",",
  },
  {
    name: "DEGIRO",
    dateCol: "Date", typeCol: "Description", tickerCol: "Product", sharesCol: "Quantity",
    priceCol: "Price", totalCol: "Total", feesCol: "Transaction costs", currencyCol: "Currency",
    buyKeywords: ["Buy", "Compra"], sellKeywords: ["Sell", "Venta"], dividendKeywords: ["Dividend"],
    delimiter: ",",
  },
  {
    name: "Trade Republic",
    dateCol: "Date", typeCol: "Type", tickerCol: "ISIN", sharesCol: "Shares",
    priceCol: "Rate", totalCol: "Amount", feesCol: "Fee", currencyCol: "Currency",
    buyKeywords: ["Buy", "Purchase", "Kauf"], sellKeywords: ["Sell", "Verkauf"], dividendKeywords: ["Dividend", "Dividende"],
    delimiter: ",",
  },
  {
    name: "Generic CSV",
    dateCol: "date", typeCol: "type", tickerCol: "ticker", sharesCol: "shares",
    priceCol: "price", totalCol: "total", feesCol: "fees", currencyCol: "currency",
    buyKeywords: ["buy"], sellKeywords: ["sell"], dividendKeywords: ["dividend"],
    delimiter: ",",
  },
];

export default function BrokerImport() {
  const { t } = useI18n();
  const [broker, setBroker] = useState<BrokerTemplate>(BROKER_TEMPLATES[3]);
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [parsed, setParsed] = useState<ParsedTx[]>([]);
  const [step, setStep] = useState<"upload" | "preview" | "done">("upload");
  const [importing, setImporting] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const parseCSV = (text: string) => {
    const lines = text.split("\n").filter((l) => l.trim());
    const delim = broker.delimiter || ",";
    const rows = lines.map((line) => {
      const result: string[] = [];
      let current = "";
      let inQuotes = false;
      for (const ch of line) {
        if (ch === '"') { inQuotes = !inQuotes; continue; }
        if (ch === delim && !inQuotes) { result.push(current.trim()); current = ""; continue; }
        current += ch;
      }
      result.push(current.trim());
      return result;
    });
    return rows;
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const rows = parseCSV(text);
      if (rows.length < 2) return;
      setHeaders(rows[0]);
      setCsvData(rows.slice(1));
      parseTxs(rows[0], rows.slice(1));
      setStep("preview");
    };
    reader.readAsText(file);
  };

  const findCol = (hdrs: string[], target: string): number => {
    const idx = hdrs.findIndex((h) => h.toLowerCase().includes(target.toLowerCase()));
    return idx;
  };

  const detectType = (val: string): ParsedTx["type"] => {
    const lower = val.toLowerCase();
    if (broker.dividendKeywords.some((k) => lower.includes(k.toLowerCase()))) return "dividend";
    if (broker.sellKeywords.some((k) => lower.includes(k.toLowerCase()))) return "sell";
    if (broker.buyKeywords.some((k) => lower.includes(k.toLowerCase()))) return "buy";
    return "buy";
  };

  const parseTxs = (hdrs: string[], rows: string[][]) => {
    const dateIdx = findCol(hdrs, broker.dateCol);
    const typeIdx = findCol(hdrs, broker.typeCol);
    const tickerIdx = findCol(hdrs, broker.tickerCol);
    const sharesIdx = findCol(hdrs, broker.sharesCol);
    const priceIdx = findCol(hdrs, broker.priceCol);
    const totalIdx = findCol(hdrs, broker.totalCol);
    const feesIdx = findCol(hdrs, broker.feesCol);
    const currIdx = findCol(hdrs, broker.currencyCol);

    const txs: ParsedTx[] = [];
    for (const row of rows) {
      if (row.length < 3) continue;
      const rawDate = dateIdx >= 0 ? row[dateIdx] : "";
      const date = rawDate.length >= 10 ? rawDate.slice(0, 10) : rawDate;
      if (!date) continue;

      txs.push({
        date,
        type: typeIdx >= 0 ? detectType(row[typeIdx]) : "buy",
        ticker: tickerIdx >= 0 ? row[tickerIdx].replace(/['"]/g, "") : "",
        shares: sharesIdx >= 0 ? Math.abs(parseFloat(row[sharesIdx]) || 0) : 0,
        price: priceIdx >= 0 ? Math.abs(parseFloat(row[priceIdx]) || 0) : 0,
        total: totalIdx >= 0 ? Math.abs(parseFloat(row[totalIdx]) || 0) : 0,
        fees: feesIdx >= 0 ? Math.abs(parseFloat(row[feesIdx]) || 0) : 0,
        currency: currIdx >= 0 ? row[currIdx] || "EUR" : "EUR",
      });
    }
    setParsed(txs.filter((tx) => tx.ticker && tx.date));
  };

  const handleImportAll = async () => {
    setImporting(true);
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
          taxes: 0,
          currency: tx.currency,
          notes: `Imported from ${broker.name}`,
        }),
      });
      if (res.ok) count++;
    }
    setImportedCount(count);
    setImporting(false);
    setStep("done");
  };

  return (
    <div className="card">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{t("brokerImport")}</h3>
      <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">{t("brokerImportDesc")}</p>

      {step === "upload" && (
        <>
          <div className="mb-3">
            <label className="text-xs text-gray-600 dark:text-slate-400 block mb-1">{t("selectBroker")}</label>
            <div className="flex flex-wrap gap-1">
              {BROKER_TEMPLATES.map((b) => (
                <button
                  key={b.name}
                  onClick={() => setBroker(b)}
                  className={`text-[10px] font-medium px-2 py-1 rounded-lg transition-colors ${
                    broker.name === b.name ? "bg-emerald-500 text-white" : "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300"
                  }`}
                >
                  {b.name}
                </button>
              ))}
            </div>
          </div>
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-xl p-8 text-center cursor-pointer hover:border-emerald-400 dark:hover:border-emerald-500/50 transition-colors"
          >
            <p className="text-sm text-gray-600 dark:text-slate-400">Click to upload {broker.name} CSV</p>
            <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={handleFile} className="hidden" />
          </div>
        </>
      )}

      {step === "preview" && (
        <>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">{parsed.length} transactions found</span>
            <div className="flex gap-2">
              <button onClick={() => setStep("upload")} className="btn-secondary text-xs px-3 py-1.5">{t("cancel")}</button>
              <button onClick={handleImportAll} disabled={importing} className="btn-primary text-xs px-3 py-1.5 disabled:opacity-50">
                {importing ? "Importing..." : `${t("importTransactions")} (${parsed.length})`}
              </button>
            </div>
          </div>
          <div className="overflow-x-auto max-h-64 overflow-y-auto border border-gray-200 dark:border-slate-700 rounded-xl">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 dark:bg-slate-800/50 sticky top-0">
                <tr className="text-gray-500 dark:text-slate-400">
                  <th className="text-left p-2">Date</th>
                  <th className="text-left p-2">Type</th>
                  <th className="text-left p-2">Ticker</th>
                  <th className="text-right p-2">Shares</th>
                  <th className="text-right p-2">Price</th>
                  <th className="text-right p-2">Total</th>
                  <th className="text-right p-2">Fees</th>
                </tr>
              </thead>
              <tbody>
                {parsed.slice(0, 50).map((tx, i) => (
                  <tr key={i} className="border-t border-gray-100 dark:border-slate-700">
                    <td className="p-2">{tx.date}</td>
                    <td className="p-2"><span className={`inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-medium ${tx.type === "buy" ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : tx.type === "sell" ? "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400" : "bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400"}`}>{tx.type}</span></td>
                    <td className="p-2 font-mono font-medium">{tx.ticker}</td>
                    <td className="p-2 text-right font-mono">{tx.shares}</td>
                    <td className="p-2 text-right font-mono">{tx.price.toFixed(2)}</td>
                    <td className="p-2 text-right font-mono">{tx.total.toFixed(2)}</td>
                    <td className="p-2 text-right font-mono text-gray-400">{tx.fees.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {step === "done" && (
        <div className="text-center py-8">
          <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center mb-3">
            <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-900 dark:text-white">{importedCount} transactions imported!</p>
          <button onClick={() => { setStep("upload"); setParsed([]); setCsvData([]); }} className="btn-secondary text-xs px-3 py-1.5 mt-3">
            Import More
          </button>
        </div>
      )}
    </div>
  );
}
