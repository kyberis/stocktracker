"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import WarrenAvatar from "@/components/warren/WarrenAvatar";
import { trackExperimentEvent } from "@/lib/use-experiment";

const ICON_IMPORT = (
  <path
    strokeLinecap="round"
    strokeLinejoin="round"
    d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
  />
);
const ICON_ADD = (
  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
);

type Accent = "emerald" | "violet";

const ACCENT: Record<Accent, { hover: string; iconBg: string; iconFg: string }> = {
  emerald: {
    hover: "hover:border-emerald-400 dark:hover:border-emerald-500/40",
    iconBg: "bg-emerald-100 dark:bg-emerald-500/15",
    iconFg: "text-emerald-600 dark:text-emerald-400",
  },
  violet: {
    hover: "hover:border-violet-400 dark:hover:border-violet-500/40",
    iconBg: "bg-violet-100 dark:bg-violet-500/15",
    iconFg: "text-violet-600 dark:text-violet-400",
  },
};

function ActionIcon({ accent, children }: { accent: Accent; children: ReactNode }) {
  const a = ACCENT[accent];
  return (
    <div
      className={`mb-3 flex h-12 w-12 items-center justify-center rounded-2xl ${a.iconBg} transition-transform group-hover:scale-110`}
    >
      <svg
        className={`h-6 w-6 ${a.iconFg}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        {children}
      </svg>
    </div>
  );
}

function LinkCard({
  href,
  onClick,
  accent,
  title,
  description,
  testId,
  icon,
}: {
  href: string;
  onClick: () => void;
  accent: Accent;
  title: string;
  description: string;
  testId: string;
  icon: ReactNode;
}) {
  const a = ACCENT[accent];
  return (
    <Link
      href={href}
      onClick={onClick}
      data-testid={testId}
      className={`group card relative flex flex-col items-center p-5 text-center transition-all hover:shadow-md ${a.hover}`}
    >
      <ActionIcon accent={accent}>{icon}</ActionIcon>
      <div>
        <p className="mb-1 text-sm font-semibold text-gray-900 dark:text-white">{title}</p>
        <p className="text-xs text-gray-500 dark:text-slate-400">{description}</p>
      </div>
    </Link>
  );
}

function ButtonCard({
  onClick,
  accent,
  title,
  description,
  testId,
  icon,
}: {
  onClick: () => void;
  accent: Accent;
  title: string;
  description: string;
  testId: string;
  icon: ReactNode;
}) {
  const a = ACCENT[accent];
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      className={`group card flex flex-col items-center p-5 text-center transition-all hover:shadow-md ${a.hover}`}
    >
      <ActionIcon accent={accent}>{icon}</ActionIcon>
      <p className="mb-1 text-sm font-semibold text-gray-900 dark:text-white">{title}</p>
      <p className="text-xs text-gray-500 dark:text-slate-400">{description}</p>
    </button>
  );
}

/** Classic empty portfolio CTA — shared by Dashboard and Home v2 (control layout). */
export default function EmptyPortfolio({
  onAddStock,
  onAskWarren,
  onEngagementAction,
  demoMode = false,
}: {
  onAddStock: () => void;
  onAskWarren?: (prompt: string) => void;
  /** Fires agent_intro post-splash success metric (once per session). */
  onEngagementAction?: (action: string) => void;
  demoMode?: boolean;
}) {
  const { t } = useI18n();
  const [chatInput, setChatInput] = useState("");

  const trackCta = (cta: string) => {
    if (demoMode) return;
    onEngagementAction?.(cta);
    void trackExperimentEvent("empty_activation_cta", { cta });
  };

  const submitChat = () => {
    const trimmed = chatInput.trim();
    if (!trimmed || !onAskWarren) return;
    trackCta("warren");
    onAskWarren(trimmed);
    setChatInput("");
  };

  const warrenBlock = onAskWarren ? (
    <div
      className="card border-amber-500/16 bg-amber-500/[0.06] p-3 sm:p-4"
      data-testid="empty-warren-chat"
    >
      <div className="mb-1 flex items-center gap-2">
        <WarrenAvatar size={28} />
        <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
          {t("emptyStateWarrenChatTitle") || "Or just tell Warren"}
        </p>
      </div>
      <p className="mb-2 text-[11px] leading-snug text-amber-800/80 dark:text-amber-200/70">
        {t("emptyStateWarrenChatHint") ||
          "Tell Warren a ticker to add, or ask to import your portfolio. Up to 10 messages, then a 15-minute break."}
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submitChat();
        }}
        className="flex items-center gap-2"
      >
        <input
          type="text"
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          placeholder={
            t("emptyStateWarrenChatPlaceholder") ||
            'Try: "I bought 10 AAPL at $150 on 2024-01-15"'
          }
          className="min-h-[44px] flex-1 rounded-lg border border-amber-500/20 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400/40 dark:bg-slate-800/60 dark:text-white dark:placeholder:text-slate-500"
        />
        <button
          type="submit"
          disabled={!chatInput.trim()}
          aria-label={t("warrenSend")}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-white transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.874L5.999 12zm0 0h7.5"
            />
          </svg>
        </button>
      </form>
    </div>
  ) : null;

  return (
    <div className="space-y-6" data-testid="empty-activation" data-variant="control">
      <div className="py-6 text-center">
        <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/20">
          <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941"
            />
          </svg>
        </div>
        <h2 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">{t("emptyStateTitle")}</h2>
        <p className="mx-auto max-w-md text-sm text-gray-500 dark:text-slate-400">{t("emptyStateSubtitle")}</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <LinkCard
          href="/import"
          accent="emerald"
          title={t("emptyStateImport")}
          description={t("emptyStateImportDesc")}
          testId="empty-cta-import"
          icon={ICON_IMPORT}
          onClick={() => trackCta("import")}
        />
        <ButtonCard
          accent="violet"
          title={t("addStock")}
          description={t("emptyStateAddDesc")}
          testId="empty-cta-add"
          icon={ICON_ADD}
          onClick={() => {
            trackCta("add");
            onAddStock();
          }}
        />
      </div>
      {warrenBlock}
    </div>
  );
}
