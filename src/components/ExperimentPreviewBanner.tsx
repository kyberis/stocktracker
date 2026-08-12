"use client";

import { useAuth } from "@/lib/auth-context";
import {
  clearExperimentPreview,
  listExperimentPreviews,
  subscribeExperimentPreview,
  syncExperimentPreviewFromSearchParams,
} from "@/lib/experiment-preview";
import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * Slim bar for admins when a client-only experiment preview override is active.
 */
export default function ExperimentPreviewBanner() {
  const { user } = useAuth();
  const [previews, setPreviews] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user?.role !== "admin") return;
    try {
      syncExperimentPreviewFromSearchParams(new URLSearchParams(window.location.search));
    } catch {
      // ignore
    }
    const refresh = () => setPreviews(listExperimentPreviews());
    refresh();
    return subscribeExperimentPreview(refresh);
  }, [user?.role]);

  if (user?.role !== "admin") return null;

  const entries = Object.entries(previews);
  if (entries.length === 0) return null;

  const summary = entries.map(([k, v]) => `${k} → ${v}`).join(" · ");

  return (
    <div
      role="status"
      aria-live="polite"
      className="border-b border-amber-500/30 bg-amber-500/15 px-4 py-2 z-30 dark:bg-amber-500/10"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="min-w-0 text-amber-950 dark:text-amber-100">
          <span className="font-medium">Experiment preview active:</span>{" "}
          <span className="font-mono text-xs sm:text-sm">{summary}</span>
        </p>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Link
            href={`/admin/experiments/preview?key=${encodeURIComponent(entries[0]![0])}&variant=${encodeURIComponent(entries[0]![1])}`}
            className="text-xs font-medium text-amber-800 underline-offset-2 hover:underline dark:text-amber-200"
          >
            Open preview
          </Link>
          <button
            type="button"
            className="rounded-md border border-amber-600/40 bg-amber-600/20 px-2.5 py-1 text-xs font-semibold text-amber-950 transition-colors hover:bg-amber-600/30 dark:text-amber-50"
            onClick={() => clearExperimentPreview("all")}
          >
            Clear preview
          </button>
        </div>
      </div>
    </div>
  );
}
