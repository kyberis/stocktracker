"use client";

import Link from "next/link";
import WarrenAvatar from "./WarrenAvatar";
import { useI18n } from "@/lib/i18n";

interface Props {
  onOpen?: () => void;
  /** When set, renders as a link (e.g. to /signup) instead of opening the chat drawer — used where the chat backend requires a real session. */
  href?: string;
}

export default function WarrenTrigger({ onOpen, href }: Props) {
  const { t } = useI18n();
  const inner = (
    <div className="flex items-center gap-3">
      <WarrenAvatar size={36} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">
            {t("warrenName")}
          </span>
          <span className="rounded-full border border-amber-500/18 bg-amber-500/12 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">
            AI
          </span>
        </div>
        <p className="text-[11px] text-gray-500 dark:text-slate-500 mt-0.5">
          {t("warrenTriggerSub")}
        </p>
      </div>
      <svg
        className="w-4 h-4 text-gray-400 dark:text-slate-500 shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
      </svg>
    </div>
  );

  const className =
    "w-full cursor-pointer text-left transition-all hover:-translate-y-px card border-amber-500/16 bg-amber-500/[0.06] p-3 hover:border-amber-400/28";

  if (href) {
    return (
      <Link href={href} className={className}>
        {inner}
      </Link>
    );
  }

  return (
    <button onClick={onOpen} className={className}>
      {inner}
    </button>
  );
}
