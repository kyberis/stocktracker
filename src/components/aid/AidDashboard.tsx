"use client";

import { useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useFeatureFlagContext } from "@/lib/feature-flag-context";
import { usePortfolio } from "@/lib/portfolio-context";
import { useI18n } from "@/lib/i18n";
import { useTrack } from "@/lib/use-track";
import { usePortfolioSnapshotSync } from "@/lib/use-portfolio-snapshot-sync";
import CloverToLogo from "@/components/CloverToLogo";
import AidPortfolioCard from "./AidPortfolioCard";
import AidHoldingsLookup from "./AidHoldingsLookup";
import AidEmptyMain from "./AidEmptyMain";
import AidEarningsRecap from "./AidEarningsRecap";
import AidNewsDigest from "./AidNewsDigest";
import AidExtrasRow from "./AidExtrasRow";
import AidShortcutsSection from "./AidShortcutsSection";
import AidWarrenPanel from "./AidWarrenPanel";
import AidWillCard from "./AidWillCard";
import AidClaraCard from "./AidClaraCard";
import { useAidInsights } from "@/hooks/useAidInsights";
import AidPageFooter from "./AidPageFooter";

export default function AidDashboard() {
  const router = useRouter();
  const { flags, isLoaded } = useFeatureFlagContext();
  const { holdings, cashEntries, isInitializing, demoMode } = usePortfolio();
  usePortfolioSnapshotSync({ demoMode });
  const { t } = useI18n();
  const track = useTrack();
  const insights = useAidInsights(isLoaded && flags.aid_beta);
  const pageViewSent = useRef(false);

  const investmentCash = useMemo(
    () => cashEntries.filter((c) => !c.type || c.type === "cash"),
    [cashEntries],
  );

  const isEmpty = holdings.length === 0 && cashEntries.length === 0;
  const hasHoldings = holdings.length > 0 || investmentCash.length > 0;

  useEffect(() => {
    if (isLoaded && !flags.aid_beta) {
      router.replace("/");
    }
  }, [isLoaded, flags.aid_beta, router]);

  useEffect(() => {
    if (!isLoaded || !flags.aid_beta || isInitializing || pageViewSent.current) return;
    pageViewSent.current = true;
    track("aid_page_viewed", { state: isEmpty ? "empty" : "holdings" });
  }, [isLoaded, flags.aid_beta, isInitializing, isEmpty, track]);

  if (!isLoaded || !flags.aid_beta) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <CloverToLogo className="h-16 w-16" once delay={200} transitionMs={1400} />
      </div>
    );
  }

  if (isInitializing) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4" role="status">
        <CloverToLogo className="h-16 w-16" once delay={200} transitionMs={1400} />
        <span className="text-sm text-[color:var(--muted)]">{t("loading")}</span>
      </div>
    );
  }

  return (
    <main id="aid-main" className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-6" aria-labelledby="aid-page-title">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">
              {t("aidBetaBadge")}
            </span>
            <h1 id="aid-page-title" className="text-lg font-bold text-[color:var(--foreground)]">{t("aidTitle")}</h1>
          </div>
          <p className="text-xs text-[color:var(--muted)]">{t("aidSubtitle")}</p>
        </div>
        <Link href="/" className="text-xs font-semibold text-[color:var(--muted)] hover:text-[color:var(--foreground)]">
          {t("aidBackHome")}
        </Link>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1 space-y-4">
          {isEmpty ? (
            <AidEmptyMain />
          ) : (
            <>
              <AidPortfolioCard holdings={holdings} cashEntries={investmentCash} />
              <AidHoldingsLookup holdings={holdings} />
              <AidEarningsRecap hasHoldings={hasHoldings} />
              <AidNewsDigest hasHoldings={hasHoldings} />
              <AidExtrasRow holdings={holdings} cashEntries={investmentCash} />
              <AidShortcutsSection hasHoldings={hasHoldings} />
            </>
          )}
          {isEmpty && <AidShortcutsSection hasHoldings={false} />}
        </div>

        <div className="w-full shrink-0 space-y-4 lg:w-[360px]">
          <AidWarrenPanel hasHoldings={hasHoldings} />
          <AidWillCard will={insights.data?.will} loading={insights.loading} />
          <AidClaraCard clara={insights.data?.clara} loading={insights.loading} />
        </div>
      </div>

      <AidPageFooter />
    </main>
  );
}
