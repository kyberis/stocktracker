import { formatChatCardNumber, type HoldingCardData } from "./types";

export default function HoldingCard({ data }: { data: HoldingCardData }) {
  const isAnon = data.privacy === "anonymous";
  const isTickerOnly = data.privacy === "ticker_only";
  return (
    <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 min-w-[200px] max-w-[260px]">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-xs font-bold text-indigo-700 dark:text-indigo-300">
          {data.ticker.slice(0, 2)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm truncate">{data.ticker}</div>
          {data.name && !isAnon && (
            <div className="text-[11px] text-gray-500 dark:text-slate-400 truncate">{data.name}</div>
          )}
        </div>
      </div>
      {!isTickerOnly && (
        <div className="space-y-1 text-xs">
          {data.currentPrice != null && (
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-slate-400">Price</span>
              <span className="font-medium">
                {formatChatCardNumber(data.currentPrice, data.currency)}
              </span>
            </div>
          )}
          {data.shares != null && !isAnon && (
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-slate-400">Shares</span>
              <span className="font-medium">{data.shares}</span>
            </div>
          )}
          {data.avgPrice != null && !isAnon && (
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-slate-400">Avg price</span>
              <span className="font-medium">
                {formatChatCardNumber(data.avgPrice, data.currency)}
              </span>
            </div>
          )}
          {data.changePct != null && (
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-slate-400">Change</span>
              <span
                className={`font-medium ${
                  data.changePct >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-red-600 dark:text-red-400"
                }`}
              >
                {data.changePct >= 0 ? "+" : ""}
                {data.changePct.toFixed(2)}%
              </span>
            </div>
          )}
        </div>
      )}
      <div className="mt-2 text-[10px] text-gray-400 dark:text-slate-500 uppercase tracking-wider">
        Holding
      </div>
    </div>
  );
}
