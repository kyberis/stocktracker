"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { useTrack } from "@/lib/use-track";

export default function HomeHoldingsExplorerCta() {
  const { t } = useI18n();
  const track = useTrack();

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="text-sm font-semibold text-[color:var(--foreground)]">
        {t("yourHoldings")}
      </h2>
      <Link
        href="/tools/holdings-explorer"
        data-testid="home-holdings-explorer-cta"
        onClick={() => track("home_v2_holdings_explorer_cta_clicked")}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-3 text-xs font-semibold text-[color:var(--foreground)] transition-colors hover:bg-[color:var(--surface-highlight)]"
      >
        {t("homeV2HoldingsExplorerCta")}
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
        </svg>
      </Link>
    </div>
  );
}
