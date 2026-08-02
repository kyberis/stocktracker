"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import type { Holding } from "@/lib/types";

function isCashHolding(holding: Holding): boolean {
  return (
    holding.exchange.trim().toUpperCase() === "CASH" ||
    holding.ticker.trim().toUpperCase().startsWith("CASH-")
  );
}

/** Company analysis works for equities/ETFs (not cash/crypto). */
export function holdingSupportsAnalysis(holding: Holding): boolean {
  if (isCashHolding(holding)) return false;
  return (holding.assetType ?? "stock") !== "crypto";
}

/** Moat evaluation is stock-only (matches stock detail CTA). */
export function holdingSupportsMoat(holding: Holding): boolean {
  if (isCashHolding(holding)) return false;
  return (holding.assetType ?? "stock") === "stock";
}

type Variant = "inline" | "pills";

/**
 * Quick links to company analysis and moat from a portfolio position.
 * Stops propagation so parent row click (drawer / stock page) does not fire.
 */
export default function HoldingResearchLinks({
  holding,
  variant = "inline",
  className = "",
}: {
  holding: Holding;
  variant?: Variant;
  className?: string;
}) {
  const { t } = useI18n();
  const showAnalysis = holdingSupportsAnalysis(holding);
  const showMoat = holdingSupportsMoat(holding);
  if (!showAnalysis && !showMoat) return null;

  const stop = (e: React.SyntheticEvent) => {
    e.stopPropagation();
  };

  const analysisHref = `/analisis/${encodeURIComponent(holding.ticker)}`;
  const moatHref = `/analisis/${encodeURIComponent(holding.ticker)}?tab=evaluation&exchange=${encodeURIComponent(holding.exchange)}`;

  const linkClass =
    variant === "pills"
      ? "inline-flex items-center rounded-full border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-2.5 py-1 text-[11px] font-semibold text-[color:var(--foreground)] hover:border-[color:var(--accent)] hover:text-[color:var(--accent)] transition-colors"
      : "text-[11px] font-medium text-[color:var(--accent)] hover:underline underline-offset-2";

  return (
    <div
      className={`flex flex-wrap items-center gap-x-2.5 gap-y-1 ${className}`}
      data-testid="holding-research-links"
      onClick={stop}
      onKeyDown={stop}
    >
      {showAnalysis && (
        <Link
          href={analysisHref}
          onClick={stop}
          className={linkClass}
          data-testid="holding-open-analysis"
        >
          {t("holdingOpenAnalysis")}
        </Link>
      )}
      {showMoat && (
        <Link
          href={moatHref}
          onClick={stop}
          className={linkClass}
          data-testid="holding-open-moat"
        >
          {t("holdingOpenMoat")}
        </Link>
      )}
    </div>
  );
}
