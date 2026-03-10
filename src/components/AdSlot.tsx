"use client";

import { useEffect, useRef } from "react";
import { useAds } from "@/hooks/useAds";

declare global {
  interface Window {
    adsbygoogle?: Record<string, unknown>[];
  }
}

interface AdSlotProps {
  slot: string;
  format?: "auto" | "rectangle" | "horizontal";
  className?: string;
}

export default function AdSlot({ slot, format = "auto", className = "" }: AdSlotProps) {
  const { slotEnabled, slotId, clientId } = useAds();
  const pushed = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const enabled = slotEnabled(slot);
  const resolvedSlotId = slotId(slot);

  useEffect(() => {
    if (!enabled || pushed.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch {
      // adsbygoogle not loaded yet
    }
  }, [enabled]);

  if (!enabled || !clientId || !resolvedSlotId) return null;

  return (
    <div
      ref={containerRef}
      className={`ad-slot text-center ${className}`}
      data-testid="ad-slot"
    >
      <span className="block text-[10px] text-gray-400 dark:text-slate-500 mb-1">
        Advertisement
      </span>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={clientId}
        data-ad-slot={resolvedSlotId}
        data-ad-format={format === "auto" ? "auto" : format === "horizontal" ? "horizontal" : "rectangle"}
        data-full-width-responsive={format === "auto" || format === "horizontal" ? "true" : "false"}
      />
    </div>
  );
}
