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
  const { showAds } = useAds();
  const pushed = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showAds || pushed.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch {
      // adsbygoogle not loaded yet
    }
  }, [showAds]);

  if (!showAds) return null;

  const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;
  if (!clientId) return null;

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
        data-ad-slot={slot}
        data-ad-format={format === "auto" ? "auto" : format === "horizontal" ? "horizontal" : "rectangle"}
        data-full-width-responsive={format === "auto" || format === "horizontal" ? "true" : "false"}
      />
    </div>
  );
}
