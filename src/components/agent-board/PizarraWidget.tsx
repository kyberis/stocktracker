"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import WarrenAvatar from "@/components/warren/WarrenAvatar";
import { useI18n } from "@/lib/i18n";
import { useTrack } from "@/lib/use-track";
import type { AgentBoardMessageView } from "@/hooks/useAgentBoard";

interface Props {
  messages: AgentBoardMessageView[];
  boardEnabled: boolean;
  loading?: boolean;
  demoMode?: boolean;
  onToggleEnabled: (enabled: boolean) => void | Promise<void>;
  onAskWarren: (prompt: string) => void;
  onOpenClara: () => void;
  onDismiss: (id: string) => void;
  onRead: (id: string) => void;
}

function AgentAvatar({ agent }: { agent: "warren" | "clara" }) {
  if (agent === "clara") {
    return (
      <Image
        src="/agents/clara-avatar.png"
        alt=""
        width={32}
        height={32}
        className="h-8 w-8 shrink-0 rounded-full object-cover"
      />
    );
  }
  return <WarrenAvatar size={32} className="shrink-0" />;
}

export default function PizarraWidget({
  messages,
  boardEnabled,
  loading = false,
  demoMode = false,
  onToggleEnabled,
  onAskWarren,
  onOpenClara,
  onDismiss,
  onRead,
}: Props) {
  const { t } = useI18n();
  const track = useTrack();
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    if (boardEnabled && messages.length > 0) {
      track("pizarra_viewed", { count: String(messages.length) });
    }
  }, [boardEnabled, messages.length, track]);

  const handleToggle = async () => {
    if (demoMode) return;
    setToggling(true);
    try {
      await onToggleEnabled(!boardEnabled);
      track("pizarra_toggled", { enabled: boardEnabled ? "off" : "on" });
    } finally {
      setToggling(false);
    }
  };

  const handleChip = (msg: AgentBoardMessageView) => {
    track("pizarra_message_clicked", { agent: msg.agent, kind: msg.kind });
    void onRead(msg.id);
    if (msg.agent === "clara") {
      onOpenClara();
      return;
    }
    onAskWarren(msg.chipPrompt || msg.body);
  };

  return (
    <section
      className="card rounded-[var(--radius-card)] border border-[color:var(--border)] p-4"
      aria-label={t("pizarraTitle")}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-[color:var(--foreground)]">{t("pizarraTitle")}</h3>
          <p className="text-xs text-[color:var(--muted)]">{t("pizarraSubtitle")}</p>
        </div>
        {!demoMode && (
          <button
            type="button"
            role="switch"
            aria-checked={boardEnabled}
            aria-label={t("pizarraToggle")}
            disabled={toggling || loading}
            onClick={() => void handleToggle()}
            className={`min-h-9 shrink-0 rounded-full px-3 text-xs font-semibold transition-colors ${
              boardEnabled
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                : "border border-[color:var(--border)] text-[color:var(--muted)]"
            }`}
          >
            {boardEnabled ? t("pizarraOn") : t("pizarraOff")}
          </button>
        )}
      </div>

      {!boardEnabled && !demoMode ? (
        <p className="text-sm text-[color:var(--muted)]">{t("pizarraDisabledHint")}</p>
      ) : loading && messages.length === 0 ? (
        <p className="text-sm text-[color:var(--muted)]">{t("pizarraLoading")}</p>
      ) : messages.length === 0 ? (
        <p className="text-sm text-[color:var(--muted)]">{t("pizarraEmpty")}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {messages.map((msg) => (
            <li
              key={msg.id}
              className={`rounded-xl border p-3 ${
                msg.agent === "clara"
                  ? "border-sky-500/25 bg-sky-500/[0.04]"
                  : "border-emerald-500/25 bg-emerald-500/[0.04]"
              } ${msg.readAt ? "opacity-80" : ""}`}
            >
              <div className="mb-2 flex items-center gap-2">
                <AgentAvatar agent={msg.agent} />
                <span className="text-xs font-semibold text-[color:var(--foreground)]">
                  {msg.agent === "clara" ? t("claraName") : t("warrenName")}
                </span>
              </div>
              <p className="mb-2 text-sm text-[color:var(--foreground)]">{msg.body}</p>
              <div className="flex flex-wrap items-center gap-2">
                {msg.chipLabel && (
                  <button
                    type="button"
                    onClick={() => handleChip(msg)}
                    className="min-h-9 rounded-full border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-3 text-xs font-semibold text-[color:var(--foreground)] hover:border-emerald-500/30"
                  >
                    {msg.chipLabel}
                  </button>
                )}
                {!demoMode && (
                  <button
                    type="button"
                    onClick={() => {
                      track("pizarra_dismissed", { id: msg.id });
                      void onDismiss(msg.id);
                    }}
                    className="min-h-9 rounded-full px-2 text-xs text-[color:var(--muted)] hover:text-[color:var(--foreground)]"
                  >
                    {t("pizarraDismiss")}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 text-[10px] leading-snug text-[color:var(--muted)]">{t("pizarraDisclaimer")}</p>
    </section>
  );
}
