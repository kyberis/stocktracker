import { formatChatCardNumber, type StockPickCardData } from "./types";

export default function StockPickCard({ data }: { data: StockPickCardData }) {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 min-w-[200px] max-w-[260px]">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-xs font-bold text-amber-700 dark:text-amber-300">
          {data.ticker.slice(0, 2)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm">{data.ticker}</div>
          {data.name && (
            <div className="text-[11px] text-gray-500 dark:text-slate-400 truncate">{data.name}</div>
          )}
        </div>
      </div>
      {data.currentPrice != null && (
        <div className="text-sm font-bold">
          {formatChatCardNumber(data.currentPrice, data.currency)}
        </div>
      )}
      {data.note && (
        <div className="mt-1 text-xs text-gray-600 dark:text-slate-300 italic">&ldquo;{data.note}&rdquo;</div>
      )}
      <div className="mt-2 text-[10px] text-gray-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1">
        <span>⭐</span> Stock Pick
      </div>
    </div>
  );
}
