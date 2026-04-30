import { formatChatCardNumber, type AllocationCardData } from "./types";

export default function AllocationCard({ data }: { data: AllocationCardData }) {
  const showValues = data.privacy === "full";
  return (
    <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 p-3 min-w-[200px] max-w-[260px]">
      <div className="text-xs font-semibold mb-2">Portfolio Allocation</div>
      {showValues && data.totalValue != null && (
        <div className="text-lg font-bold mb-2">
          {formatChatCardNumber(data.totalValue, data.currency)}
        </div>
      )}
      <div className="flex h-3 rounded-full overflow-hidden mb-2">
        {data.items.map((item, i) => (
          <div
            key={i}
            style={{ width: `${item.pct}%`, backgroundColor: item.color }}
            className="min-w-[2px]"
          />
        ))}
      </div>
      <div className="space-y-1">
        {data.items.slice(0, 6).map((item, i) => (
          <div key={i} className="flex items-center gap-1.5 text-xs">
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <span className="flex-1 truncate text-gray-600 dark:text-slate-300">
              {data.privacy === "categories" ? "••••" : item.label}
            </span>
            <span className="font-medium">{item.pct.toFixed(1)}%</span>
          </div>
        ))}
      </div>
      <div className="mt-2 text-[10px] text-gray-400 dark:text-slate-500 uppercase tracking-wider">
        Allocation
      </div>
    </div>
  );
}
