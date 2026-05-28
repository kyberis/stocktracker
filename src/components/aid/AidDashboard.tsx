"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useFeatureFlagContext } from "@/lib/feature-flag-context";
import { usePortfolio } from "@/lib/portfolio-context";
import { useI18n } from "@/lib/i18n";
import { useTrack } from "@/lib/use-track";
import { usePortfolioSnapshotSync } from "@/lib/use-portfolio-snapshot-sync";
import { useAidStatus } from "@/hooks/useAidStatus";
import { useAidEngagementMetrics } from "@/hooks/useAidEngagementMetrics";
import CloverToLogo from "@/components/CloverToLogo";
import AidBriefingStrip from "./AidBriefingStrip";
import AidPriorityStrip from "./AidPriorityStrip";
import AidFinPulse from "./AidFinPulse";
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
  const aidStatus = useAidStatus(isLoaded && flags.aid_beta && !isInitializing);
  const pageViewSent = useRef(false);
  const visitMarked = useRef(false);
  const [warrenPrompt, setWarrenPrompt] = useState<string | null>(null);

  const investmentCash = useMemo(
    () => cashEntries.filter((c) => !c.type || c.type === "cash"),
    [cashEntries],
  );

  const isEmpty = holdings.length === 0 && cashEntries.length === 0;
  const hasHoldings = holdings.length > 0 || investmentCash.length > 0;

  useAidEngagementMetrics(isLoaded && flags.aid_beta && !isInitializing && !isEmpty);

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

  useEffect(() => {
    if (!isLoaded || !flags.aid_beta || isInitializing || visitMarked.current || isEmpty) return;
    visitMarked.current = true;
    const timer = window.setTimeout(() => {
      void aidStatus.markVisited();
    }, 8000);
    return () => window.clearTimeout(timer);
  }, [isLoaded, flags.aid_beta, isInitializing, isEmpty, aidStatus]);

  const scrollToFinPulse = () => {
    document.getElementById("aid-finpulse")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

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
            {aidStatus.data && aidStatus.data.newCount > 0 && (
              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold tabular-nums text-amber-700 dark:text-amber-300">
                {aidStatus.data.newCount}
              </span>
            )}
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
            <>
              <AidEmptyMain />
              <AidFinPulse hasHoldings={false} showForYou={false} />
            </>
          ) : (
            <>
              <AidBriefingStrip
                status={aidStatus.data}
                loading={aidStatus.loading}
                onCatchUp={scrollToFinPulse}
              />
              <AidPriorityStrip hasHoldings={hasHoldings} />
              <AidFinPulse hasHoldings={hasHoldings} />
              <AidNewsDigest hasHoldings={hasHoldings} />
              <AidEarningsRecap hasHoldings={hasHoldings} />
              <AidPortfolioCard holdings={holdings} cashEntries={investmentCash} />
              <AidExtrasRow holdings={holdings} cashEntries={investmentCash} />
              <AidHoldingsLookup holdings={holdings} />
              <AidShortcutsSection hasHoldings={hasHoldings} />
            </>
          )}
          {isEmpty && <AidShortcutsSection hasHoldings={false} />}
        </div>

        <div className="w-full shrink-0 space-y-4 lg:w-[360px]">
          <AidWarrenPanel
            hasHoldings={hasHoldings}
            warrenNudge={aidStatus.data?.warrenNudge ?? null}
            triggerPrompt={warrenPrompt}
            onWarrenAsk={(prompt) => setWarrenPrompt(prompt)}
            onTriggerPromptConsumed={() => setWarrenPrompt(null)}
          />
          <AidWillCard will={insights.data?.will} loading={insights.loading} />
          <AidClaraCard clara={insights.data?.clara} loading={insights.loading} />
        </div>
      </div>

      <AidPageFooter />
    </main>
  );
}
