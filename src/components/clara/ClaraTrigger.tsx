"use client";

import Image from "next/image";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";

interface Props {
  onOpen?: () => void;
  /** When set, renders as a link (e.g. to /signup) — used in demo mode. */
  href?: string;
}

export default function ClaraTrigger({ onOpen, href }: Props) {
  const { t } = useI18n();
  const inner = (
    <div className="flex items-center gap-3">
      <span
        className="inline-block shrink-0 overflow-hidden rounded-full ring-2 ring-sky-500/25"
        style={{ width: 36, height: 36 }}
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
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-sky-700 dark:text-sky-300">
            {t("claraName")}
          </span>
          <span className="rounded-full border border-sky-500/18 bg-sky-500/12 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-sky-700 dark:text-sky-300">
            AI
          </span>
        </div>
        <p className="mt-0.5 text-[11px] text-gray-500 dark:text-slate-500">
          {t("claraTriggerSub")}
        </p>
      </div>
      <svg
        className="h-4 w-4 shrink-0 text-gray-400 dark:text-slate-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
      </svg>
    </div>
  );

  const className =
    "w-full cursor-pointer text-left transition-all hover:-translate-y-px card border-sky-500/16 bg-sky-500/[0.06] p-3 hover:border-sky-400/28";

  if (href) {
    return (
      <Link href={href} className={className}>
        {inner}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onOpen} className={className} aria-haspopup="dialog">
      {inner}
    </button>
  );
}
