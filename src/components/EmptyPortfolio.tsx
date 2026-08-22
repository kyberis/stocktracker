"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import WarrenAvatar from "@/components/warren/WarrenAvatar";
import { trackExperimentEvent, useExperiment } from "@/lib/use-experiment";
import { getToolPath } from "@/lib/tools-registry";

const EMPTY_ACTIVATION_KEY = "empty_activation";
const MOAT_HREF = getToolPath("evaluation");
const SCREENER_HREF = getToolPath("screener");

type EmptyVariant = "control" | "portfolio_first" | "job_chooser";

function asVariant(raw: string): EmptyVariant {
  if (raw === "portfolio_first" || raw === "job_chooser") return raw;
  return "control";
}

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
const ICON_MOAT = (
  <path
    strokeLinecap="round"
    strokeLinejoin="round"
    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
  />
);
const ICON_SCREENER = (
  <path
    strokeLinecap="round"
    strokeLinejoin="round"
    d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
  />
);

type Accent = "emerald" | "violet" | "sky" | "indigo";

const ACCENT: Record<
  Accent,
  { hover: string; iconBg: string; iconFg: string; ring: string }
> = {
  emerald: {
    hover: "hover:border-emerald-400 dark:hover:border-emerald-500/40",
    iconBg: "bg-emerald-100 dark:bg-emerald-500/15",
    iconFg: "text-emerald-600 dark:text-emerald-400",
    ring: "ring-emerald-500/25",
  },
  violet: {
    hover: "hover:border-violet-400 dark:hover:border-violet-500/40",
    iconBg: "bg-violet-100 dark:bg-violet-500/15",
    iconFg: "text-violet-600 dark:text-violet-400",
    ring: "ring-violet-500/25",
  },
  sky: {
    hover: "hover:border-sky-400 dark:hover:border-sky-500/40",
    iconBg: "bg-sky-100 dark:bg-sky-500/15",
    iconFg: "text-sky-600 dark:text-sky-400",
    ring: "ring-sky-500/25",
  },
  indigo: {
    hover: "hover:border-indigo-400 dark:hover:border-indigo-500/40",
    iconBg: "bg-indigo-100 dark:bg-indigo-500/15",
    iconFg: "text-indigo-600 dark:text-indigo-400",
    ring: "ring-indigo-500/25",
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
  badge,
}: {
  href: string;
  onClick: () => void;
  accent: Accent;
  title: string;
  description: string;
  testId: string;
  icon: ReactNode;
  badge?: string;
}) {
  const a = ACCENT[accent];
  return (
    <Link
      href={href}
      onClick={onClick}
      data-testid={testId}
      className={`group card relative flex flex-col items-center p-5 text-center transition-all hover:shadow-md ${a.hover} ${
        badge ? `ring-1 ${a.ring}` : ""
      }`}
    >
      {badge && (
        <span
          className={`absolute right-3 top-3 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${a.iconBg} ${a.iconFg}`}
        >
          {badge}
        </span>
      )}
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

function ExploreMiniCard({
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
      className={`group card flex items-start gap-3 p-4 text-left transition-all hover:shadow-md ${a.hover}`}
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${a.iconBg} transition-transform group-hover:scale-105`}
      >
        <svg
          className={`h-5 w-5 ${a.iconFg}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          {icon}
        </svg>
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-white">{title}</p>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-slate-400">{description}</p>
      </div>
    </Link>
  );
}

/** Classic empty portfolio CTA — shared by Dashboard and Home v2. */
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
  const experiment = useExperiment(EMPTY_ACTIVATION_KEY, {
    enabled: !demoMode,
    forceVariant: demoMode ? "control" : undefined,
  });
  const variant = asVariant(experiment.variant);

  const trackCta = (cta: string) => {
    if (demoMode) return;
    onEngagementAction?.(cta);
    void trackExperimentEvent("empty_activation_cta", {
      experiment: EMPTY_ACTIVATION_KEY,
      variant,
      cta,
    });
  };

  const submitChat = () => {
    const trimmed = chatInput.trim();
    if (!trimmed || !onAskWarren) return;
    trackCta("warren");
    onAskWarren(trimmed);
    setChatInput("");
  };

  const subtitleKey =
    variant === "portfolio_first"
      ? "emptyStateSubtitlePortfolioFirst"
      : variant === "job_chooser"
        ? "emptyStateSubtitleJobChooser"
        : "emptyStateSubtitle";

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
          "Warren can only help add stocks here — up to 10 messages, then a 15-minute break."}
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

  const hero = (
    <div className="py-6 text-center">
      <div
        className={`mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl shadow-lg ${
          variant === "job_chooser"
            ? "bg-gradient-to-br from-sky-400 to-indigo-600 shadow-indigo-500/20"
            : variant === "portfolio_first"
              ? "bg-gradient-to-br from-emerald-400 to-teal-600 shadow-emerald-500/25"
              : "bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-emerald-500/20"
        }`}
      >
        <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          {variant === "job_chooser" ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941"
            />
          )}
        </svg>
      </div>
      <h2 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">{t("emptyStateTitle")}</h2>
      <p className="mx-auto max-w-md text-sm text-gray-500 dark:text-slate-400">{t(subtitleKey)}</p>
    </div>
  );

  if (variant === "job_chooser") {
    return (
      <div className="space-y-6" data-testid="empty-activation" data-variant="job_chooser">
        {hero}
        <p className="text-center text-sm font-medium text-gray-700 dark:text-slate-300">
          {t("emptyStateJobChooserLead")}
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
          <LinkCard
            href="/import"
            accent="emerald"
            title={t("emptyStateImport")}
            description={t("emptyStateImportDesc")}
            testId="empty-cta-import"
            icon={ICON_IMPORT}
            onClick={() => trackCta("import")}
          />
          <LinkCard
            href={MOAT_HREF}
            accent="sky"
            title={t("emptyStateJobMoat")}
            description={t("emptyStateJobMoatDesc")}
            testId="empty-cta-moat"
            icon={ICON_MOAT}
            onClick={() => trackCta("moat")}
          />
          <LinkCard
            href={SCREENER_HREF}
            accent="indigo"
            title={t("emptyStateJobScreener")}
            description={t("emptyStateJobScreenerDesc")}
            testId="empty-cta-screener"
            icon={ICON_SCREENER}
            onClick={() => trackCta("screener")}
          />
        </div>
        {warrenBlock}
      </div>
    );
  }

  if (variant === "portfolio_first") {
    return (
      <div className="space-y-6" data-testid="empty-activation" data-variant="portfolio_first">
        {hero}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <LinkCard
            href="/import"
            accent="emerald"
            title={t("emptyStateImport")}
            description={t("emptyStateImportDesc")}
            testId="empty-cta-import"
            icon={ICON_IMPORT}
            badge={t("emptyStateRecommended")}
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
        <div className="space-y-3">
          <p className="text-center text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">
            {t("emptyStateMeanwhileExplore")}
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <ExploreMiniCard
              href={MOAT_HREF}
              accent="sky"
              title={t("emptyStateJobMoat")}
              description={t("emptyStateJobMoatDesc")}
              testId="empty-cta-moat"
              icon={ICON_MOAT}
              onClick={() => trackCta("moat")}
            />
            <ExploreMiniCard
              href={SCREENER_HREF}
              accent="indigo"
              title={t("emptyStateJobScreener")}
              description={t("emptyStateJobScreenerDesc")}
              testId="empty-cta-screener"
              icon={ICON_SCREENER}
              onClick={() => trackCta("screener")}
            />
          </div>
        </div>
        {warrenBlock}
      </div>
    );
  }

  // control
  return (
    <div className="space-y-6" data-testid="empty-activation" data-variant="control">
      {hero}
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
