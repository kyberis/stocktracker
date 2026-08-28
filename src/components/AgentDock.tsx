"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { useTrack } from "@/lib/use-track";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { formatAgentDockAlertBadge } from "@/lib/agent-dock-badge";
import { useAgentChrome } from "@/contexts/agent-chrome-context";

const chipBase =
  "inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-full border px-3 text-[12px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60";

export default function AgentDock() {
  const { t } = useI18n();
  const track = useTrack();
  const chrome = useAgentChrome();
  const {
    demoMode,
    mobileSheetOpen,
    setMobileSheetOpen,
    alertCount,
    showSupportChip,
    showFeedbackChip,
    cloverEnabled,
    showWarrenChip,
    showClaraChip,
    openWarren,
    openClover,
    openClara,
    openFeedback,
    openSupportChat,
    toggleAlerts,
  } = chrome;

  const badge = formatAgentDockAlertBadge(alertCount);
  const sheetTrapRef = useFocusTrap(mobileSheetOpen, () => setMobileSheetOpen(false));

  function handleClover() {
    track("agent_dock_clover");
    if (demoMode) return;
    openClover();
  }

  function handleWarren() {
    track("agent_dock_warren");
    if (demoMode) return;
    openWarren();
  }

  function handleClara() {
    track("agent_dock_clara");
    if (demoMode) return;
    openClara();
  }

  function handleFeedback() {
    track("agent_dock_feedback");
    openFeedback();
  }

  function handleSupport() {
    track("agent_dock_support");
    openSupportChat();
  }

  function handleAlerts() {
    track("agent_dock_alerts");
    toggleAlerts();
  }

  function toggleSheet() {
    const next = !mobileSheetOpen;
    setMobileSheetOpen(next);
    if (next) track("agent_dock_open");
  }

  const cloverBtn = demoMode ? (
    <Link href="/signup" className={`${chipBase} border-emerald-500/40 bg-emerald-500/15 text-emerald-200`} data-testid="agent-dock-clover">
      <span className="grid h-[18px] w-[18px] place-items-center rounded-full bg-emerald-500/50 text-[10px] font-extrabold text-white" aria-hidden>
        ◆
      </span>
      {t("cloverName")}
    </Link>
  ) : (
    <button
      type="button"
      onClick={handleClover}
      className={`${chipBase} border-emerald-500/40 bg-emerald-500/15 text-emerald-800 dark:text-emerald-200`}
      data-testid="agent-dock-clover"
    >
      <span className="grid h-[18px] w-[18px] place-items-center rounded-full bg-emerald-500/50 text-[10px] font-extrabold text-white" aria-hidden>
        ◆
      </span>
      {t("cloverName")}
    </button>
  );

  const warrenBtn = demoMode ? (
    <Link href="/signup" className={`${chipBase} border-amber-500/35 bg-amber-500/15 text-amber-200`} data-testid="agent-dock-warren">
      <span className="grid h-[18px] w-[18px] place-items-center rounded-full bg-amber-500/40 text-[10px] font-extrabold text-white" aria-hidden>
        W
      </span>
      {t("warrenName")}
    </Link>
  ) : (
    <button
      type="button"
      onClick={handleWarren}
      className={`${chipBase} border-amber-500/35 bg-amber-500/15 text-amber-700 dark:text-amber-200`}
      data-testid="agent-dock-warren"
    >
      <span className="grid h-[18px] w-[18px] place-items-center rounded-full bg-amber-500/40 text-[10px] font-extrabold text-white" aria-hidden>
        W
      </span>
      {t("warrenName")}
    </button>
  );

  const claraBtn = demoMode ? (
    <Link href="/signup" className={`${chipBase} border-sky-500/35 bg-sky-500/15 text-sky-200`} data-testid="agent-dock-clara">
      <span className="grid h-[18px] w-[18px] place-items-center rounded-full bg-sky-500/40 text-[10px] font-extrabold text-white" aria-hidden>
        C
      </span>
      {t("claraName")}
    </Link>
  ) : (
    <button
      type="button"
      onClick={handleClara}
      className={`${chipBase} border-sky-500/35 bg-sky-500/15 text-sky-700 dark:text-sky-200`}
      data-testid="agent-dock-clara"
    >
      <span className="grid h-[18px] w-[18px] place-items-center rounded-full bg-sky-500/40 text-[10px] font-extrabold text-white" aria-hidden>
        C
      </span>
      {t("claraName")}
    </button>
  );

  const primaryAgents = cloverEnabled ? (
    <>
      {cloverBtn}
      {showWarrenChip ? warrenBtn : null}
    </>
  ) : (
    <>
      {warrenBtn}
      {showClaraChip ? claraBtn : null}
    </>
  );

  const alertsBtn = badge ? (
    <button
      type="button"
      onClick={handleAlerts}
      className={`${chipBase} border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300`}
      data-testid="agent-dock-alerts"
      aria-label={`${t("marketAlertTitle")} ${badge}`}
    >
      <BoltIcon />
      {badge}
    </button>
  ) : null;

  const supportBtn = showSupportChip ? (
    <button
      type="button"
      onClick={handleSupport}
      className={`${chipBase} border-blue-400/30 bg-blue-500/15 text-blue-800 dark:text-blue-200`}
      data-testid="agent-dock-support"
      aria-label={t("supportChatTitle")}
    >
      <SparkIcon />
      <span className="hidden lg:inline">{t("supportChatTitle")}</span>
    </button>
  ) : null;

  const feedbackBtn = showFeedbackChip ? (
    <button
      type="button"
      onClick={handleFeedback}
      className={`${chipBase} border-emerald-400/30 bg-emerald-500/15 text-emerald-800 dark:text-emerald-200`}
      data-testid="agent-dock-feedback"
      aria-label={t("feedback")}
    >
      <ChatIcon />
      <span className="hidden lg:inline">{t("feedback")}</span>
    </button>
  ) : null;

  return (
    <>
      <div
        data-agent-dock
        data-testid="agent-dock"
        className="glass-overlay pointer-events-auto fixed bottom-6 right-6 z-50 hidden items-center gap-1.5 rounded-full border border-[color:var(--border)] p-1.5 shadow-lg sm:flex"
        role="toolbar"
        aria-label={t("agentDockSheetLabel")}
      >
        {primaryAgents}
        {(alertsBtn || supportBtn || feedbackBtn) && (
          <span className="mx-0.5 h-6 w-px bg-[color:var(--border)]" aria-hidden />
        )}
        {alertsBtn}
        {supportBtn}
        {feedbackBtn}
      </div>

      <button
        type="button"
        data-agent-dock
        data-testid="agent-dock-fab"
        className={`fixed right-4 bottom-20 z-50 flex h-14 w-14 items-center justify-center rounded-full border border-emerald-500/40 shadow-lg sm:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 ${
          mobileSheetOpen
            ? "border-[color:var(--border)] bg-[color:var(--surface-overlay)]"
            : "bg-[color:var(--surface-overlay)]"
        }`}
        aria-expanded={mobileSheetOpen}
        aria-controls="agent-dock-sheet"
        aria-label={mobileSheetOpen ? t("agentDockCloseMenu") : t("agentDockOpenMenu")}
        onClick={toggleSheet}
      >
        {mobileSheetOpen ? (
          <span className="text-xl leading-none text-[color:var(--muted)]" aria-hidden>
            ×
          </span>
        ) : cloverEnabled ? (
          <span className="flex items-center" aria-hidden>
            <span className="grid h-7 w-7 place-items-center rounded-full bg-emerald-500/60 text-[11px] font-extrabold text-white">
              ◆
            </span>
            {showWarrenChip && (
              <span className="-ml-2 grid h-6 w-6 place-items-center rounded-full border-2 border-[color:var(--page-background)] bg-amber-500/55 text-[10px] font-extrabold text-white">
                W
              </span>
            )}
          </span>
        ) : (
          <span className="flex items-center" aria-hidden>
            <span className="grid h-6 w-6 place-items-center rounded-full border-2 border-[color:var(--page-background)] bg-amber-500/55 text-[10px] font-extrabold text-white">
              W
            </span>
            <span className="-ml-2 grid h-6 w-6 place-items-center rounded-full border-2 border-[color:var(--page-background)] bg-sky-500/55 text-[10px] font-extrabold text-white">
              C
            </span>
          </span>
        )}
        {!mobileSheetOpen && badge && (
          <span className="absolute -right-0.5 -top-0.5 grid min-h-[18px] min-w-[18px] place-items-center rounded-full border-2 border-[color:var(--page-background)] bg-amber-500 px-1 text-[10px] font-extrabold text-slate-900">
            {badge}
          </span>
        )}
      </button>

      {mobileSheetOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[45] bg-black/45 sm:hidden"
            aria-label={t("agentDockCloseMenu")}
            onClick={() => setMobileSheetOpen(false)}
          />
          <div
            id="agent-dock-sheet"
            ref={sheetTrapRef}
            role="dialog"
            aria-modal="true"
            aria-label={t("agentDockSheetLabel")}
            data-testid="agent-dock-sheet"
            className="glass-overlay fixed inset-x-2.5 bottom-20 z-[48] rounded-[20px] border border-[color:var(--border)] p-3 shadow-2xl sm:hidden"
          >
            <div className="mb-2 grid grid-cols-2 gap-2">
              {cloverEnabled ? (
                <>
                  {demoMode ? (
                    <Link href="/signup" className={`${chipBase} h-[52px] justify-start border-emerald-500/40 bg-emerald-500/12 text-emerald-200`}>
                      <span className="grid h-7 w-7 place-items-center rounded-full bg-emerald-500/50 text-xs font-extrabold text-white">◆</span>
                      {t("cloverName")}
                    </Link>
                  ) : (
                    <button type="button" onClick={handleClover} className={`${chipBase} h-[52px] justify-start border-emerald-500/40 bg-emerald-500/12 text-emerald-800 dark:text-emerald-200`}>
                      <span className="grid h-7 w-7 place-items-center rounded-full bg-emerald-500/50 text-xs font-extrabold text-white">◆</span>
                      {t("cloverName")}
                    </button>
                  )}
                  {showWarrenChip &&
                    (demoMode ? (
                      <Link href="/signup" className={`${chipBase} h-[52px] justify-start border-amber-500/35 bg-amber-500/12 text-amber-200`}>
                        <span className="grid h-7 w-7 place-items-center rounded-full bg-amber-500/45 text-xs font-extrabold text-white">W</span>
                        {t("warrenName")}
                      </Link>
                    ) : (
                      <button type="button" onClick={handleWarren} className={`${chipBase} h-[52px] justify-start border-amber-500/35 bg-amber-500/12 text-amber-700 dark:text-amber-200`}>
                        <span className="grid h-7 w-7 place-items-center rounded-full bg-amber-500/45 text-xs font-extrabold text-white">W</span>
                        {t("warrenName")}
                      </button>
                    ))}
                </>
              ) : (
                <>
                  {demoMode ? (
                    <Link href="/signup" className={`${chipBase} h-[52px] justify-start border-amber-500/35 bg-amber-500/12 text-amber-200`}>
                      <span className="grid h-7 w-7 place-items-center rounded-full bg-amber-500/45 text-xs font-extrabold text-white">W</span>
                      {t("warrenName")}
                    </Link>
                  ) : (
                    <button type="button" onClick={handleWarren} className={`${chipBase} h-[52px] justify-start border-amber-500/35 bg-amber-500/12 text-amber-700 dark:text-amber-200`}>
                      <span className="grid h-7 w-7 place-items-center rounded-full bg-amber-500/45 text-xs font-extrabold text-white">W</span>
                      {t("warrenName")}
                    </button>
                  )}
                  {demoMode ? (
                    <Link href="/signup" className={`${chipBase} h-[52px] justify-start border-sky-500/35 bg-sky-500/12 text-sky-200`}>
                      <span className="grid h-7 w-7 place-items-center rounded-full bg-sky-500/45 text-xs font-extrabold text-white">C</span>
                      {t("claraName")}
                    </Link>
                  ) : (
                    <button type="button" onClick={handleClara} className={`${chipBase} h-[52px] justify-start border-sky-500/35 bg-sky-500/12 text-sky-700 dark:text-sky-200`}>
                      <span className="grid h-7 w-7 place-items-center rounded-full bg-sky-500/45 text-xs font-extrabold text-white">C</span>
                      {t("claraName")}
                    </button>
                  )}
                </>
              )}
            </div>
            <div className="flex gap-2">
              {badge && (
                <button type="button" onClick={handleAlerts} className={`${chipBase} min-h-11 flex-1 border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300`}>
                  <BoltIcon />
                  {t("marketAlertTitle")} · {badge}
                </button>
              )}
              {showSupportChip && (
                <button type="button" onClick={handleSupport} className={`${chipBase} min-h-11 flex-1 border-blue-400/30 bg-blue-500/15 text-blue-800 dark:text-blue-200`}>
                  <SparkIcon />
                  {t("supportChatTitle")}
                </button>
              )}
              {showFeedbackChip && (
                <button type="button" onClick={handleFeedback} className={`${chipBase} min-h-11 flex-1 border-emerald-400/30 bg-emerald-500/15 text-emerald-800 dark:text-emerald-200`}>
                  <ChatIcon />
                  {t("feedback")}
                </button>
              )}
            </div>
            <p className="mt-2 text-center text-[11px] text-[color:var(--muted)]">{t("agentDockCloseHint")}</p>
          </div>
        </>
      )}
    </>
  );
}

function ChatIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
    </svg>
  );
}

function BoltIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
    </svg>
  );
}
