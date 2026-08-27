/**
 * Deep links into the existing `/import` wizard.
 * Warren and Office orchestrate import by navigating here — they do not
 * reimplement SnapTrade, CSV parsers, or preview/confirm.
 */

export type ImportWizardMethod = "broker_csv" | "snaptrade_api" | "ai_import" | "manual";

export type WarrenImportSurface =
  | { type: "snaptrade"; brokerSlug: string }
  | { type: "csv"; guideId?: string; format?: string; query?: string }
  | { type: "manual" };

export interface ParsedImportEntry {
  method: ImportWizardMethod | null;
  brokerSlug: string;
  csvGuideId: string;
  csvFormat: string;
  csvQuery: string;
}

const METHODS = new Set<ImportWizardMethod>([
  "broker_csv",
  "snaptrade_api",
  "ai_import",
  "manual",
]);

function asMethod(raw: string | null): ImportWizardMethod | null {
  if (!raw) return null;
  return METHODS.has(raw as ImportWizardMethod) ? (raw as ImportWizardMethod) : null;
}

/** Build `/import?...` for a picker action (same wizard the empty-home CTA uses). */
export function warrenImportHref(surface: WarrenImportSurface): string {
  if (surface.type === "manual") return "/import?method=manual";
  if (surface.type === "csv") {
    const params = new URLSearchParams({ method: "broker_csv" });
    if (surface.guideId) params.set("guide", surface.guideId);
    if (surface.format) params.set("format", surface.format);
    if (surface.query) params.set("q", surface.query);
    return `/import?${params.toString()}`;
  }
  const params = new URLSearchParams({
    method: "snaptrade_api",
    broker: surface.brokerSlug,
  });
  return `/import?${params.toString()}`;
}

export function parseImportEntrySearch(search: string): ParsedImportEntry {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  return {
    method: asMethod(params.get("method")),
    brokerSlug: (params.get("broker") || "").trim(),
    csvGuideId: (params.get("guide") || "").trim(),
    csvFormat: (params.get("format") || "").trim(),
    csvQuery: (params.get("q") || "").trim(),
  };
}
