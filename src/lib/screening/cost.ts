/**
 * Per-report variable ops cost for investment screening.
 *
 * Included: LLM tokens + Tavily Search / Research credits.
 * Excluded: FMP (fixed monthly plan), Vercel/Turso/etc.
 */

import { z } from "zod";
import { calcAiLogCost } from "@/lib/db/ai-logs";
import {
  getScreeningRunUnscoped,
  updateScreeningRunCost,
} from "@/lib/db/screening";
import { recordScreeningCostBudgetExceeded } from "@/lib/screening/metrics";

/** Pay-as-you-go default; override with TAVILY_CREDIT_USD. */
export const DEFAULT_TAVILY_CREDIT_USD = 0.008;

/** Soft ops budget per completed run (PRD web+LLM band). */
export const SCREENING_COST_BUDGET_USD = 1.2;

export const screeningCostBreakdownSchema = z.object({
  currency: z.literal("USD").default("USD"),
  llmUsd: z.number().nonnegative().default(0),
  tavilySearchUsd: z.number().nonnegative().default(0),
  tavilyResearchUsd: z.number().nonnegative().default(0),
  tavilySearchCredits: z.number().nonnegative().default(0),
  tavilyResearchCredits: z.number().nonnegative().default(0),
  llmTokensIn: z.number().nonnegative().default(0),
  llmTokensOut: z.number().nonnegative().default(0),
});
export type ScreeningCostBreakdown = z.infer<typeof screeningCostBreakdownSchema>;

export function emptyScreeningCostBreakdown(): ScreeningCostBreakdown {
  return {
    currency: "USD",
    llmUsd: 0,
    tavilySearchUsd: 0,
    tavilyResearchUsd: 0,
    tavilySearchCredits: 0,
    tavilyResearchCredits: 0,
    llmTokensIn: 0,
    llmTokensOut: 0,
  };
}

export function parseScreeningCostJson(raw: string | null | undefined): ScreeningCostBreakdown {
  if (!raw || !raw.trim()) return emptyScreeningCostBreakdown();
  try {
    const parsed = screeningCostBreakdownSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : emptyScreeningCostBreakdown();
  } catch {
    return emptyScreeningCostBreakdown();
  }
}

export function totalScreeningCostUsd(b: ScreeningCostBreakdown): number {
  return roundUsd(b.llmUsd + b.tavilySearchUsd + b.tavilyResearchUsd);
}

export function tavilyCreditUsd(): number {
  const raw = process.env.TAVILY_CREDIT_USD?.trim();
  if (!raw) return DEFAULT_TAVILY_CREDIT_USD;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_TAVILY_CREDIT_USD;
}

export function roundUsd(n: number): number {
  return Math.round(n * 1_000_000) / 1_000_000;
}

function mergeBreakdown(
  base: ScreeningCostBreakdown,
  delta: Partial<ScreeningCostBreakdown>,
): ScreeningCostBreakdown {
  return {
    currency: "USD",
    llmUsd: roundUsd(base.llmUsd + (delta.llmUsd ?? 0)),
    tavilySearchUsd: roundUsd(base.tavilySearchUsd + (delta.tavilySearchUsd ?? 0)),
    tavilyResearchUsd: roundUsd(
      base.tavilyResearchUsd + (delta.tavilyResearchUsd ?? 0),
    ),
    tavilySearchCredits: base.tavilySearchCredits + (delta.tavilySearchCredits ?? 0),
    tavilyResearchCredits:
      base.tavilyResearchCredits + (delta.tavilyResearchCredits ?? 0),
    llmTokensIn: base.llmTokensIn + (delta.llmTokensIn ?? 0),
    llmTokensOut: base.llmTokensOut + (delta.llmTokensOut ?? 0),
  };
}

/**
 * Atomically accrue a cost delta onto a screening run. Fail-open on DB errors.
 */
export async function accrueScreeningRunCost(
  runId: string,
  delta: Partial<ScreeningCostBreakdown>,
): Promise<ScreeningCostBreakdown | null> {
  try {
    const run = await getScreeningRunUnscoped(runId);
    if (!run) return null;
    const next = mergeBreakdown(run.costBreakdown, delta);
    const total = totalScreeningCostUsd(next);
    await updateScreeningRunCost(runId, run.userId, total, next);
    if (total > SCREENING_COST_BUDGET_USD) {
      recordScreeningCostBudgetExceeded(total);
    }
    return next;
  } catch (err) {
    console.error(
      "[screening/cost] accrue failed",
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

export async function accrueScreeningLlmCost(opts: {
  runId: string | null | undefined;
  model: string;
  tokensInput: number;
  tokensOutput: number;
}): Promise<void> {
  if (!opts.runId) return;
  const tokensInput = Math.max(0, Math.round(opts.tokensInput));
  const tokensOutput = Math.max(0, Math.round(opts.tokensOutput));
  if (tokensInput === 0 && tokensOutput === 0) return;
  const llmUsd = calcAiLogCost(opts.model, tokensInput, tokensOutput);
  await accrueScreeningRunCost(opts.runId, {
    llmUsd,
    llmTokensIn: tokensInput,
    llmTokensOut: tokensOutput,
  });
}

export async function accrueScreeningTavilySearchCost(opts: {
  runId: string | null | undefined;
  /** basic=1, advanced=2 */
  credits?: number;
}): Promise<void> {
  if (!opts.runId) return;
  const credits = Math.max(0, opts.credits ?? 1);
  if (credits === 0) return;
  await accrueScreeningRunCost(opts.runId, {
    tavilySearchCredits: credits,
    tavilySearchUsd: roundUsd(credits * tavilyCreditUsd()),
  });
}

export async function accrueScreeningTavilyResearchCost(opts: {
  runId: string | null | undefined;
  credits: number;
}): Promise<void> {
  if (!opts.runId) return;
  const credits = Math.max(0, opts.credits);
  if (credits === 0) return;
  await accrueScreeningRunCost(opts.runId, {
    tavilyResearchCredits: credits,
    tavilyResearchUsd: roundUsd(credits * tavilyCreditUsd()),
  });
}
