import { z } from "zod";
import { noteScreeningProviderQuota } from "@/lib/screening/provider-circuit";
import type { ThesisFact } from "@/lib/screening/thesis/schemas";

const FMP_BASE = "https://financialmodelingprep.com/stable";

const estimateRowSchema = z
  .object({
    symbol: z.string().optional(),
    date: z.string().optional(),
    estimatedEpsAvg: z.union([z.number(), z.string()]).optional(),
    estimatedRevenueAvg: z.union([z.number(), z.string()]).optional(),
  })
  .passthrough();

function toNum(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * Street consensus (I1–I3). This is analyst estimates, not company guidance —
 * do not treat it as F5 (promised vs delivered).
 */
export async function fetchAnalystEstimateFacts(opts: {
  ticker: string;
  asOf: string;
  fetchImpl?: typeof fetch;
}): Promise<{ facts: ThesisFact[]; errors: string[] }> {
  const ticker = opts.ticker.toUpperCase().trim();
  const apiKey = process.env.FMP_API_KEY?.trim();
  const facts: ThesisFact[] = [];
  if (!apiKey) return { facts, errors: ["missing_api_key"] };

  const url = new URL(`${FMP_BASE}/analyst-estimates`);
  url.searchParams.set("symbol", ticker);
  url.searchParams.set("period", "annual");
  url.searchParams.set("limit", "4");
  url.searchParams.set("apikey", apiKey);
  const fetchImpl = opts.fetchImpl ?? fetch;
  try {
    const res = await fetchImpl(url.toString(), {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      const body = (await res.text().catch(() => "")).slice(0, 200);
      if (res.status === 429) {
        noteScreeningProviderQuota({
          provider: "fmp",
          statusCode: 429,
          detail: body,
        });
      }
      return { facts, errors: [`analyst_estimates_${res.status}`] };
    }
    const json = (await res.json().catch(() => null)) as unknown;
    const row = Array.isArray(json) ? json[0] : json;
    const parsed = estimateRowSchema.safeParse(row);
    if (!parsed.success) return { facts, errors: [] };
    const eps = toNum(parsed.data.estimatedEpsAvg);
    const rev = toNum(parsed.data.estimatedRevenueAvg);
    const source = {
      type: "fmp" as const,
      ref: "analyst-estimates",
      url: `${FMP_BASE}/analyst-estimates`,
      retrieved_at: opts.asOf,
      primary: false,
    };
    if (eps != null) {
      facts.push({
        asset_id: ticker,
        field_id: "calc:consensus_eps",
        value: eps,
        unit: "usd",
        as_of: opts.asOf,
        source,
        method: "raw",
        period: { kind: "FY", fiscal_label: parsed.data.date },
      });
    }
    if (rev != null) {
      facts.push({
        asset_id: ticker,
        field_id: "calc:consensus_revenue",
        value: rev,
        unit: "usd",
        as_of: opts.asOf,
        source,
        method: "raw",
        period: { kind: "FY", fiscal_label: parsed.data.date },
      });
    }
    return { facts, errors: [] };
  } catch (err) {
    return {
      facts,
      errors: [err instanceof Error ? err.message.slice(0, 80) : "fetch_error"],
    };
  }
}
