/**
 * Screening observability (HLD §11). Entry-funnel counters ship with E0;
 * step histograms / QA counters land with later agent stages.
 */
import { Counter } from "prom-client";
import { getMetricsRegistry, getOrCreateMetric } from "@/lib/metrics";

export const screeningEntryViewsTotal = getOrCreateMetric(
  "screening_entry_views_total",
  () =>
    new Counter({
      name: "screening_entry_views_total",
      help: "Investment screening entry page views",
      labelNames: ["variant", "preview"] as const,
      registers: [getMetricsRegistry()],
    }),
);

export const screeningEntryCtaTotal = getOrCreateMetric(
  "screening_entry_cta_total",
  () =>
    new Counter({
      name: "screening_entry_cta_total",
      help: "Investment screening entry CTA clicks",
      labelNames: ["intent", "variant", "preview"] as const,
      registers: [getMetricsRegistry()],
    }),
);

export const screeningDiscoveryOpenedTotal = getOrCreateMetric(
  "screening_discovery_opened_total",
  () =>
    new Counter({
      name: "screening_discovery_opened_total",
      help: "Clicks on screening discovery CTAs outside /screening",
      labelNames: ["source"] as const,
      registers: [getMetricsRegistry()],
    }),
);

export const screeningEntryBackHomeTotal = getOrCreateMetric(
  "screening_entry_back_home_total",
  () =>
    new Counter({
      name: "screening_entry_back_home_total",
      help: "Back-home clicks from the screening entry page",
      labelNames: ["variant", "preview"] as const,
      registers: [getMetricsRegistry()],
    }),
);

function labelOrUnknown(value: string | undefined, fallback = "unknown"): string {
  return value && value.length > 0 ? value : fallback;
}

/**
 * Bump Prometheus counters for a persisted screening entry event.
 * Safe to call after trackEvent; never throws to the request path.
 */
export function recordScreeningEntryMetric(
  event: string,
  metadata?: Record<string, string>,
): void {
  try {
    const variant = labelOrUnknown(metadata?.variant);
    const preview = labelOrUnknown(metadata?.preview, "live");
    switch (event) {
      case "screening_entry_viewed":
        screeningEntryViewsTotal.inc({ variant, preview });
        break;
      case "screening_entry_cta_clicked":
        screeningEntryCtaTotal.inc({
          intent: labelOrUnknown(metadata?.intent),
          variant,
          preview,
        });
        break;
      case "screening_discovery_opened":
        screeningDiscoveryOpenedTotal.inc({
          source: labelOrUnknown(metadata?.source, "unknown"),
        });
        break;
      case "screening_entry_back_home":
        screeningEntryBackHomeTotal.inc({ variant, preview });
        break;
      default:
        break;
    }
  } catch (err) {
    console.error(
      "Failed to record screening entry metric:",
      err instanceof Error ? err.message : err,
    );
  }
}
