import { z } from "zod";
import { recordTavilyResearchRequest } from "@/lib/screening/metrics";
import { accrueScreeningTavilyResearchCost } from "@/lib/screening/cost";

/**
 * Tavily Research API client for screening company diligence.
 * POST /research + poll GET /research/{request_id}. Fail-open on missing key.
 */

const TAVILY_RESEARCH_URL = "https://api.tavily.com/research";

const COMPANY_RESEARCH_OUTPUT_SCHEMA = {
  properties: {
    businessOneLiner: {
      type: "string",
      description: "One sentence describing what the company does",
    },
    segments: {
      type: "array",
      description: "Main business segments or product lines",
      items: { type: "string" },
    },
    catalysts: {
      type: "array",
      description: "Near-term business catalysts with brief evidence",
      items: { type: "string" },
    },
    guidanceSummary: {
      type: "string",
      description: "Recent management guidance tone and key points",
    },
    competitors: {
      type: "array",
      description: "Named competitors or peers",
      items: { type: "string" },
    },
  },
  required: ["businessOneLiner"],
} as const;

const structuredContentSchema = z
  .object({
    businessOneLiner: z.string().max(500).optional(),
    segments: z.array(z.string().max(120)).max(20).optional(),
    catalysts: z.array(z.string().max(400)).max(12).optional(),
    guidanceSummary: z.string().max(1200).optional(),
    competitors: z.array(z.string().max(120)).max(20).optional(),
  })
  .passthrough();

export type TavilyResearchModel = "mini" | "pro" | "auto";

export interface TavilyCompanyResearchResult {
  ticker: string;
  businessOneLiner: string;
  segments: string[];
  catalysts: string[];
  guidanceSummary: string;
  competitors: string[];
  sources: Array<{ title: string; url: string }>;
  rawContent: string;
  model: TavilyResearchModel;
  creditsUsed: number;
  requestId: string | null;
  errors: string[];
  latencyMs: number;
}

export interface FetchTavilyCompanyResearchOptions {
  ticker: string;
  companyName?: string | null;
  model?: TavilyResearchModel;
  /** Accrue variable cost on this screening run when set. */
  runId?: string | null;
  /** Max wall time for create + poll (ms). */
  timeoutMs?: number;
  pollIntervalMs?: number;
  fetchImpl?: typeof fetch;
  sleepImpl?: (ms: number) => Promise<void>;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function estimateCredits(model: TavilyResearchModel, reported?: number): number {
  if (reported != null && Number.isFinite(reported) && reported > 0) {
    return reported;
  }
  // Mid-range estimate when API omits credits (mini 4–110, pro 15–250).
  if (model === "pro") return 50;
  if (model === "auto") return 30;
  return 20;
}

function parseStructuredContent(content: unknown): {
  businessOneLiner: string;
  segments: string[];
  catalysts: string[];
  guidanceSummary: string;
  competitors: string[];
  rawContent: string;
} {
  if (content && typeof content === "object") {
    const parsed = structuredContentSchema.safeParse(content);
    if (parsed.success) {
      return {
        businessOneLiner: (parsed.data.businessOneLiner ?? "").slice(0, 500),
        segments: (parsed.data.segments ?? []).map((s) => s.slice(0, 120)),
        catalysts: (parsed.data.catalysts ?? []).map((s) => s.slice(0, 400)),
        guidanceSummary: (parsed.data.guidanceSummary ?? "").slice(0, 1200),
        competitors: (parsed.data.competitors ?? []).map((s) => s.slice(0, 120)),
        rawContent: JSON.stringify(content).slice(0, 20_000),
      };
    }
  }
  if (typeof content === "string") {
    try {
      const asJson = JSON.parse(content) as unknown;
      if (asJson && typeof asJson === "object") {
        return parseStructuredContent(asJson);
      }
    } catch {
      // markdown report
    }
    return {
      businessOneLiner: content.slice(0, 280),
      segments: [],
      catalysts: [],
      guidanceSummary: "",
      competitors: [],
      rawContent: content.slice(0, 20_000),
    };
  }
  return {
    businessOneLiner: "",
    segments: [],
    catalysts: [],
    guidanceSummary: "",
    competitors: [],
    rawContent: "",
  };
}

export async function fetchTavilyCompanyResearch(
  opts: FetchTavilyCompanyResearchOptions,
): Promise<TavilyCompanyResearchResult> {
  const started = Date.now();
  const ticker = opts.ticker.toUpperCase().trim();
  const model: TavilyResearchModel = opts.model ?? "mini";
  const empty = (
    errors: string[],
  ): TavilyCompanyResearchResult => ({
    ticker,
    businessOneLiner: "",
    segments: [],
    catalysts: [],
    guidanceSummary: "",
    competitors: [],
    sources: [],
    rawContent: "",
    model,
    creditsUsed: 0,
    requestId: null,
    errors,
    latencyMs: Date.now() - started,
  });

  const apiKey = process.env.TAVILY_API_KEY?.trim();
  if (!apiKey) {
    recordTavilyResearchRequest("missing_key");
    return empty(["missing_api_key"]);
  }

  const fetchImpl = opts.fetchImpl ?? fetch;
  const sleepImpl = opts.sleepImpl ?? sleep;
  const timeoutMs = Math.min(Math.max(opts.timeoutMs ?? 90_000, 10_000), 170_000);
  const pollIntervalMs = Math.min(Math.max(opts.pollIntervalMs ?? 4_000, 1_000), 15_000);
  const name = (opts.companyName || ticker).trim();
  const input = `Company research for ${name} (ticker ${ticker}): business description, main segments, recent management guidance, near-term catalysts, and named competitors. Prefer SEC filings and official IR sources. Do not invent prices or investment advice.`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    accept: "application/json",
    Authorization: `Bearer ${apiKey}`,
  };

  let requestId: string | null = null;
  try {
    const createRes = await fetchImpl(TAVILY_RESEARCH_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({
        input: input.slice(0, 2000),
        model,
        stream: false,
        output_schema: COMPANY_RESEARCH_OUTPUT_SCHEMA,
        include_domains: ["sec.gov", "investor.", "businesswire.com"],
        exclude_domains: ["reddit.com", "quora.com", "seekingalpha.com/amp"],
        output_length: "short",
      }),
    });
    if (!createRes.ok) {
      const status =
        createRes.status === 429
          ? "rate_limited"
          : createRes.status === 401
            ? "unauthorized"
            : "error";
      recordTavilyResearchRequest(status);
      const errBody = (await createRes.text().catch(() => "")).slice(0, 300);
      return empty([`tavily_research_${createRes.status}:${errBody}`]);
    }
    const created = (await createRes.json().catch(() => null)) as {
      request_id?: string;
      status?: string;
    } | null;
    requestId = created?.request_id ?? null;
    if (!requestId) {
      recordTavilyResearchRequest("bad_shape");
      return empty(["tavily_research_no_request_id"]);
    }

    // If create already completed (some plans), skip poll.
    let pollBody: Record<string, unknown> | null = created as Record<
      string,
      unknown
    >;
    const deadline = started + timeoutMs;
    while (
      pollBody &&
      pollBody.status !== "completed" &&
      pollBody.status !== "failed"
    ) {
      if (Date.now() >= deadline) {
        recordTavilyResearchRequest("timeout");
        return { ...empty(["tavily_research_timeout"]), requestId };
      }
      await sleepImpl(pollIntervalMs);
      const getRes = await fetchImpl(`${TAVILY_RESEARCH_URL}/${requestId}`, {
        method: "GET",
        headers: {
          accept: "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
      });
      if (!getRes.ok) {
        if (getRes.status === 202) {
          pollBody = { status: "pending" };
          continue;
        }
        recordTavilyResearchRequest(
          getRes.status === 429 ? "rate_limited" : "error",
        );
        const errBody = (await getRes.text().catch(() => "")).slice(0, 300);
        return {
          ...empty([`tavily_research_get_${getRes.status}:${errBody}`]),
          requestId,
        };
      }
      pollBody = (await getRes.json().catch(() => null)) as Record<
        string,
        unknown
      > | null;
      if (!pollBody) {
        recordTavilyResearchRequest("bad_shape");
        return { ...empty(["tavily_research_get_bad_shape"]), requestId };
      }
    }

    if (!pollBody || pollBody.status === "failed") {
      recordTavilyResearchRequest("error");
      return {
        ...empty([
          `tavily_research_failed:${String(pollBody?.error ?? "unknown")}`,
        ]),
        requestId,
      };
    }

    const structured = parseStructuredContent(pollBody.content);
    const sourcesRaw = Array.isArray(pollBody.sources) ? pollBody.sources : [];
    const sources: Array<{ title: string; url: string }> = [];
    for (const s of sourcesRaw.slice(0, 20)) {
      if (!s || typeof s !== "object") continue;
      const url = String((s as { url?: string }).url ?? "").trim();
      const title = String((s as { title?: string }).title ?? "").trim();
      if (!url.startsWith("http")) continue;
      sources.push({
        title: (title || url).slice(0, 200),
        url: url.slice(0, 500),
      });
    }

    const creditsUsed = estimateCredits(
      model,
      Number(
        pollBody.credits ??
          pollBody.credits_used ??
          (pollBody.usage as { credits?: number } | undefined)?.credits,
      ) || undefined,
    );

    recordTavilyResearchRequest("ok");
    await accrueScreeningTavilyResearchCost({
      runId: opts.runId,
      credits: creditsUsed,
    });

    return {
      ticker,
      businessOneLiner: structured.businessOneLiner,
      segments: structured.segments,
      catalysts: structured.catalysts,
      guidanceSummary: structured.guidanceSummary,
      competitors: structured.competitors,
      sources,
      rawContent: structured.rawContent,
      model,
      creditsUsed,
      requestId,
      errors: [],
      latencyMs: Date.now() - started,
    };
  } catch (err) {
    recordTavilyResearchRequest("error");
    return {
      ...empty([err instanceof Error ? err.message : "tavily_research_error"]),
      requestId,
    };
  }
}
