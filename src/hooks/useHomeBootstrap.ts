"use client";

import { useCallback, useEffect, useState } from "react";
import { usePortfolio } from "@/lib/portfolio-context";
import type { HomeBootstrapPayload } from "@/lib/homepage/build-home-bootstrap";

export function useHomeBootstrap(enabled: boolean) {
  const { activePortfolioId, demoMode } = usePortfolio();
  const [data, setData] = useState<HomeBootstrapPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (!enabled || demoMode) {
      setData(null);
      setLoading(false);
      setError(false);
      return;
    }
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams();
      if (activePortfolioId) params.set("portfolioId", activePortfolioId);
      const res = await fetch(`/api/home-v2/bootstrap?${params}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) throw new Error("bootstrap failed");
      setData((await res.json()) as HomeBootstrapPayload);
    } catch {
      setData(null);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [enabled, demoMode, activePortfolioId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, loading, error, reload: load };
}
