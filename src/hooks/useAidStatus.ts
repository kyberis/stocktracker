"use client";

import { useCallback, useEffect, useState } from "react";
import { usePortfolio } from "@/lib/portfolio-context";
import type { AidStatusPayload } from "@/lib/types";

export function useAidStatus(enabled: boolean) {
  const { activePortfolioId } = usePortfolio();
  const [data, setData] = useState<AidStatusPayload | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activePortfolioId) params.set("portfolioId", activePortfolioId);
      const res = await fetch(`/api/aid/status?${params}`, { credentials: "include", cache: "no-store" });
      if (!res.ok) throw new Error("status failed");
      const json = (await res.json()) as AidStatusPayload;
      setData(json);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [enabled, activePortfolioId]);

  const markVisited = useCallback(async () => {
    if (!enabled) return;
    try {
      await fetch("/api/aid/status", { method: "POST", credentials: "include" });
    } catch {
      /* best-effort */
    }
  }, [enabled]);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, loading, reload: load, markVisited };
}
