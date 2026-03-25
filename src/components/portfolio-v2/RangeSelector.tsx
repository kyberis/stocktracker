"use client";

import { useAuth } from "@/lib/auth-context";

export type EvolutionRange = "1d" | "1w" | "3m" | "6m" | "ytd" | "1y";

const RANGES: { key: EvolutionRange; label: string }[] = [
  { key: "1d", label: "1D" },
  { key: "1w", label: "1W" },
  { key: "3m", label: "3M" },
  { key: "6m", label: "6M" },
  { key: "ytd", label: "YTD" },
  { key: "1y", label: "1Y" },
];

const FREE_RANGES = new Set<EvolutionRange>(["1d", "1w"]);

interface Props {
  value: EvolutionRange;
  onChange: (r: EvolutionRange) => void;
}

export default function RangeSelector({ value, onChange }: Props) {
  const { user } = useAuth();
  const isPaid = user?.plan === "starter" || user?.plan === "pro";

  return (
    <div className="flex gap-0.5 rounded-lg bg-gray-100/60 dark:bg-white/[0.04] p-0.5">
      {RANGES.map(({ key, label }) => {
        const needsPro = !FREE_RANGES.has(key) && !isPaid;
        const isActive = value === key;
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={`relative text-[11px] font-semibold px-3 py-1.5 rounded-md transition-colors ${
              isActive
                ? "bg-blue-500/12 text-blue-500 dark:bg-blue-500/15 dark:text-blue-400"
                : "text-gray-500 dark:text-slate-500 hover:text-gray-700 dark:hover:text-slate-300"
            }`}
          >
            {label}
            {needsPro && (
              <span className="absolute -top-1 -right-0.5 text-[7px] font-bold bg-gradient-to-br from-violet-400 to-violet-600 text-white px-1 py-px rounded leading-none">
                PRO
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
