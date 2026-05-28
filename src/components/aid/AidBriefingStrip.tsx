"use client";

import { useI18n } from "@/lib/i18n";
import { useTrack } from "@/lib/use-track";
import type { AidStatusPayload } from "@/lib/types";

function sessionLabel(session: AidStatusPayload["marketSession"], t: (k: string) => string): string {
  if (session === "pre") return t("aidSessionPre");
  if (session === "open") return t("aidSessionOpen");
  if (session === "after") return t("aidSessionAfter");
  return t("aidSessionClosed");
}

interface Props {
  status: AidStatusPayload | null;
  loading: boolean;
  onCatchUp: () => void;
}

export default function AidBriefingStrip({ status, loading, onCatchUp }: Props) {
  const { t } = useI18n();
  const track = useTrack();

  if (loading && !status) {
    return (
      <section className="card rounded-[var(--radius-card)] p-4" aria-label={t("aidBriefingTitle")}>
        <p className="text-sm text-[color:var(--muted)]" role="status">
          {t("loading")}
        </p>
      </section>
    );
  }

  if (!status) return null;

  const { newCount, caughtUp, breakdown, briefing, marketSession } = status;

  return (
    <section className="card rounded-[var(--radius-card)] p-4" aria-label={t("aidBriefingTitle")}>
      <div className="mb-2 flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-[11px] text-[color:var(--muted)]">
          <span
            className={`h-1.5 w-1.5 rounded-full ${marketSession === "open" ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]" : "bg-[color:var(--muted)]"}`}
            aria-hidden
          />
          {sessionLabel(marketSession, t)}
        </span>
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {!caughtUp && (
            <span className="text-3xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{newCount}</span>
          )}
          <div>
            <h2 className="text-sm font-semibold text-[color:var(--foreground)]">
              {caughtUp ? t("aidBriefingCaughtUp") : t("aidBriefingSinceVisit")}
            </h2>
            {!caughtUp && (
              <p className="text-xs text-[color:var(--muted)]">
                {t("aidBriefingBreakdown")
                  .replace("{fin}", String(breakdown.finPulse))
                  .replace("{digest}", String(breakdown.digest))
                  .replace("{alerts}", String(breakdown.alerts))}
              </p>
            )}
          </div>
        </div>
        {!caughtUp && (
          <button
            type="button"
            onClick={() => {
              track("aid_briefing_shown", { count: String(newCount) });
              onCatchUp();
            }}
            className="min-h-9 rounded-[var(--radius-button)] bg-emerald-600 px-4 text-xs font-semibold text-white hover:bg-emerald-500"
          >
            {t("aidBriefingCatchUp").replace("{n}", String(newCount))}
          </button>
        )}
        {caughtUp && (
          <button
            type="button"
            onClick={() => track("aid_caught_up_dismissed")}
            className="min-h-9 rounded-full border border-[color:var(--border)] px-3 text-[11px] font-semibold text-[color:var(--muted)]"
          >
            {t("aidBriefingCaughtUp")}
          </button>
        )}
      </div>

      {briefing && (
        <p className="rounded-xl border border-[color:var(--border)] border-l-[3px] border-l-emerald-500 bg-[color:var(--surface-soft)] px-3 py-2 text-sm text-[color:var(--foreground)]">
          <span className="font-semibold">{t("aidBriefingAiLabel")} </span>
          {briefing}
        </p>
      )}
    </section>
  );
}
