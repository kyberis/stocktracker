"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { useStealthMode } from "@/lib/stealth-context";
import { usePortfolio } from "@/lib/portfolio-context";
import type { ClaraSavingsSummary } from "@/lib/ai/office/types";
import { formatCurrency } from "@/lib/utils";

interface Props {
  clara?: ClaraSavingsSummary;
  loading: boolean;
}

export default function AidClaraCard({ clara, loading }: Props) {
  const { t } = useI18n();
  const { stealthMode } = useStealthMode();
  const { cashEntries, activePortfolioCurrency } = usePortfolio();

  const brokerCashEUR = useMemo(() => {
    return cashEntries
      .filter((c) => !c.type || c.type === "cash")
      .reduce((s, c) => s + c.amountEUR, 0);
  }, [cashEntries]);

  const freeCash = clara?.freeInInvestingBucketEur;
  const hasClaraCash = clara?.available && typeof freeCash === "number";

  return (
    <section className="card rounded-[var(--radius-card)] border border-amber-500/20 bg-amber-500/[0.04] p-4">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-sm font-semibold text-amber-800 dark:text-amber-200">Clara</span>
        <span className="text-[10px] uppercase tracking-wide text-[color:var(--muted)]">{t("aidInsightOnly")}</span>
      </div>

      {loading && (
        <p className="text-xs text-[color:var(--muted)]" role="status">
          {t("loading")}
        </p>
      )}

      {!loading && hasClaraCash && (
        <>
          <p className="text-[10px] uppercase tracking-wide text-[color:var(--muted)]">{t("aidClaraFreeCash")}</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-[color:var(--foreground)]">
            {stealthMode ? "•••" : formatCurrency(freeCash!, "EUR")}
          </p>
          {freeCash === 0 && (
            <p className="mt-1 text-xs text-[color:var(--muted)]">{t("aidClaraNoFreeCash")}</p>
          )}
          {brokerCashEUR > 0 && (
            <p className="mt-1 text-[10px] text-[color:var(--muted)]">
              {stealthMode
                ? "•••"
                : t("aidClaraBrokerCash").replace(
                    "{amount}",
                    formatCurrency(brokerCashEUR, activePortfolioCurrency),
                  )}
            </p>
          )}
          {clara?.note?.includes("Dev stub") && (
            <p className="mt-1 text-[10px] text-[color:var(--muted)]">{clara.note}</p>
          )}
        </>
      )}

      {!loading && !hasClaraCash && (
        <>
          <p className="text-xs text-[color:var(--muted)]">{clara?.note ?? t("aidClaraPlaceholder")}</p>
          {brokerCashEUR > 0 && (
            <p className="mt-2 text-xs tabular-nums text-[color:var(--foreground)]">
              {stealthMode ? "•••" : t("aidClaraBrokerOnly").replace("{amount}", formatCurrency(brokerCashEUR, activePortfolioCurrency))}
            </p>
          )}
          <Link
            href="https://clara.trefolio.com"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-xs font-semibold text-amber-800 dark:text-amber-200 hover:underline"
          >
            {t("aidConnectClara")} →
          </Link>
        </>
      )}

      <p className="mt-2 text-[10px] text-[color:var(--muted)]">{t("aidThirdPartyDisclaimer")}</p>
    </section>
  );
}
