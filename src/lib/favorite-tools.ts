"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { TOOLS_CATALOG, type ToolTabId } from "@/lib/tools-registry";

const STORAGE_KEY = "trefolio_favorite_tool_ids";

const VALID_IDS = new Set<ToolTabId>(TOOLS_CATALOG.map((e) => e.id));

function parseLocal(raw: string | null): ToolTabId[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is ToolTabId => typeof id === "string" && VALID_IDS.has(id as ToolTabId));
  } catch {
    return [];
  }
}

export function catalogOrderIndex(id: ToolTabId): number {
  const i = TOOLS_CATALOG.findIndex((e) => e.id === id);
  return i >= 0 ? i : 9999;
}

export function useFavoriteTools() {
  const { user } = useAuth();
  const [ids, setIds] = useState<ToolTabId[]>([]);
  const idsRef = useRef(ids);
  idsRef.current = ids;

  useEffect(() => {
    if (!user) {
      setIds([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/favorite-tools", { credentials: "include", cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { favoriteToolIds?: string[] };
        let list = (data.favoriteToolIds ?? []).filter((id): id is ToolTabId =>
          typeof id === "string" && VALID_IDS.has(id as ToolTabId)
        );

        if (list.length === 0 && typeof window !== "undefined") {
          const local = parseLocal(localStorage.getItem(STORAGE_KEY));
          if (local.length > 0) {
            const put = await fetch("/api/favorite-tools", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({ favoriteToolIds: local }),
            });
            if (put.ok) {
              try {
                localStorage.removeItem(STORAGE_KEY);
              } catch {
                /* ignore */
              }
              list = local;
            }
          }
        }

        if (!cancelled) setIds(list);
      } catch {
        /* keep previous ids */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const toggleFavorite = useCallback(
    async (id: ToolTabId) => {
      if (!user) return;
      const prev = idsRef.current;
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      setIds(next);
      try {
        const res = await fetch("/api/favorite-tools", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ favoriteToolIds: next }),
        });
        if (!res.ok) throw new Error("save failed");
      } catch {
        setIds(prev);
      }
    },
    [user]
  );

  const favoriteIds = useMemo(() => new Set(ids), [ids]);
  const isFavorite = useCallback((tid: ToolTabId) => favoriteIds.has(tid), [favoriteIds]);

  return { favoriteIds, favoriteIdsOrdered: ids, toggleFavorite, isFavorite };
}
