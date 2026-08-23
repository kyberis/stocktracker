"use client";

import { useEffect, useState } from "react";

/**
 * Gate network work until the browser is idle or the element is near the
 * viewport — keeps Home hero quotes / bootstrap off the critical path.
 */
export function useDeferredNetwork(enabled: boolean, rootMargin = "200px"): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setReady(false);
      return;
    }
    if (typeof window === "undefined") return;

    let cancelled = false;
    let idleId: number | undefined;
    let timeoutId: number | undefined;

    const markReady = () => {
      if (!cancelled) setReady(true);
    };

    const ric = window.requestIdleCallback?.bind(window);
    if (ric) {
      idleId = ric(() => markReady(), { timeout: 2500 });
    } else {
      timeoutId = window.setTimeout(markReady, 1200);
    }

    // Also unlock when scrolled near bottom of first viewport.
    const onScroll = () => {
      if (window.scrollY > 120) markReady();
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      cancelled = true;
      if (idleId != null && window.cancelIdleCallback) {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId != null) window.clearTimeout(timeoutId);
      window.removeEventListener("scroll", onScroll);
    };
  }, [enabled, rootMargin]);

  return ready;
}
