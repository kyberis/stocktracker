"use client";

import { useEffect, useState } from "react";
import {
  parseClaraDeskStatus,
  type ClaraDeskStatus,
} from "@/lib/clara-desk-status";

export function useClaraDeskStatus(enabled: boolean) {
  const [status, setStatus] = useState<ClaraDeskStatus | null>(enabled ? null : { linked: false });
  const [loading, setLoading] = useState(enabled);

  useEffect(() => {
    if (!enabled) {
      setStatus({ linked: false });
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void (async () => {
      try {
        const res = await fetch("/api/clara/status", { cache: "no-store" });
        if (!res.ok) {
          if (!cancelled) setStatus({ linked: false });
          return;
        }
        const data: unknown = await res.json();
        if (!cancelled) setStatus(parseClaraDeskStatus(data));
      } catch {
        if (!cancelled) setStatus({ linked: false });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { status, loading };
}
