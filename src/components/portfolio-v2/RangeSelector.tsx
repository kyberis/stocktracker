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
  const isPaid = user?.plan === "pro";

  return (
    <div className="flex gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1 backdrop-blur-md">
      {RANGES.map(({ key, label }) => {
        const needsPro = !FREE_RANGES.has(key) && !isPaid;
        const isActive = value === key;
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={`relative min-h-10 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors ${
              isActive
                ? "bg-blue-500/15 text-blue-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]"
                : "text-[color:var(--muted)] hover:bg-white/[0.06] hover:text-[color:var(--foreground)]"
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
