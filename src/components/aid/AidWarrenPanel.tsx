"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useI18n } from "@/lib/i18n";
import { usePortfolio } from "@/lib/portfolio-context";
import { useTrack } from "@/lib/use-track";
import type { AidStatusPayload } from "@/lib/types";
import AidWarrenNudge from "./AidWarrenNudge";

const WarrenDrawer = dynamic(() => import("@/components/warren/WarrenDrawer"), { ssr: false });

function useIsLgUp() {
  const [isLgUp, setIsLgUp] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsLgUp(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return isLgUp;
}

interface Props {
  hasHoldings: boolean;
  warrenNudge?: AidStatusPayload["warrenNudge"];
  triggerPrompt?: string | null;
  onWarrenAsk?: (prompt: string) => void;
  onTriggerPromptConsumed?: () => void;
}

export default function AidWarrenPanel({
  hasHoldings,
  warrenNudge,
  triggerPrompt,
  onWarrenAsk,
  onTriggerPromptConsumed,
}: Props) {
  const { t } = useI18n();
  const { holdings } = usePortfolio();
  const track = useTrack();
  const isLgUp = useIsLgUp();
  const [mobileOpen, setMobileOpen] = useState(false);

  const suggestionPrompts = useMemo(() => {
    if (!hasHoldings) {
      return [
        t("aidWarrenChipImport"),
        t("aidWarrenChipFirstStock"),
        t("aidWarrenChipWhatHere"),
        t("aidWarrenChipMoatAapl"),
        t("aidWarrenChipMoatScreener"),
        t("aidWarrenChipNvdaNews"),
      ];
    }
    const top = holdings[0]?.ticker;
    return [
      t("aidWarrenChipToday"),
      t("aidWarrenChipMovers"),
      t("aidWarrenChipNews48h"),
      t("aidWarrenChipConcentration"),
      t("aidWarrenChipWeek"),
      t("aidWarrenChipAllocation"),
      t("aidWarrenChipEarnings"),
      t("aidWarrenChipDividendsMonth"),
      top ? t("aidWarrenChipMoatTicker").replace("{ticker}", top) : t("aidWarrenChipMoatAapl"),
    ];
  }, [hasHoldings, holdings, t]);

  const badges = (
    <div className="mb-2 flex items-center gap-2 px-0.5">
      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-700 dark:text-emerald-300">
        web
      </span>
      <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-violet-700 dark:text-violet-300">
        moat
      </span>
    </div>
  );

  const handleChip = (prompt: string) => {
    track("aid_warren_chip_used", { prompt: prompt.slice(0, 80) });
  };

  const nudgeBlock =
    warrenNudge && onWarrenAsk ? (
      <AidWarrenNudge
        nudge={warrenNudge}
        onAsk={(prompt) => {
          onWarrenAsk(prompt);
          if (!isLgUp) setMobileOpen(true);
        }}
      />
    ) : null;

  if (isLgUp) {
    return (
      <section
        aria-label={t("warrenName")}
        className="lg:sticky lg:top-24 lg:z-30 lg:w-full lg:self-start space-y-4"
      >
        {nudgeBlock}
        {badges}
        <WarrenDrawer
          embedded
          embeddedClassName="h-[calc(100dvh-7rem)] min-h-[480px] max-h-[720px]"
          isOpen
          onClose={() => {}}
          suggestionPrompts={suggestionPrompts}
          onSuggestionClick={handleChip}
          triggerPrompt={triggerPrompt}
          onTriggerPromptConsumed={onTriggerPromptConsumed}
        />
      </section>
    );
  }

  return (
    <section aria-label={t("warrenName")} className="lg:hidden space-y-4">
      {nudgeBlock}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="card flex min-h-11 w-full items-center justify-between gap-3 rounded-[var(--radius-card)] p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
        aria-expanded={mobileOpen}
        aria-controls="aid-warren-sheet"
      >
        <div>
          <div className="text-sm font-semibold text-[color:var(--foreground)]">{t("warrenName")}</div>
          <div className="text-xs text-[color:var(--muted)]">{t("aidWarrenOpenSheet")}</div>
        </div>
        <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-800 dark:text-amber-200">
          {t("aidWarrenAsk")}
        </span>
      </button>

      <WarrenDrawer
        isOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        suggestionPrompts={suggestionPrompts}
        onSuggestionClick={handleChip}
        triggerPrompt={triggerPrompt}
        onTriggerPromptConsumed={onTriggerPromptConsumed}
      />
    </section>
  );
}
