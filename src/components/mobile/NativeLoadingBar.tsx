"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Thin animated progress bar shown at the top of the native shell during
 * page navigations. Detects navigation start via click interception on
 * internal links and navigation end via pathname/searchParams changes.
 */
export default function NativeLoadingBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevPath = useRef(pathname);

  const startLoading = useCallback(() => {
    setLoading(true);
    setProgress(15);

    if (timerRef.current) clearInterval(timerRef.current);
    let p = 15;
    timerRef.current = setInterval(() => {
      p += Math.random() * 12;
      if (p > 90) p = 90;
      setProgress(p);
    }, 300);
  }, []);

  const finishLoading = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setProgress(100);
    setTimeout(() => {
      setLoading(false);
      setProgress(0);
    }, 300);
  }, []);

  // Detect navigation end
  useEffect(() => {
    if (pathname !== prevPath.current) {
      prevPath.current = pathname;
      finishLoading();
    }
  }, [pathname, searchParams, finishLoading]);

  // Intercept clicks on internal links to detect navigation start
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const anchor = (e.target as HTMLElement).closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("http") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
      if (anchor.target === "_blank") return;
      if (e.metaKey || e.ctrlKey || e.shiftKey) return;

      if (href !== pathname) {
        startLoading();
      }
    }

    document.addEventListener("click", handleClick, { capture: true });
    return () => document.removeEventListener("click", handleClick, { capture: true });
  }, [pathname, startLoading]);

  if (!loading && progress === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] h-[3px]" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <div
        className="h-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] transition-all duration-300 ease-out"
        style={{
          width: `${progress}%`,
          opacity: loading ? 1 : 0,
        }}
      />
    </div>
  );
}
