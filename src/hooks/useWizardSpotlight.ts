"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface UseWizardSpotlightResult {
  rect: SpotlightRect | null;
  scrollTo: () => Promise<void>;
  isVisible: boolean;
}

function getRect(el: Element): SpotlightRect {
  const r = el.getBoundingClientRect();
  return {
    top: r.top + window.scrollY,
    left: r.left + window.scrollX,
    width: r.width,
    height: r.height,
  };
}

function isInViewport(el: Element): boolean {
  const r = el.getBoundingClientRect();
  return r.top >= 0 && r.bottom <= window.innerHeight;
}

export function useWizardSpotlight(dataTour: string | null): UseWizardSpotlightResult {
  const [rect, setRect] = useState<SpotlightRect | null>(null);
  const [visible, setVisible] = useState(false);
  const observerRef = useRef<ResizeObserver | null>(null);
  const rafRef = useRef<number>(0);

  const measure = useCallback(() => {
    if (!dataTour) {
      setRect(null);
      setVisible(false);
      return;
    }
    const el = document.querySelector(`[data-tour="${dataTour}"]`);
    if (!el) {
      setRect(null);
      setVisible(false);
      return;
    }
    setRect(getRect(el));
    setVisible(isInViewport(el));
  }, [dataTour]);

  useEffect(() => {
    measure();

    const handleUpdate = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(measure);
    };

    window.addEventListener("scroll", handleUpdate, { passive: true });
    window.addEventListener("resize", handleUpdate, { passive: true });

    if (dataTour) {
      const el = document.querySelector(`[data-tour="${dataTour}"]`);
      if (el) {
        observerRef.current = new ResizeObserver(handleUpdate);
        observerRef.current.observe(el);
      }
    }

    return () => {
      window.removeEventListener("scroll", handleUpdate);
      window.removeEventListener("resize", handleUpdate);
      cancelAnimationFrame(rafRef.current);
      observerRef.current?.disconnect();
    };
  }, [dataTour, measure]);

  const scrollTo = useCallback(async () => {
    if (!dataTour) return;
    const el = document.querySelector(`[data-tour="${dataTour}"]`);
    if (!el) return;
    if (!isInViewport(el)) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      await new Promise((r) => setTimeout(r, 350));
    }
    setRect(getRect(el));
    setVisible(true);
  }, [dataTour]);

  return { rect, scrollTo, isVisible: visible };
}
