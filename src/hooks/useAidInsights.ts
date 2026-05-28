"use client";

import { useCallback, useEffect, useState } from "react";
import type { ClaraSavingsSummary, WillRecentTagsHit } from "@/lib/ai/office/types";

export interface AidInsightsPayload {
  clara: ClaraSavingsSummary;
  will: WillRecentTagsHit;
}

export function useAidInsights(enabled: boolean) {
  const [data, setData] = useState<AidInsightsPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/aid/insights", { credentials: "include", cache: "no-store" });
      if (!res.ok) throw new Error("insights failed");
      setData((await res.json()) as AidInsightsPayload);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, loading, error, reload: load };
}
