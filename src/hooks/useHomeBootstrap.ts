"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePortfolio } from "@/lib/portfolio-context";
import { setHomeBootstrapPending } from "@/lib/home-bootstrap-pending";
import type {
  HomeBootstrapCorePayload,
  HomeBootstrapPayload,
  HomeBootstrapSectionsPayload,
} from "@/lib/homepage/build-home-bootstrap";

export function useHomeBootstrap(enabled: boolean) {
  const { activePortfolioId, demoMode } = usePortfolio();
  const [data, setData] = useState<HomeBootstrapPayload | null>(null);
  const [coreLoading, setCoreLoading] = useState(false);
  const [sectionsLoading, setSectionsLoading] = useState(false);
  const [error, setError] = useState(false);
  const runIdRef = useRef(0);

  const load = useCallback(async () => {
    if (!enabled || demoMode) {
      setHomeBootstrapPending(false);
      setData(null);
      setCoreLoading(false);
      setSectionsLoading(false);
      setError(false);
      return;
    }

    const runId = ++runIdRef.current;
    setHomeBootstrapPending(true);
    setCoreLoading(true);
    setSectionsLoading(true);
    setError(false);

    const params = new URLSearchParams();
    if (activePortfolioId) params.set("portfolioId", activePortfolioId);

    const coreParams = new URLSearchParams(params);
    coreParams.set("phase", "core");
    const sectionsParams = new URLSearchParams(params);
    sectionsParams.set("phase", "sections");

    try {
      const coreRes = await fetch(`/api/home-v2/bootstrap?${coreParams}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (!coreRes.ok) throw new Error("bootstrap core failed");
      const core = (await coreRes.json()) as HomeBootstrapCorePayload;
      if (runId !== runIdRef.current) return;

      setData((prev) => ({ ...(prev ?? {}), ...core } as HomeBootstrapPayload));
      setCoreLoading(false);

      void fetch(`/api/home-v2/bootstrap?${sectionsParams}`, {
        credentials: "include",
        cache: "no-store",
      })
        .then(async (sectionsRes) => {
          if (runId !== runIdRef.current) return;
          if (!sectionsRes.ok) throw new Error("bootstrap sections failed");
          const sections = (await sectionsRes.json()) as HomeBootstrapSectionsPayload;
          if (runId !== runIdRef.current) return;
          setData((prev) => ({ ...(prev ?? {}), ...sections } as HomeBootstrapPayload));
        })
        .catch(() => {
          if (runId !== runIdRef.current) return;
          setError(true);
        })
        .finally(() => {
          if (runId !== runIdRef.current) return;
          setSectionsLoading(false);
          setHomeBootstrapPending(false);
        });
    } catch {
      if (runId !== runIdRef.current) return;
      setData(null);
      setError(true);
      setCoreLoading(false);
      setSectionsLoading(false);
      setHomeBootstrapPending(false);
    }
  }, [enabled, demoMode, activePortfolioId]);

  useEffect(() => {
    void load();
    return () => {
      runIdRef.current += 1;
      setHomeBootstrapPending(false);
    };
  }, [load]);

  return {
    data,
    loading: coreLoading,
    sectionsLoading,
    error,
    reload: load,
  };
}
