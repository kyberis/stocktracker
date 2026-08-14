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
 * Discovery entry for the screening flow. Renders nothing when the flag is off,
 * so it can sit inside existing diversification surfaces without gating logic
 * leaking into them.
 */
export function ScreeningEntryCta({ className = "" }: { className?: string }) {
  const enabled = useFeatureFlag("investment_screening_enabled");
  const newRunsEnabled = useFeatureFlag("screening_new_runs_enabled");
  const { copy } = useScreeningCopy();
  const track = useTrack();
  if (!enabled || !newRunsEnabled) return null;

  const meta = buildDiscoveryOpenedMetadata("diversify");

  return (
    <section
      className={`card rounded-[20px] border border-[color:var(--border)] p-4 ${className}`.trim()}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-300">
        {copy.entry.discoveryEyebrow}
      </p>
      <h2 className="mt-1 text-[15px] font-bold text-[color:var(--foreground)]">
        {copy.entry.discoveryTitle}
      </h2>
      <p className="mt-1.5 text-[13px] text-[color:var(--muted)]">{copy.entry.discoveryBody}</p>
      <Link
        href="/screening"
        className="btn-primary mt-3 inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold"
        onClick={() => {
          track("screening_discovery_opened", meta);
          void postScreeningEntryEvent("screening_discovery_opened", meta);
        }}
      >
        {copy.entry.discoveryCta}
      </Link>
    </section>
  );
}
