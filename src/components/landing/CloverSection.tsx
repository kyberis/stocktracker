"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef } from "react";
import { event as gtagEvent } from "@/lib/gtag";
import { useI18n } from "@/lib/i18n";

function useInViewOnce(callback: () => void) {
  const ref = useRef<HTMLElement | null>(null);
  const fired = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || fired.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !fired.current) {
          fired.current = true;
          callback();
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [callback]);
  return ref;
}

function trackLanding(event: string, metadata?: Record<string, string>) {
  fetch("/api/analytics/landing", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, metadata }),
  }).catch(() => {});
  gtagEvent(event, metadata);
}

export default function CloverSection() {
  const { t } = useI18n();
  const sectionCb = useCallback(
    () => trackLanding("landing_section_view", { section: "clover" }),
    [],
  );
  const sectionRef = useInViewOnce(sectionCb);

  return (
    <section
      id="clover"
      aria-labelledby="landing-clover-heading"
      className="py-20 sm:py-24 bg-[#faf9f7] border-t border-slate-100"
      ref={sectionRef as React.RefObject<HTMLElement>}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-12">
          <span className="inline-block text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 mb-4">
            {t("landingCloverEyebrow")}
          </span>
          <h2
            id="landing-clover-heading"
            className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4 tracking-tight"
          >
            {t("landingCloverHeading")}{" "}
            <span className="text-emerald-500">{t("landingCloverHeadingAccent")}</span>
          </h2>
          <p className="text-lg text-slate-500 leading-relaxed">{t("landingCloverLede")}</p>
        </div>

        <div
          className="mb-10 sm:mb-12 grid grid-cols-1 sm:grid-cols-3 gap-8 items-center rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50/80 via-amber-50/40 to-emerald-50/80 px-6 py-8 sm:px-10"
          aria-label={t("landingCloverHubAria")}
        >
          <div className="flex flex-col items-center text-center gap-2">
            <Image
              src="/avatars/warren-512.png"
              alt={t("landingAgentsWarrenName")}
              width={56}
              height={56}
              className="rounded-full ring-[3px] ring-emerald-400/50 shadow-md"
            />
            <strong className="text-slate-900">{t("landingAgentsWarrenName")}</strong>
            <span className="text-sm text-slate-500 max-w-[11rem]">{t("landingCloverWarrenRole")}</span>
          </div>
          <div className="flex flex-col items-center text-center gap-2">
            <Image
              src="/avatars/clover-512.png"
              alt={t("landingCloverName")}
              width={88}
              height={88}
              className="rounded-[22px] ring-[3px] ring-emerald-400 shadow-lg shadow-emerald-500/25"
            />
            <strong className="text-xl text-slate-900 tracking-tight">{t("landingCloverName")}</strong>
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-white border border-emerald-200 px-3 py-1 rounded-full">
              {t("landingCloverCoreRole")}
            </span>
          </div>
          <div className="flex flex-col items-center text-center gap-2">
            <Image
              src="/avatars/clara-512.png"
              alt={t("landingAgentsClaraName")}
              width={56}
              height={56}
              className="rounded-full ring-[3px] ring-amber-400/50 shadow-md"
            />
            <strong className="text-slate-900">{t("landingAgentsClaraName")}</strong>
            <span className="text-sm text-slate-500 max-w-[11rem]">{t("landingCloverClaraRole")}</span>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-10 items-stretch">
          <article className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-7">
            <div className="flex items-start gap-4 mb-5">
              <Image
                src="/avatars/clover-512.png"
                alt=""
                width={64}
                height={64}
                className="rounded-[18px] ring-2 ring-emerald-400/40 shadow-md shrink-0"
              />
              <div>
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full mb-2">
                  {t("landingCloverBadge")}
                </span>
                <h3 className="text-xl font-bold text-slate-900">{t("landingCloverName")}</h3>
                <p className="text-sm text-slate-500 mt-0.5">{t("landingCloverCardSub")}</p>
              </div>
            </div>
            <ul className="grid sm:grid-cols-3 gap-3 mb-5">
              {(
                [
                  ["landingCloverValue1Title", "landingCloverValue1Desc"],
                  ["landingCloverValue2Title", "landingCloverValue2Desc"],
                  ["landingCloverValue3Title", "landingCloverValue3Desc"],
                ] as const
              ).map(([titleKey, descKey]) => (
                <li
                  key={titleKey}
                  className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5"
                >
                  <strong className="block text-sm text-slate-900 mb-1">{t(titleKey)}</strong>
                  <span className="text-xs text-slate-500 leading-relaxed">{t(descKey)}</span>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {t("landingCloverOrchestrates")}
              </span>
              <span className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-800 bg-white border border-emerald-200 rounded-full pl-1 pr-3 py-1">
                <Image
                  src="/avatars/warren-512.png"
                  alt=""
                  width={28}
                  height={28}
                  className="rounded-full ring-2 ring-emerald-300/60"
                />
                {t("landingCloverWarrenChip")}
              </span>
              <span className="inline-flex items-center gap-2 text-xs font-semibold text-amber-900 bg-white border border-amber-200 rounded-full pl-1 pr-3 py-1">
                <Image
                  src="/avatars/clara-512.png"
                  alt=""
                  width={28}
                  height={28}
                  className="rounded-full ring-2 ring-amber-300/60"
                />
                {t("landingCloverClaraChip")}
              </span>
            </div>
          </article>

          <div className="rounded-2xl bg-slate-900 text-slate-100 border border-slate-800 p-4 sm:p-5 shadow-xl shadow-slate-900/10">
            <div className="rounded-xl bg-white/[0.04] border border-white/10 p-3 mb-4">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-emerald-400 mb-3">
                <Image
                  src="/avatars/clover-512.png"
                  alt=""
                  width={24}
                  height={24}
                  className="rounded-lg ring-1 ring-emerald-400/40"
                />
                {t("landingCloverChatHeader")}
              </div>
              <p className="text-xs rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5 text-slate-300 mb-2">
                <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  {t("landingCloverChatYou")}
                </span>
                {t("landingCloverChatUser")}
              </p>
              <p className="text-xs rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-3 py-2.5 text-emerald-100 leading-relaxed">
                <span className="block text-[9px] font-bold uppercase tracking-wider text-emerald-300 mb-1">
                  {t("landingCloverName")}
                </span>
                {t("landingCloverChatReply")}
                <span className="mt-2 flex flex-wrap gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/15 text-amber-200 text-[10px] font-bold px-2 py-0.5">
                    <Image src="/avatars/clara-512.png" alt="" width={14} height={14} className="rounded-full" />
                    {t("landingCloverViaClara")}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/15 text-emerald-200 text-[10px] font-bold px-2 py-0.5">
                    <Image src="/avatars/warren-512.png" alt="" width={14} height={14} className="rounded-full" />
                    {t("landingCloverViaWarren")}
                  </span>
                </span>
              </p>
            </div>

            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              {t("landingCloverVisualLabel")}
            </p>
            <div className="grid grid-cols-2 gap-2.5 mb-3">
              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-300 mb-2">
                  <Image src="/avatars/clara-512.png" alt="" width={22} height={22} className="rounded-full ring-1 ring-amber-400/40" />
                  {t("landingCloverClaraPane")}
                </div>
                <p className="text-xl font-extrabold tracking-tight">{t("landingCloverSurplus")}</p>
                <p className="text-[11px] text-slate-400 mb-2">{t("landingCloverSurplusSub")}</p>
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>{t("landingCloverIncome")}</span>
                  <span>€3.2k</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mt-1 mb-1.5">
                  <div className="h-full w-full rounded-full bg-amber-400" />
                </div>
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>{t("landingCloverExpenses")}</span>
                  <span>€2.56k</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mt-1">
                  <div className="h-full w-4/5 rounded-full bg-amber-500" />
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300 mb-2">
                  <Image src="/avatars/warren-512.png" alt="" width={22} height={22} className="rounded-full ring-1 ring-emerald-400/40" />
                  {t("landingCloverWarrenPane")}
                </div>
                <p className="text-xl font-extrabold tracking-tight">{t("landingCloverPortfolioValue")}</p>
                <p className="text-[11px] text-slate-400 mb-2">{t("landingCloverPortfolioSub")}</p>
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>{t("landingCloverStocksEtfs")}</span>
                  <span>78%</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mt-1 mb-1.5">
                  <div className="h-full w-[78%] rounded-full bg-emerald-400" />
                </div>
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>{t("landingCloverCash")}</span>
                  <span>22%</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mt-1">
                  <div className="h-full w-[22%] rounded-full bg-emerald-300" />
                </div>
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed rounded-xl border border-white/10 bg-gradient-to-r from-amber-500/10 to-emerald-500/10 px-3 py-2.5">
              <strong className="text-white">{t("landingCloverAddedValue")} </strong>
              {t("landingCloverDisclaimer")}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
