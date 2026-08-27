"use client";

import Link from "next/link";
import { useFeatureFlag } from "@/lib/feature-flag-context";
import { useTrack } from "@/lib/use-track";
import { useRealEstateCopy } from "./use-real-estate-copy";

export function RealEstateScreeningCta() {
  const enabled = useFeatureFlag("real_estate_screening_enabled");
  const { copy } = useRealEstateCopy();
  const track = useTrack();

  if (!enabled) return null;

  return (
    <Link
      href="/real-estate/screening"
      data-testid="real-estate-screening-cta"
      onClick={() => track("re_screening_discovery_opened", { source: "home" })}
      className="group card flex flex-col gap-3 rounded-[var(--radius-card)] border border-amber-500/25 bg-gradient-to-r from-amber-500/[0.08] to-transparent p-4 transition-colors hover:border-amber-500/40 sm:flex-row sm:items-center"
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span className="inline-flex shrink-0 items-center rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
          {copy.homeCta.badge}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-[color:var(--foreground)]">{copy.homeCta.title}</div>
          <div className="text-xs text-[color:var(--muted)]">{copy.homeCta.body}</div>
        </div>
      </div>
      <span className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-1.5 rounded-xl bg-amber-500/15 px-3 text-xs font-semibold text-amber-800 dark:text-amber-300 sm:w-auto">
        {copy.homeCta.cta}
        <svg
          className="h-4 w-4 shrink-0 text-amber-700 transition-transform group-hover:translate-x-0.5 dark:text-amber-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
        </svg>
      </span>
    </Link>
  );
}
