"use client";

import { useEffect, useRef } from "react";
import { useTrack } from "@/lib/use-track";

const LAST_VISIT_KEY = "aid_last_page_at";

/** Tracks return-within-24h and first view of key AID sections. */
export function useAidEngagementMetrics(enabled: boolean) {
  const track = useTrack();
  const returnTracked = useRef(false);
  const sectionsTracked = useRef(new Set<string>());

  useEffect(() => {
    if (!enabled || returnTracked.current) return;
    returnTracked.current = true;

    try {
      const prev = localStorage.getItem(LAST_VISIT_KEY);
      if (prev) {
        const diff = Date.now() - Number(prev);
        if (diff > 0 && diff <= 24 * 3600 * 1000) {
          track("aid_return_within_24h", { hours: String(Math.max(1, Math.round(diff / 3600000))) });
        }
      }
      localStorage.setItem(LAST_VISIT_KEY, String(Date.now()));
    } catch {
      /* private mode */
    }
  }, [enabled, track]);

  useEffect(() => {
    if (!enabled) return;

    const sectionIds = ["aid-priority", "aid-finpulse", "aid-news", "aid-earnings"];
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const id = entry.target.id;
          if (!id || sectionsTracked.current.has(id)) continue;
          sectionsTracked.current.add(id);
          track("aid_section_viewed", {
            section: id.replace(/^aid-/, ""),
            order: String(sectionsTracked.current.size),
          });
        }
      },
      { threshold: 0.35 },
    );

    for (const id of sectionIds) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [enabled, track]);
}
