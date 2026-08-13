import type { IrSiteDocsProvider } from "@/lib/screening/data/ir-site-docs";

export interface AnalyzeBriefMeta {
  ticker: string | null;
  companyName: string | null;
  exchange: string | null;
}

export interface AnalyzeIrResources {
  provider: IrSiteDocsProvider | null;
  serperQueries: number;
  jinaUrls: number;
  irSiteDocsUsed: boolean;
}

const PROVIDERS = new Set<IrSiteDocsProvider>([
  "serper_jina",
  "tavily",
  "mixed",
]);

export function parseAnalyzeBriefMeta(briefJson: string): AnalyzeBriefMeta {
  try {
    const brief = JSON.parse(briefJson) as Record<string, unknown>;
    const ticker =
      typeof brief.focusTicker === "string" && brief.focusTicker.trim()
        ? brief.focusTicker.trim().toUpperCase().slice(0, 24)
        : null;
    const companyName =
      typeof brief.focusCompanyName === "string" && brief.focusCompanyName.trim()
        ? brief.focusCompanyName.trim().slice(0, 120)
        : null;
    const exchange =
      typeof brief.focusExchange === "string" && brief.focusExchange.trim()
        ? brief.focusExchange.trim().slice(0, 24)
        : null;
    return { ticker, companyName, exchange };
  } catch {
    return { ticker: null, companyName: null, exchange: null };
  }
}

export function parseIrStepCompletedPayload(
  payloadJson: string,
): AnalyzeIrResources {
  try {
    const p = JSON.parse(payloadJson) as Record<string, unknown>;
    const rawProvider = typeof p.provider === "string" ? p.provider : null;
    return {
      provider:
        rawProvider && PROVIDERS.has(rawProvider as IrSiteDocsProvider)
          ? (rawProvider as IrSiteDocsProvider)
          : null,
      serperQueries: Math.max(0, Number(p.serperQueries) || 0),
      jinaUrls: Math.max(0, Number(p.jinaUrls) || 0),
      irSiteDocsUsed: Boolean(p.irSiteDocsUsed),
    };
  } catch {
    return {
      provider: null,
      serperQueries: 0,
      jinaUrls: 0,
      irSiteDocsUsed: false,
    };
  }
}

export function mergeIrResources(
  parts: AnalyzeIrResources[],
): AnalyzeIrResources {
  if (parts.length === 0) {
    return {
      provider: null,
      serperQueries: 0,
      jinaUrls: 0,
      irSiteDocsUsed: false,
    };
  }
  const providers = new Set(
    parts.map((p) => p.provider).filter((p): p is IrSiteDocsProvider => p != null),
  );
  let provider: IrSiteDocsProvider | null = null;
  if (providers.size === 1) provider = [...providers][0] ?? null;
  else if (providers.size > 1) provider = "mixed";
  return {
    provider,
    serperQueries: parts.reduce((s, p) => s + p.serperQueries, 0),
    jinaUrls: parts.reduce((s, p) => s + p.jinaUrls, 0),
    irSiteDocsUsed: parts.some((p) => p.irSiteDocsUsed),
  };
}
