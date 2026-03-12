"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTheme } from "@/lib/theme-context";
import { useI18n } from "@/lib/i18n";
import { useWizardSpotlight, type SpotlightRect } from "@/hooks/useWizardSpotlight";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import type { LayoutTheme } from "@/lib/types";

const STORAGE_KEY = "trefolio_seen_themes";
const STEP_COUNT = 5;
const AUTO_DISMISS_MS = 30_000;
const PADDING = 8;

interface WizardStep {
  dataTour: string;
  labelKey: string;
  titleKey: string;
  bodyKey: string;
  hintKey: string;
  icon: React.ReactNode;
}

const STEPS: WizardStep[] = [
  {
    dataTour: "nav",
    labelKey: "wizardStep1Label",
    titleKey: "wizardStep1Title",
    bodyKey: "wizardStep1Body",
    hintKey: "wizardStep1Hint",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
      </svg>
    ),
  },
  {
    dataTour: "summary",
    labelKey: "wizardStep2Label",
    titleKey: "wizardStep2Title",
    bodyKey: "wizardStep2Body",
    hintKey: "wizardStep2Hint",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
      </svg>
    ),
  },
  {
    dataTour: "holdings",
    labelKey: "wizardStep3Label",
    titleKey: "wizardStep3Title",
    bodyKey: "wizardStep3Body",
    hintKey: "wizardStep3Hint",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
      </svg>
    ),
  },
  {
    dataTour: "tabs",
    labelKey: "wizardStep4Label",
    titleKey: "wizardStep4Title",
    bodyKey: "wizardStep4Body",
    hintKey: "wizardStep4Hint",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 7.125C2.25 6.504 2.754 6 3.375 6h6c.621 0 1.125.504 1.125 1.125v3.75c0 .621-.504 1.125-1.125 1.125h-6a1.125 1.125 0 01-1.125-1.125v-3.75zM14.25 8.625c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v8.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 01-1.125-1.125v-8.25zM3.75 16.125c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v2.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 01-1.125-1.125v-2.25z" />
      </svg>
    ),
  },
  {
    dataTour: "actions",
    labelKey: "wizardStep5Label",
    titleKey: "wizardStep5Title",
    bodyKey: "wizardStep5Body",
    hintKey: "wizardStep5Hint",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
      </svg>
    ),
  },
];

function getSeenThemes(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function markThemeSeen(theme: string) {
  try {
    const seen = getSeenThemes();
    if (!seen.includes(theme)) {
      seen.push(theme);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seen));
    }
  } catch {}
}

type Placement = "top" | "bottom" | "left" | "right";

function calcPlacement(rect: SpotlightRect, isMobile: boolean): { placement: Placement; top: number; left: number } {
  if (isMobile) return { placement: "bottom", top: 0, left: 0 };

  const tooltipW = 340;
  const tooltipH = 280;
  const vp = { w: window.innerWidth, h: window.innerHeight };
  const scrollY = window.scrollY;

  const viewRect = {
    top: rect.top - scrollY,
    bottom: rect.top - scrollY + rect.height,
    left: rect.left,
    right: rect.left + rect.width,
  };

  const spaceBelow = vp.h - viewRect.bottom;
  const spaceAbove = viewRect.top;
  const spaceRight = vp.w - viewRect.right;

  if (spaceBelow >= tooltipH + PADDING + 12) {
    return {
      placement: "bottom",
      top: rect.top + rect.height + PADDING + 8,
      left: Math.max(PADDING, Math.min(rect.left, vp.w - tooltipW - PADDING)),
    };
  }
  if (spaceAbove >= tooltipH + PADDING + 12) {
    return {
      placement: "top",
      top: rect.top - tooltipH - PADDING - 8,
      left: Math.max(PADDING, Math.min(rect.left, vp.w - tooltipW - PADDING)),
    };
  }
  if (spaceRight >= tooltipW + PADDING + 12) {
    return {
      placement: "right",
      top: Math.max(scrollY + PADDING, rect.top),
      left: rect.left + rect.width + PADDING + 8,
    };
  }
  return {
    placement: "left",
    top: Math.max(scrollY + PADDING, rect.top),
    left: Math.max(PADDING, rect.left - tooltipW - PADDING - 8),
  };
}

function themeFont(lt: LayoutTheme): string {
  switch (lt) {
    case "terminal": return "font-mono";
    case "studio": return "font-sans";
    case "canvas": return "font-sans";
    default: return "font-sans";
  }
}

function themeBg(lt: LayoutTheme): string {
  switch (lt) {
    case "terminal": return "bg-[#111111] border-[#2a2a2a]";
    case "studio": return "bg-zinc-900/95 backdrop-blur-xl border-white/10";
    case "canvas": return "bg-white border-slate-200 shadow-xl";
    default: return "bg-slate-800 border-slate-700";
  }
}

function themeText(lt: LayoutTheme): { title: string; body: string; hint: string; muted: string } {
  switch (lt) {
    case "terminal": return { title: "text-green-400", body: "text-zinc-400", hint: "text-zinc-600", muted: "text-zinc-700" };
    case "studio": return { title: "text-white", body: "text-zinc-400", hint: "text-zinc-600", muted: "text-zinc-600" };
    case "canvas": return { title: "text-slate-900", body: "text-slate-500", hint: "text-slate-400", muted: "text-slate-300" };
    default: return { title: "text-white", body: "text-slate-400", hint: "text-slate-500", muted: "text-slate-600" };
  }
}

function themeAccent(lt: LayoutTheme): { banner: string; stepBg: string; dotActive: string; dotDone: string; dotIdle: string; nextBtn: string; backBtn: string; skipColor: string; hintBg: string; spotlightBorder: string } {
  switch (lt) {
    case "terminal": return {
      banner: "bg-green-500/10 border-green-500/15",
      stepBg: "bg-green-500",
      dotActive: "bg-green-500",
      dotDone: "bg-green-500",
      dotIdle: "bg-zinc-800",
      nextBtn: "bg-transparent border border-green-500/40 text-green-400 hover:bg-green-500/10",
      backBtn: "bg-transparent border border-zinc-800 text-zinc-500 hover:text-zinc-300",
      skipColor: "text-zinc-700 hover:text-zinc-400",
      hintBg: "bg-black/30 border-zinc-800",
      spotlightBorder: "border-green-500/50",
    };
    case "studio": return {
      banner: "bg-emerald-500/8 border-emerald-500/10",
      stepBg: "bg-emerald-500",
      dotActive: "bg-emerald-500",
      dotDone: "bg-emerald-500",
      dotIdle: "bg-zinc-800",
      nextBtn: "bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700",
      backBtn: "bg-transparent border border-white/10 text-zinc-400 hover:text-white",
      skipColor: "text-zinc-600 hover:text-zinc-400",
      hintBg: "bg-white/[0.03] border-white/5",
      spotlightBorder: "border-emerald-500/50",
    };
    case "canvas": return {
      banner: "bg-green-50 border-green-100",
      stepBg: "bg-green-600",
      dotActive: "bg-green-600",
      dotDone: "bg-green-600",
      dotIdle: "bg-slate-200",
      nextBtn: "bg-green-600 text-white hover:bg-green-700",
      backBtn: "bg-transparent border border-slate-200 text-slate-500 hover:text-slate-700",
      skipColor: "text-slate-400 hover:text-slate-600",
      hintBg: "bg-slate-50 border-slate-100",
      spotlightBorder: "border-green-500/50",
    };
    default: return {
      banner: "bg-emerald-500/8 border-emerald-500/12",
      stepBg: "bg-emerald-500",
      dotActive: "bg-emerald-500",
      dotDone: "bg-emerald-500",
      dotIdle: "bg-slate-700",
      nextBtn: "bg-emerald-500 text-white hover:bg-emerald-600",
      backBtn: "bg-transparent border border-slate-700 text-slate-400 hover:text-white",
      skipColor: "text-slate-600 hover:text-slate-400",
      hintBg: "bg-slate-900/50 border-slate-700/50",
      spotlightBorder: "border-emerald-500/50",
    };
  }
}

export default function ThemeWizard() {
  const { layoutTheme } = useTheme();
  const { t } = useI18n();
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const themeRef = useRef(layoutTheme);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const prefersReducedMotion = useRef(false);

  useEffect(() => {
    prefersReducedMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setIsMobile(window.innerWidth < 640);
    const onResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", onResize, { passive: true });
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (layoutTheme === themeRef.current) return;
    themeRef.current = layoutTheme;

    const delay = setTimeout(() => {
      const seen = getSeenThemes();
      if (!seen.includes(layoutTheme)) {
        setStep(0);
        setActive(true);
      }
    }, 500);

    return () => clearTimeout(delay);
  }, [layoutTheme]);

  useEffect(() => {
    if (!active) return;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => dismiss(), AUTO_DISMISS_MS);
    return () => clearTimeout(timerRef.current);
  }, [active, step]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentStep = STEPS[step] ?? STEPS[0];
  const { rect, scrollTo } = useWizardSpotlight(active ? currentStep.dataTour : null);

  useEffect(() => {
    if (active) scrollTo();
  }, [active, step, scrollTo]);

  const dismiss = useCallback(() => {
    setActive(false);
    markThemeSeen(themeRef.current);
  }, []);

  const goNext = useCallback(() => {
    if (step < STEP_COUNT - 1) setStep((s) => s + 1);
    else dismiss();
  }, [step, dismiss]);

  const goBack = useCallback(() => {
    if (step > 0) setStep((s) => s - 1);
  }, [step]);

  const trapRef = useFocusTrap(active, dismiss);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") goNext();
    else if (e.key === "ArrowLeft") goBack();
  }, [goNext, goBack]);

  if (!active || !rect) return null;

  const lt = layoutTheme;
  const font = themeFont(lt);
  const bg = themeBg(lt);
  const text = themeText(lt);
  const accent = themeAccent(lt);
  const { placement, top: tooltipTop, left: tooltipLeft } = calcPlacement(rect, isMobile);
  const isLast = step === STEP_COUNT - 1;
  const isFirst = step === 0;
  const motionClass = prefersReducedMotion.current ? "" : "animate-[wizardIn_0.35s_cubic-bezier(0.16,1,0.3,1)_forwards]";

  const arrowEl = !isMobile && (
    <div
      className={`absolute w-3 h-3 rounded-[2px] rotate-45 ${bg.split(" ").filter(c => c.startsWith("bg-"))[0]} ${
        placement === "bottom" ? "-top-1.5 left-7 border-t border-l" :
        placement === "top" ? "-bottom-1.5 left-7 border-b border-r" :
        placement === "right" ? "-left-1.5 top-6 border-b border-l" :
        "-right-1.5 top-6 border-t border-r"
      } ${bg.split(" ").filter(c => c.startsWith("border-"))[0]}`}
    />
  );

  const progressDots = (
    <div className="flex gap-1 items-center">
      {STEPS.map((_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            i === step ? `w-4 ${accent.dotActive}` :
            i < step ? `w-1.5 ${accent.dotDone}` :
            `w-1.5 ${accent.dotIdle}`
          }`}
        />
      ))}
    </div>
  );

  const tooltipContent = (
    <>
      {/* Step banner */}
      <div className={`px-4 py-2.5 flex items-center gap-2 border-b ${accent.banner}`}>
        <div className={`w-5 h-5 rounded-md ${accent.stepBg} flex items-center justify-center text-[10px] font-bold text-white`}>
          {step + 1}
        </div>
        <span className={`text-[11px] font-semibold uppercase tracking-wider ${accent.stepBg.replace("bg-", "text-")}`}>
          {t(currentStep.labelKey as "wizardStep1Label")}
        </span>
        <div className="ml-auto">{progressDots}</div>
      </div>

      {/* Body */}
      <div className="px-4 py-3">
        <div className="flex items-start gap-2.5 mb-2">
          <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center ${accent.banner}`}>
            {currentStep.icon}
          </div>
          <div className="min-w-0">
            <h2 className={`text-[15px] font-bold leading-snug ${text.title}`}>
              {t(currentStep.titleKey as "wizardStep1Title")}
            </h2>
          </div>
        </div>
        <p className={`text-[13px] leading-relaxed ${text.body}`}>
          {t(currentStep.bodyKey as "wizardStep1Body")}
        </p>
        <div className={`mt-2.5 px-2.5 py-2 rounded-lg border text-[12px] leading-relaxed ${text.hint} ${accent.hintBg}`}>
          {t(currentStep.hintKey as "wizardStep1Hint")}
        </div>
      </div>

      {/* Footer */}
      <div className={`px-4 py-2.5 flex items-center justify-between border-t ${bg.split(" ").filter(c => c.startsWith("border-"))[0]}/30`}>
        <button onClick={dismiss} className={`text-[12px] font-medium ${accent.skipColor} transition-colors`}>
          {t("wizardSkip")}
        </button>
        <div className="flex gap-1.5">
          {!isFirst && (
            <button onClick={goBack} className={`text-[12px] font-semibold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${accent.backBtn}`}>
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              {t("wizardBack")}
            </button>
          )}
          <button onClick={goNext} className={`text-[12px] font-semibold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${accent.nextBtn}`}>
            {isLast ? t("wizardFinish") : t("wizardNext")}
            {isLast ? (
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Spotlight overlay */}
      {!isMobile && (
        <div className="fixed inset-0 z-[9998] pointer-events-none" aria-hidden="true">
          <div
            className={`absolute rounded-xl ${accent.spotlightBorder} border-2 transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)]`}
            style={{
              top: rect.top - window.scrollY - PADDING,
              left: rect.left - PADDING,
              width: rect.width + PADDING * 2,
              height: rect.height + PADDING * 2,
              boxShadow: "0 0 0 9999px rgba(0,0,0,0.6)",
            }}
          >
            <div className="absolute inset-[-3px] rounded-[14px] border-2 border-emerald-500/15 animate-pulse" />
          </div>
        </div>
      )}

      {/* Mobile highlight border */}
      {isMobile && (
        <div
          className={`fixed z-[9998] rounded-xl ${accent.spotlightBorder} border-2 pointer-events-none animate-pulse`}
          style={{
            top: rect.top - window.scrollY - 2,
            left: rect.left - 2,
            width: rect.width + 4,
            height: rect.height + 4,
          }}
          aria-hidden="true"
        />
      )}

      {/* Tooltip / bottom sheet */}
      <div
        ref={trapRef}
        role="dialog"
        aria-label={`Theme tour step ${step + 1} of ${STEP_COUNT}`}
        aria-modal="false"
        onKeyDown={handleKeyDown}
        className={`${font} ${isMobile ? "fixed bottom-0 left-0 right-0 z-[9999]" : "fixed z-[9999]"}`}
        style={isMobile ? undefined : {
          top: tooltipTop - window.scrollY,
          left: tooltipLeft,
          width: 340,
        }}
      >
        {isMobile ? (
          <div className={`${bg} border-t rounded-t-2xl shadow-2xl ${motionClass} opacity-0 translate-y-3`}>
            <div className="flex justify-center pt-2.5 pb-1">
              <div className={`w-8 h-1 rounded-full ${text.muted.replace("text-", "bg-")}`} />
            </div>
            {tooltipContent}
          </div>
        ) : (
          <div className={`${bg} border rounded-2xl overflow-hidden shadow-2xl ${motionClass} opacity-0 translate-y-2`}>
            {arrowEl}
            {tooltipContent}
          </div>
        )}
      </div>

      {/* Live region for screen readers */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {`Step ${step + 1} of ${STEP_COUNT}: ${t(currentStep.titleKey as "wizardStep1Title")}`}
      </div>
    </>
  );
}
