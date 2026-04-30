import { formatChatCardNumber, type SummaryCardData } from "./types";

export default function SummaryCard({ data }: { data: SummaryCardData }) {
  const showValues = data.privacy === "full";
  const showPcts = data.privacy !== "count_only";
  return (
    <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 p-3 min-w-[200px] max-w-[260px]">
      <div className="text-xs font-semibold mb-1">Portfolio Summary</div>
      {showValues && data.totalValue != null && (
        <div className="text-lg font-bold">
          {formatChatCardNumber(data.totalValue, data.currency)}
        </div>
      )}
      {showPcts && data.dayChangePct != null && (
        <div
          className={`text-sm font-medium ${
            (data.dayChangePct ?? 0) >= 0
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-red-600 dark:text-red-400"
          }`}
        >
          {data.dayChangePct >= 0 ? "+" : ""}
          {data.dayChangePct.toFixed(2)}%
          {showValues && data.dayChange != null && (
            <span className="text-gray-500 dark:text-slate-400 ml-1 text-xs">
              ({data.dayChange >= 0 ? "+" : ""}
              {formatChatCardNumber(data.dayChange, data.currency)})
            </span>
          )}
        </div>
      )}
      <div className="text-xs text-gray-500 dark:text-slate-400 mt-1">
        {data.holdingsCount} holdings
      </div>
      {showPcts && data.topHoldings && data.topHoldings.length > 0 && (
        <div className="mt-2 space-y-0.5">
          {data.topHoldings.slice(0, 5).map((h, i) => (
            <div key={i} className="flex justify-between text-xs">
              <span className="text-gray-600 dark:text-slate-300">{h.ticker}</span>
              <span className="font-medium">{h.pct.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      )}
      <div className="mt-2 text-[10px] text-gray-400 dark:text-slate-500 uppercase tracking-wider">
        Summary
      </div>
    </div>
  );
}
