"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useFeatureFlagContext } from "@/lib/feature-flag-context";
import { usePortfolio } from "@/lib/portfolio-context";
import { useI18n } from "@/lib/i18n";
import { useTrack } from "@/lib/use-track";
import { usePortfolioSnapshotSync } from "@/lib/use-portfolio-snapshot-sync";
import { investmentCashEntries } from "@/lib/portfolio-summary-cash";
import { useAidStatus } from "@/hooks/useAidStatus";
import { useAidEngagementMetrics } from "@/hooks/useAidEngagementMetrics";
import { useAidLayout } from "@/hooks/useAidLayout";
import type { AidMainSectionId, AidSidebarSectionId } from "@/lib/aid/layout-sections";

const AID_SECTION_LABEL_KEYS: Record<AidMainSectionId | AidSidebarSectionId, string> = {
  briefing: "aidLayoutSectionBriefing",
  priority: "aidLayoutSectionPriority",
  finpulse: "aidLayoutSectionFinpulse",
  news: "aidLayoutSectionNews",
  earnings: "aidLayoutSectionEarnings",
  portfolio: "aidLayoutSectionPortfolio",
  extras: "aidLayoutSectionExtras",
  holdings_lookup: "aidLayoutSectionHoldingsLookup",
  shortcuts: "aidLayoutSectionShortcuts",
  empty_main: "aidLayoutSectionEmptyMain",
  warren: "aidLayoutSectionWarren",
  will: "aidLayoutSectionWill",
  clara: "aidLayoutSectionClara",
};
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
import AidPortfolioHeaderSummary from "./AidPortfolioHeaderSummary";
import AidLayoutCustomizeBar from "./AidLayoutCustomizeBar";
import AidSortableSectionList from "./AidSortableSectionList";

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

  const investmentCash = useMemo(() => investmentCashEntries(cashEntries), [cashEntries]);

  const isEmpty = holdings.length === 0 && cashEntries.length === 0;
  const hasHoldings = holdings.length > 0 || investmentCash.length > 0;
  const layoutEnabled = isLoaded && flags.aid_beta && !isInitializing;

  const aidLayout = useAidLayout(layoutEnabled, isEmpty);

  useAidEngagementMetrics(layoutEnabled && !isEmpty);

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

  const sectionLabel = useCallback(
    (id: AidMainSectionId | AidSidebarSectionId) => t(AID_SECTION_LABEL_KEYS[id] as "aidTitle"),
    [t],
  );

  const mainSections = useMemo(() => {
    const sections: Partial<Record<AidMainSectionId, ReactNode>> = {
      briefing: (
        <AidBriefingStrip
          status={aidStatus.data}
          loading={aidStatus.loading}
          onCatchUp={scrollToFinPulse}
        />
      ),
      priority: <AidPriorityStrip hasHoldings={hasHoldings} />,
      finpulse: <AidFinPulse hasHoldings={hasHoldings} showForYou={hasHoldings} />,
      news: <AidNewsDigest hasHoldings={hasHoldings} />,
      earnings: <AidEarningsRecap hasHoldings={hasHoldings} />,
      portfolio: <AidPortfolioCard holdings={holdings} cashEntries={investmentCash} />,
      extras: <AidExtrasRow holdings={holdings} cashEntries={investmentCash} />,
      holdings_lookup: <AidHoldingsLookup holdings={holdings} />,
      shortcuts: <AidShortcutsSection hasHoldings={hasHoldings} />,
      empty_main: <AidEmptyMain />,
    };
    return sections;
  }, [
    aidStatus.data,
    aidStatus.loading,
    hasHoldings,
    holdings,
    investmentCash,
  ]);

  const sidebarSections = useMemo(
    () => ({
      warren: (
        <AidWarrenPanel
          hasHoldings={hasHoldings}
          warrenNudge={aidStatus.data?.warrenNudge ?? null}
          triggerPrompt={warrenPrompt}
          onWarrenAsk={(prompt) => setWarrenPrompt(prompt)}
          onTriggerPromptConsumed={() => setWarrenPrompt(null)}
        />
      ),
      will: <AidWillCard will={insights.data?.will} loading={insights.loading} />,
      clara: <AidClaraCard clara={insights.data?.clara} loading={insights.loading} />,
    }),
    [aidStatus.data?.warrenNudge, hasHoldings, insights.data?.clara, insights.data?.will, insights.loading, warrenPrompt],
  );

  const renderMainSection = useCallback(
    (id: AidMainSectionId) => mainSections[id] ?? null,
    [mainSections],
  );

  const renderSidebarSection = useCallback(
    (id: AidSidebarSectionId) => sidebarSections[id] ?? null,
    [sidebarSections],
  );

  if (!isLoaded || !flags.aid_beta) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <CloverToLogo className="h-16 w-16" once delay={200} transitionMs={1400} />
      </div>
    );
  }

  if (isInitializing || aidLayout.loading || !aidLayout.layout) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4" role="status">
        <CloverToLogo className="h-16 w-16" once delay={200} transitionMs={1400} />
        <span className="text-sm text-[color:var(--muted)]">{t("loading")}</span>
      </div>
    );
  }

  return (
    <main id="aid-main" className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-6" aria-labelledby="aid-page-title">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
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
        <div className="flex flex-col items-end gap-1.5">
          {!isEmpty && hasHoldings ? (
            <AidPortfolioHeaderSummary holdings={holdings} cashEntries={investmentCash} />
          ) : null}
          <Link href="/" className="text-xs font-semibold text-[color:var(--muted)] hover:text-[color:var(--foreground)]">
            {t("aidBackHome")}
          </Link>
        </div>
      </div>

      <AidLayoutCustomizeBar
        editing={aidLayout.editing}
        saving={aidLayout.saving}
        onToggleEditing={() => aidLayout.setEditing((v) => !v)}
        onReset={aidLayout.resetToDefault}
      />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          <AidSortableSectionList
            ids={aidLayout.layout.main}
            editing={aidLayout.editing}
            onReorder={aidLayout.reorderMain}
            getLabel={sectionLabel}
            renderItem={renderMainSection}
            ariaLabel={t("aidLayoutMainColumn")}
          />
        </div>

        <div className="w-full shrink-0 lg:w-[360px]">
          <AidSortableSectionList
            ids={aidLayout.layout.sidebar}
            editing={aidLayout.editing}
            onReorder={aidLayout.reorderSidebar}
            getLabel={sectionLabel}
            renderItem={renderSidebarSection}
            ariaLabel={t("aidLayoutSidebarColumn")}
          />
        </div>
      </div>

      <AidPageFooter />
    </main>
  );
}
