"use client";

import { useCallback, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { formatCurrency } from "@/lib/utils";
import { usePortfolio } from "@/lib/portfolio-context";
import type { MarkReconciliation } from "@/lib/snaptrade-mark-reconciliation";

const DISMISS_KEY = "trefolio_mark_gap_dismissed";

function fingerprint(result: MarkReconciliation): string {
  return result.gaps.map((g) => g.ticker).sort().join(",");
}

export default function HomeBrokerMarkGapBanner({
  markGap,
}: {
  markGap: MarkReconciliation | null | undefined;
}) {
  const { t } = useI18n();
  const { activePortfolioCurrency } = usePortfolio();
  const [dismissed, setDismissed] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      return window.sessionStorage.getItem(DISMISS_KEY);
    } catch {
      return null;
    }
  });

  const dismiss = useCallback(() => {
    if (!markGap) return;
    const key = fingerprint(markGap);
    setDismissed(key);
    try {
      window.sessionStorage.setItem(DISMISS_KEY, key);
    } catch {
      /* private browsing */
    }
  }, [markGap]);

  if (!markGap || markGap.gaps.length === 0) return null;
  const key = fingerprint(markGap);
  if (dismissed === key) return null;

  const top = markGap.gaps[0];
  const extra = markGap.gaps.length - 1;
  const gapAbs = Math.abs(top.deltaEUR);

  return (
    <div
      role="status"
      data-testid="home-broker-mark-gap-banner"
      className="relative overflow-hidden rounded-xl border border-amber-500/30 bg-[color:var(--surface-soft)] p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[color:var(--foreground)]">
            {t("homeBrokerMarkGapTitle")}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-[color:var(--muted)]">
            {t("homeBrokerMarkGapBody")
              .replace("{ticker}", top.ticker)
              .replace("{delta}", formatCurrency(gapAbs, activePortfolioCurrency))
              .replace("{extra}", extra > 0 ? t("homeBrokerMarkGapExtra").replace("{count}", String(extra)) : "")}
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label={t("dismiss")}
          className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl text-[color:var(--muted)] hover:bg-[color:var(--surface-highlight)] hover:text-[color:var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]"
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>
    </div>
  );
}
