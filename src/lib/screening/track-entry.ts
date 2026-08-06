/**
 * Client helper for screening entry analytics.
 * Fire-and-forget POST to first-party backend; pair with useTrack() for GA4.
 */

import type {
  ScreeningEntryEvent,
  ScreeningEntryPreviewMode,
  ScreeningEntryVariant,
} from "@/lib/screening/schemas";

export type ScreeningEntryTrackMetadata = Record<string, string>;

export function buildEntryViewMetadata(params: {
  variant: ScreeningEntryVariant;
  preview: ScreeningEntryPreviewMode;
  topSector?: string | null;
  topPct?: number | null;
}): ScreeningEntryTrackMetadata {
  const meta: ScreeningEntryTrackMetadata = {
    variant: params.variant,
    preview: params.preview,
  };
  if (params.topSector) {
    meta.top_sector = params.topSector.slice(0, 128);
  }
  if (params.topPct != null && Number.isFinite(params.topPct)) {
    meta.top_pct = params.topPct.toFixed(1);
  }
  return meta;
}

export function buildEntryCtaMetadata(params: {
  intent: "explore" | "rebalance";
  variant: ScreeningEntryVariant;
  preview: ScreeningEntryPreviewMode;
  primary: boolean;
}): ScreeningEntryTrackMetadata {
  return {
    intent: params.intent,
    variant: params.variant,
    preview: params.preview,
    primary: params.primary ? "true" : "false",
  };
}

export function buildEntryBackHomeMetadata(params: {
  variant: ScreeningEntryVariant;
  preview: ScreeningEntryPreviewMode;
}): ScreeningEntryTrackMetadata {
  return {
    variant: params.variant,
    preview: params.preview,
  };
}

export function buildDiscoveryOpenedMetadata(source = "diversify"): ScreeningEntryTrackMetadata {
  return { source };
}

/** Persist entry event server-side. Failures are swallowed so UX is never blocked. */
export async function postScreeningEntryEvent(
  event: ScreeningEntryEvent,
  metadata?: ScreeningEntryTrackMetadata,
): Promise<void> {
  try {
    await fetch("/api/screening/entry-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, metadata }),
      keepalive: true,
    });
  } catch {
    // Intentional: analytics must not break navigation.
  }
}
