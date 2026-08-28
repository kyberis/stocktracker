"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import ClaraLandingModal from "@/components/clara/ClaraLandingModal";
import WarrenAvatar from "@/components/warren/WarrenAvatar";
import {
  formatSignedCurrency,
  isUsableSurplus,
  remainingDaysInMonth,
  resolveClaraPulseDisplay,
  resolveMoneyDeskHandoff,
  type ClaraDeskStatus,
} from "@/lib/clara-desk-status";
import { useI18n } from "@/lib/i18n";
import { useStealthMode } from "@/lib/stealth-context";
import { useTrack } from "@/lib/use-track";
import { formatCurrency } from "@/lib/utils";

interface Props {
  dayGainLoss: number;
  displayCurrency: string;
  hasHoldings: boolean;
  demoMode: boolean;
  clara: ClaraDeskStatus | null;
  claraLoading: boolean;
  onOpenWarren: () => void;
}

export default function HomeMoneyDesk({
  dayGainLoss,
  displayCurrency,
  hasHoldings,
  demoMode,
  clara,
  claraLoading,
  onOpenWarren,
}: Props) {
  const { t } = useI18n();
  const track = useTrack();
  const { stealthMode } = useStealthMode();
  const [claraOpen, setClaraOpen] = useState(false);

  const linked = clara?.linked === true;
  const surplus = clara?.surplusEur;
  const claraCurrency = clara?.currency || "EUR";
  const daysLeft = remainingDaysInMonth(clara?.dayOfMonth, clara?.daysInMonth);
  const pulse = resolveClaraPulseDisplay(clara);
  const handoff = resolveMoneyDeskHandoff({
    hasHoldings,
    linked,
    surplusEur: surplus,
  });

  const viewed = useRef(false);
  useEffect(() => {
    if (claraLoading || viewed.current) return;
    viewed.current = true;
    track("home_money_desk_viewed", {
      holdings: hasHoldings ? "yes" : "no",
      linked: linked ? "yes" : "no",
    });
  }, [claraLoading, hasHoldings, linked, track]);

  const marketValue = stealthMode
    ? "•••••"
    : hasHoldings
      ? formatSignedCurrency(dayGainLoss, displayCurrency)
      : t("homeMoneyDeskNoPortfolio");
  const marketPositive = hasHoldings && dayGainLoss > 0.005;
  const marketNegative = hasHoldings && dayGainLoss < -0.005;

  const claraPulseValue = (() => {
    if (stealthMode) return "•••••";
    if (claraLoading) return "…";
    switch (pulse.kind) {
      case "unlinked":
        return "—";
      case "setup":
        return t("homeMoneyDeskClaraSetupMonth");
      case "zero":
        return formatCurrency(0, claraCurrency);
      case "balance":
        return formatSignedCurrency(pulse.value ?? 0, claraCurrency);
      default:
        return "—";
    }
  })();

  const claraPulsePositive = !stealthMode && !claraLoading && pulse.tone === "positive";
  const claraPulseNegative = !stealthMode && !claraLoading && pulse.tone === "negative";
  const showClaraOnTrack =
    !stealthMode && !claraLoading && pulse.kind === "zero" && linked;

  const warrenNudge = hasHoldings
    ? t("homeMoneyDeskWarrenNudge")
    : t("homeMoneyDeskWarrenEmptyNudge");
  const claraNudge =
    linked && daysLeft != null
      ? t("homeMoneyDeskClaraDaysNudge").replace("{days}", String(daysLeft))
      : linked
        ? t("homeMoneyDeskClaraNudge")
        : t("homeMoneyDeskClaraOnboardNudge");

  const warrenCta = hasHoldings ? t("homeMoneyDeskWarrenCta") : t("homeMoneyDeskWarrenEmptyCta");
  const claraCta = linked ? t("homeMoneyDeskClaraOpenCta") : t("homeMoneyDeskClaraCreateCta");

  const handoffText =
    handoff === "surplus" && isUsableSurplus(surplus)
      ? t("homeMoneyDeskHandoffSurplus").replace(
          "{amount}",
          stealthMode ? "•••••" : formatCurrency(surplus, claraCurrency),
        )
      : handoff === "add_first"
        ? t("homeMoneyDeskHandoffAddFirst")
        : null;

  const openWarren = () => {
    track("home_money_desk_warren_clicked", { empty: hasHoldings ? "no" : "yes" });
    onOpenWarren();
  };

  const openClara = () => {
    track("home_money_desk_clara_clicked", { kind: linked ? "linked" : "create" });
    setClaraOpen(true);
  };

  const warrenTileClass =
    "flex min-h-[44px] flex-col gap-2 rounded-xl border border-amber-500/28 bg-black/20 p-2.5 text-left text-[color:var(--foreground)] transition-transform hover:-translate-y-px";
  const claraTileClass =
    "flex min-h-[44px] flex-col gap-2 rounded-xl border border-sky-500/28 bg-black/20 p-2.5 text-left text-[color:var(--foreground)] transition-transform hover:-translate-y-px";

  const warrenInner = (
    <>
      <div className="flex items-center gap-2">
        <WarrenAvatar size={36} />
        <div className="min-w-0">
          <div className="text-xs font-bold text-amber-700 dark:text-amber-300">{t("warrenName")}</div>
          <div className="text-[10px] text-[color:var(--muted)]">{t("homeMoneyDeskWarrenRole")}</div>
        </div>
      </div>
      <p className="min-h-[2.7em] text-[11px] leading-snug text-[color:var(--muted)]">{warrenNudge}</p>
      <span className="text-[11px] font-semibold">{warrenCta} →</span>
    </>
  );

  const claraInner = (
    <>
      <div className="flex items-center gap-2">
        <span
          className="inline-block h-9 w-9 shrink-0 overflow-hidden rounded-full ring-2 ring-sky-500/25"
          aria-hidden="true"
        >
          <Image
            src="/avatars/clara-512.png"
            alt=""
            width={36}
            height={36}
            className="h-full w-full object-cover"
          />
        </span>
        <div className="min-w-0">
          <div className="text-xs font-bold text-sky-700 dark:text-sky-300">{t("claraName")}</div>
          <div className="text-[10px] text-[color:var(--muted)]">{t("homeMoneyDeskClaraRole")}</div>
        </div>
      </div>
      <p className="min-h-[2.7em] text-[11px] leading-snug text-[color:var(--muted)]">{claraNudge}</p>
      <span className="text-[11px] font-semibold">{claraCta} →</span>
    </>
  );

  return (
    <section
      className="card overflow-hidden rounded-[var(--radius-card)] border border-[color:var(--border)] p-3.5"
      style={{
        background:
          "radial-gradient(120% 80% at 0% 0%, rgba(251, 191, 36, 0.08), transparent 50%), radial-gradient(120% 80% at 100% 0%, rgba(56, 189, 248, 0.08), transparent 50%)",
      }}
      aria-labelledby="home-money-desk-title"
      data-testid="home-money-desk"
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h2
            id="home-money-desk-title"
            className="text-sm font-bold tracking-tight text-[color:var(--foreground)]"
          >
            {t("homeMoneyDeskTitle")}
          </h2>
          <p className="mt-0.5 text-[11px] text-[color:var(--muted)]">{t("homeMoneyDeskSubtitle")}</p>
        </div>
        <span className="rounded-full bg-emerald-500/14 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
          {t("homeMoneyDeskDuo")}
        </span>
      </div>

      <div
        className="mb-3 grid grid-cols-[1fr_auto_1fr] items-stretch gap-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-2.5 py-2.5"
        aria-label={t("homeMoneyDeskPulseLabel")}
      >
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-wide text-[color:var(--muted)]">
            {t("homeMoneyDeskMarketsToday")}
          </div>
          <div
            className={`mt-0.5 text-base font-bold tabular-nums ${
              marketPositive
                ? "text-emerald-600 dark:text-emerald-400"
                : marketNegative
                  ? "text-red-500 dark:text-red-400"
                  : "text-[color:var(--foreground)]"
            }`}
            aria-label={`${t("homeMoneyDeskMarketsToday")}: ${marketValue}`}
          >
            {marketValue}
          </div>
        </div>
        <div className="flex min-w-[48px] flex-col items-center justify-center gap-1 text-[10px] text-[color:var(--muted)]" aria-hidden>
          <span className="h-0.5 w-7 rounded-full bg-gradient-to-r from-amber-400 to-sky-400" />
          <span>×</span>
          <span className="h-0.5 w-7 rounded-full bg-gradient-to-r from-amber-400 to-sky-400" />
        </div>
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-wide text-[color:var(--muted)]">
            {t("homeMoneyDeskMonthBalance")}
          </div>
          <div
            className={`mt-0.5 text-base font-bold tabular-nums ${
              pulse.kind === "setup"
                ? "text-xs font-semibold leading-snug text-sky-700 dark:text-sky-300"
                : claraPulsePositive
                  ? "text-emerald-600 dark:text-emerald-400"
                  : claraPulseNegative
                    ? "text-red-500 dark:text-red-400"
                    : "text-sky-700 dark:text-sky-300"
            }`}
            aria-label={`${t("homeMoneyDeskMonthBalance")}: ${claraPulseValue}`}
          >
            {claraPulseValue}
          </div>
          {showClaraOnTrack && (
            <div className="mt-0.5 text-[10px] text-[color:var(--muted)]">{t("homeMoneyDeskMonthOnTrack")}</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {demoMode ? (
          <Link href="/signup" className={warrenTileClass} onClick={() => track("home_money_desk_warren_clicked", { empty: hasHoldings ? "no" : "yes" })}>
            {warrenInner}
          </Link>
        ) : (
          <button type="button" className={warrenTileClass} onClick={openWarren}>
            {warrenInner}
          </button>
        )}
        {demoMode ? (
          <Link href="/signup" className={claraTileClass} onClick={() => track("home_money_desk_clara_clicked", { kind: "create" })}>
            {claraInner}
          </Link>
        ) : (
          <button type="button" className={claraTileClass} onClick={openClara} aria-haspopup="dialog">
            {claraInner}
          </button>
        )}
      </div>

      {handoffText && (
        <div className="mt-2.5 flex gap-2 rounded-[10px] border border-emerald-500/18 bg-emerald-500/[0.06] px-2.5 py-2 text-[11px] text-[color:var(--muted)]">
          <span
            className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400"
            aria-hidden
          />
          <p>
            <span className="font-semibold text-[color:var(--foreground)]">{t("homeMoneyDeskHandoffLabel")} </span>
            {handoffText}
          </p>
        </div>
      )}

      <p className="mt-2 text-center text-[10px] text-[color:var(--muted)]">{t("homeMoneyDeskDisclaimer")}</p>

      {!demoMode && <ClaraLandingModal open={claraOpen} onClose={() => setClaraOpen(false)} />}
    </section>
  );
}
