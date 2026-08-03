"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import { usePortfolio } from "@/lib/portfolio-context";
import ProCompareCard from "./ProCompareCard";

const BacktestPanel = dynamic(() => import("./simulator/BacktestPanel"), { ssr: false });
const WhatIfPanel = dynamic(() => import("./simulator/WhatIfPanel"), { ssr: false });
const StressTestPanel = dynamic(() => import("./simulator/StressTestPanel"), { ssr: false });

type SimulatorMode = "backtest" | "whatif" | "stress";

const MODE_ICONS: Record<SimulatorMode, string> = {
  backtest: "M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z",
  whatif: "M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 01-2.031.352 5.988 5.988 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 01-2.031.352 5.989 5.989 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971z",
  stress: "M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z",
};

export default function PortfolioSimulator() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { demoMode } = usePortfolio();
  const [mode, setMode] = useState<SimulatorMode>("backtest");

  if (user?.plan !== "pro" && user?.role !== "admin" && !demoMode) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18M19 9l-5 5-4-4-3 3" />
            </svg>
            {t("simulatorTitle")}
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{t("simulatorSubtitle")}</p>
        </div>
        <div className="rounded-xl border border-dashed border-gray-300 dark:border-slate-600 p-6 text-center text-sm text-gray-600 dark:text-slate-300">
          {t("simulatorSubtitle")}
        </div>
        <ProCompareCard surface="simulator_locked" reason="upgrade_required" />
      </div>
    );
  }

  const modes: { key: SimulatorMode; labelKey: string }[] = [
    { key: "backtest", labelKey: "simulatorBacktest" },
    { key: "whatif", labelKey: "simulatorWhatIf" },
    { key: "stress", labelKey: "simulatorStressTest" },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18M19 9l-5 5-4-4-3 3" />
          </svg>
          {t("simulatorTitle")}
        </h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{t("simulatorSubtitle")}</p>
      </div>

      {/* Mode tabs */}
      <div className="inline-flex bg-white dark:bg-slate-800 rounded-xl p-1 border border-gray-200 dark:border-slate-700">
        {modes.map(({ key, labelKey }) => (
          <button
            key={key}
            onClick={() => setMode(key)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              mode === key
                ? "bg-emerald-500 text-white shadow-sm"
                : "text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d={MODE_ICONS[key]} />
            </svg>
            <span className="hidden sm:inline">{t(labelKey)}</span>
          </button>
        ))}
      </div>

      {/* Active panel */}
      {mode === "backtest" && <BacktestPanel demoMode={demoMode} />}
      {mode === "whatif" && <WhatIfPanel demoMode={demoMode} />}
      {mode === "stress" && <StressTestPanel demoMode={demoMode} />}
    </div>
  );
}
