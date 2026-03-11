"use client";

import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  blurb: string;
  ctaLabel?: string;
}

export default function BlurredProSection({ children, blurb, ctaLabel = "Upgrade to Trefolio" }: Props) {
  return (
    <div className="relative min-h-[180px]">
      <div className="blur-[6px] pointer-events-none select-none opacity-60 min-h-[180px] flex items-center">
        <div className="w-full">{children}</div>
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/5 dark:bg-slate-900/40 backdrop-blur-[1px] rounded-2xl">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
        </div>
        <p className="text-sm text-center text-gray-600 dark:text-slate-300 max-w-xs px-4">
          {blurb}
        </p>
        <a
          href="/profile?section=subscription"
          className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold hover:brightness-110 transition-all"
        >
          {ctaLabel}
        </a>
      </div>
    </div>
  );
}
