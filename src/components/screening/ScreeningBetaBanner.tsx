"use client";

import Link from "next/link";
import { useFeatureFlag } from "@/lib/feature-flag-context";
import {
  buildDiscoveryOpenedMetadata,
  postScreeningEntryEvent,
} from "@/lib/screening/track-entry";
import { useTrack } from "@/lib/use-track";
import { useScreeningCopy } from "./use-screening-copy";

/**
 * Home discovery banner for investment screening (beta).
 * Renders nothing when the flag is off.
 */
export default function ScreeningBetaBanner() {
  const enabled = useFeatureFlag("investment_screening_enabled");
  const { copy } = useScreeningCopy();
  const track = useTrack();

  if (!enabled) return null;

  const meta = buildDiscoveryOpenedMetadata("home");

  return (
    <Link
      href="/screening"
      onClick={() => {
        track("screening_discovery_opened", meta);
        void postScreeningEntryEvent("screening_discovery_opened", meta);
      }}
      className="group card flex items-center gap-3 rounded-[var(--radius-card)] border border-teal-500/25 bg-gradient-to-r from-teal-500/[0.08] to-transparent p-4 transition-colors hover:border-teal-500/40"
    >
      <span className="inline-flex shrink-0 items-center rounded-full bg-teal-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-300">
        {copy.homeBeta.badge}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-[color:var(--foreground)]">
          {copy.homeBeta.title}
        </div>
        <div className="text-xs text-[color:var(--muted)]">{copy.homeBeta.body}</div>
      </div>
      <span className="hidden shrink-0 text-xs font-semibold text-teal-700 dark:text-teal-300 sm:inline">
        {copy.homeBeta.cta}
      </span>
      <svg
        className="h-5 w-5 shrink-0 text-teal-600 transition-transform group-hover:translate-x-0.5 dark:text-teal-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
      </svg>
    </Link>
  );
}
