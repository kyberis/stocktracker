"use client";

import { useCallback, useEffect, useState } from "react";
import { usePortfolio } from "@/lib/portfolio-context";
import type { AidStatusPayload } from "@/lib/types";

export type UseAidStatusOptions = {
  /**
   * When true (default), first request includes LLM briefing (AID dashboard).
   * When false (Home), shell comes from bootstrap seed; briefing is fetched lazily.
   */
  includeBriefing?: boolean;
  /** Seed from `/api/home-v2/bootstrap` — skips duplicate shell status fetch. */
  seed?: AidStatusPayload | null;
  /**
   * When false, do not auto-fetch (wait for bootstrap). Defaults to true when
   * no seed is expected; Home sets false until bootstrap settles.
   */
  autoFetch?: boolean;
};

export function useAidStatus(enabled: boolean, options?: UseAidStatusOptions) {
  const { activePortfolioId } = usePortfolio();
  const includeBriefing = options?.includeBriefing !== false;
  const seed = options?.seed ?? null;
  const autoFetch = options?.autoFetch !== false;
  const [data, setData] = useState<AidStatusPayload | null>(seed);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (seed) setData(seed);
  }, [seed]);

  const load = useCallback(
    async (opts?: { briefingOnly?: boolean }) => {
      if (!enabled) return;
      const wantBriefing = opts?.briefingOnly === true || includeBriefing;
      if (!opts?.briefingOnly) setLoading(true);
      try {
        const params = new URLSearchParams();
        if (activePortfolioId) params.set("portfolioId", activePortfolioId);
        if (wantBriefing) params.set("includeBriefing", "1");
        const res = await fetch(`/api/aid/status?${params}`, {
          credentials: "include",
          cache: "no-store",
        });
        if (!res.ok) throw new Error("status failed");
        const json = (await res.json()) as AidStatusPayload;
        setData((prev) => {
          if (opts?.briefingOnly && prev) {
            return { ...prev, briefing: json.briefing };
          }
          return json;
        });
      } catch {
        if (!opts?.briefingOnly) setData(null);
      } finally {
        if (!opts?.briefingOnly) setLoading(false);
      }
    },
    [enabled, activePortfolioId, includeBriefing],
  );

  const markVisited = useCallback(async () => {
    if (!enabled) return;
    try {
      await fetch("/api/aid/status", { method: "POST", credentials: "include" });
      await load();
      if (!includeBriefing) await load({ briefingOnly: true });
    } catch {
      /* best-effort */
    }
  }, [enabled, load, includeBriefing]);

  useEffect(() => {
    if (!enabled || !autoFetch) return;

    if (seed && !includeBriefing) {
      void load({ briefingOnly: true });
      return;
    }

    if (seed && includeBriefing) return;

    void load();
  }, [enabled, autoFetch, seed, includeBriefing, load]);

  return { data, loading: loading && !data, reload: load, markVisited };
}
