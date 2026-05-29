"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePortfolio } from "@/lib/portfolio-context";
import { useTrack } from "@/lib/use-track";
import {
  DEFAULT_AID_LAYOUT_EMPTY,
  DEFAULT_AID_LAYOUT_HOLDINGS,
  type AidLayoutOrder,
  type AidMainSectionId,
  type AidSidebarSectionId,
} from "@/lib/aid/layout-sections";
import type { AidLayoutOrder as AidLayoutOrderType } from "@/lib/types";

export function useAidLayout(enabled: boolean, isEmpty: boolean) {
  const { activePortfolioId } = usePortfolio();
  const track = useTrack();
  const [layout, setLayout] = useState<AidLayoutOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const layoutRef = useRef<AidLayoutOrder | null>(null);
  const saveTimerRef = useRef<number | null>(null);

  const load = useCallback(async () => {
    if (!enabled) {
      setLayout(null);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activePortfolioId) params.set("portfolioId", activePortfolioId);
      const res = await fetch(`/api/aid/layout?${params}`, { credentials: "include", cache: "no-store" });
      if (!res.ok) throw new Error("layout failed");
      const json = (await res.json()) as { layout: AidLayoutOrderType };
      layoutRef.current = json.layout;
      setLayout(json.layout);
    } catch {
      const fallback = isEmpty ? DEFAULT_AID_LAYOUT_EMPTY : DEFAULT_AID_LAYOUT_HOLDINGS;
      layoutRef.current = fallback;
      setLayout(fallback);
    } finally {
      setLoading(false);
    }
  }, [enabled, activePortfolioId, isEmpty]);

  useEffect(() => {
    void load();
  }, [load]);

  const persist = useCallback(
    async (next: AidLayoutOrder, previous: AidLayoutOrder) => {
      setSaving(true);
      try {
        const params = new URLSearchParams();
        if (activePortfolioId) params.set("portfolioId", activePortfolioId);
        const res = await fetch(`/api/aid/layout?${params}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(next),
        });
        if (!res.ok) throw new Error("save failed");
        const json = (await res.json()) as { layout: AidLayoutOrderType };
        layoutRef.current = json.layout;
        setLayout(json.layout);
      } catch {
        layoutRef.current = previous;
        setLayout(previous);
      } finally {
        setSaving(false);
      }
    },
    [activePortfolioId],
  );

  const scheduleSave = useCallback(
    (next: AidLayoutOrder, column: "main" | "sidebar") => {
      const previous = layoutRef.current ?? next;
      layoutRef.current = next;
      setLayout(next);
      track("aid_layout_reordered", {
        column,
        count: String(column === "main" ? next.main.length : next.sidebar.length),
      });
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = window.setTimeout(() => {
        void persist(next, previous);
      }, 400);
    },
    [persist, track],
  );

  const reorderMain = useCallback(
    (main: AidMainSectionId[]) => {
      if (!layoutRef.current) return;
      scheduleSave({ ...layoutRef.current, main }, "main");
    },
    [scheduleSave],
  );

  const reorderSidebar = useCallback(
    (sidebar: AidSidebarSectionId[]) => {
      if (!layoutRef.current) return;
      scheduleSave({ ...layoutRef.current, sidebar }, "sidebar");
    },
    [scheduleSave],
  );

  const resetToDefault = useCallback(() => {
    const defaults = isEmpty ? DEFAULT_AID_LAYOUT_EMPTY : DEFAULT_AID_LAYOUT_HOLDINGS;
    scheduleSave(defaults, "main");
  }, [isEmpty, scheduleSave]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, []);

  return {
    layout,
    loading,
    editing,
    setEditing,
    reorderMain,
    reorderSidebar,
    resetToDefault,
    saving,
  };
}
