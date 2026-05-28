"use client";

import { useI18n } from "@/lib/i18n";
import { useTrack } from "@/lib/use-track";
import type { AidStatusPayload } from "@/lib/types";

interface Props {
  nudge: NonNullable<AidStatusPayload["warrenNudge"]>;
  onAsk: (prompt: string) => void;
}

export default function AidWarrenNudge({ nudge, onAsk }: Props) {
  const { t } = useI18n();
  const track = useTrack();

  const message =
    nudge.kind === "mover"
      ? t("aidWarrenNudgeMover")
          .replace("{ticker}", nudge.ticker)
          .replace("{pct}", `${(nudge.movePct ?? 0) >= 0 ? "+" : ""}${(nudge.movePct ?? 0).toFixed(1)}`)
      : nudge.kind === "earnings"
        ? t("aidWarrenNudgeEarnings").replace("{ticker}", nudge.ticker)
        : t("aidWarrenNudgeConcentration").replace("{pct}", String(Math.round(nudge.concentrationPct ?? 0)));

  const chip =
    nudge.kind === "mover"
      ? t("aidWarrenNudgeAskTicker").replace("{ticker}", nudge.ticker)
      : nudge.kind === "earnings"
        ? t("aidWarrenNudgeAskEarnings").replace("{ticker}", nudge.ticker)
        : t("aidWarrenNudgeAskConcentration");

  return (
    <section
      className="card rounded-[var(--radius-card)] border border-emerald-500/25 bg-gradient-to-br from-emerald-500/[0.06] to-transparent p-4"
      aria-label={t("aidWarrenNudgeTitle")}
    >
      <h3 className="mb-2 text-sm font-semibold text-[color:var(--foreground)]">{t("aidWarrenNudgeTitle")}</h3>
      <p className="mb-3 text-sm text-[color:var(--muted)]">{message}</p>
      <button
        type="button"
        onClick={() => {
          track("aid_warren_nudge_clicked", { kind: nudge.kind, ticker: nudge.ticker });
          onAsk(nudge.prompt);
        }}
        className="min-h-9 rounded-full border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-3 text-xs font-semibold text-[color:var(--foreground)] hover:border-emerald-500/30"
      >
        {chip}
      </button>
    </section>
  );
}
