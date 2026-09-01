import {
  appendEvent,
  createScreeningRun,
  insertSteps,
  linkPendingAgentOutputToRun,
} from "@/lib/db";
import { isFeatureEnabledForUser } from "@/lib/db/settings";
import { requireFeatureQuotaByUserId } from "@/lib/auth/guards";
import { refundFeatureQuota } from "@/lib/feature-quotas";
import { isScreeningNewRunsAllowed } from "@/lib/screening/provider-circuit";
import { continueScreeningRunInBackground } from "@/lib/screening/orchestrator/drain-run";
import { recordScreeningRunCreated } from "@/lib/screening/metrics";
import { THESIS_HARD_DATA_KIND } from "@/lib/screening/thesis/kinds";
import type { ScreeningBrief } from "@/lib/screening/schemas";
import { screeningBriefSchema } from "@/lib/screening/schemas";
import { runSanityLimits } from "@/lib/screening/rules/sanity-limits";

export type StartThesisAnalyzeInput = {
  userId: string;
  ticker: string;
  companyName?: string | null;
  exchange?: string | null;
  locale?: string;
};

export type StartThesisAnalyzeResult =
  | {
      ok: true;
      runId: string;
      href: string;
      ticker: string;
      companyName: string | null;
    }
  | {
      ok: false;
      code:
        | "screening_disabled"
        | "thesis_disabled"
        | "real_pipeline_required"
        | "provider_paused"
        | "quota_exceeded"
        | "invalid_brief"
        | "persist_failed";
      note: string;
    };

/**
 * Start an Analyze thesis run (attractiveness checklist) for one listing.
 * Used by Warren and any non-HTTP entrypoint; mirrors POST /api/screening/runs
 * for `intent=analyze` + `pipelineKind=thesis`.
 */
export async function startThesisAnalyzeRun(
  input: StartThesisAnalyzeInput,
): Promise<StartThesisAnalyzeResult> {
  const ticker = input.ticker.trim().toUpperCase();
  if (!ticker) {
    return {
      ok: false,
      code: "invalid_brief",
      note: "A ticker is required to start a company thesis.",
    };
  }

  const screeningEnabled = await isFeatureEnabledForUser(
    "investment_screening_enabled",
    input.userId,
  );
  if (!screeningEnabled) {
    return {
      ok: false,
      code: "screening_disabled",
      note: "Investment screening is not available on this account.",
    };
  }

  const thesisEnabled = await isFeatureEnabledForUser(
    "screening_thesis_pipeline_enabled",
    input.userId,
  );
  if (!thesisEnabled) {
    return {
      ok: false,
      code: "thesis_disabled",
      note: "The thesis pipeline is not enabled for this account.",
    };
  }

  const realPipeline = await isFeatureEnabledForUser(
    "screening_pipeline_real_enabled",
    input.userId,
  );
  if (!realPipeline) {
    return {
      ok: false,
      code: "real_pipeline_required",
      note: "Thesis Analyze requires the live screening pipeline.",
    };
  }

  if (!(await isScreeningNewRunsAllowed())) {
    return {
      ok: false,
      code: "provider_paused",
      note: "Screening is temporarily unavailable. Try again later.",
    };
  }

  const briefRaw: ScreeningBrief = {
    intent: "analyze",
    includeSectors: [],
    excludeSectors: [],
    regions: [],
    candidateCount: 1,
    criteria: [],
    endedEarly: true,
    locale: input.locale?.trim() || "en",
    riskProfile: "balanced",
    focusTicker: ticker,
    focusExchange: input.exchange?.trim() || null,
    focusCompanyName: input.companyName?.trim() || null,
    pipelineKind: "thesis",
  };

  const parsed = screeningBriefSchema.safeParse(briefRaw);
  if (!parsed.success) {
    return {
      ok: false,
      code: "invalid_brief",
      note: "Could not build a valid Analyze brief for that ticker.",
    };
  }

  const sanity = runSanityLimits(parsed.data);
  if (!sanity.ok) {
    return {
      ok: false,
      code: "invalid_brief",
      note: sanity.issues.map((i) => i.reason).join("; ") || "Brief failed validation.",
    };
  }

  const quota = await requireFeatureQuotaByUserId(
    input.userId,
    "investment_screening",
  );
  if (!quota.allowed) {
    return {
      ok: false,
      code: "quota_exceeded",
      note: "Monthly screening quota exceeded. Upgrade or try again next period.",
    };
  }
  const consumedQuota = true;

  let runRow;
  try {
    runRow = await createScreeningRun({
      userId: input.userId,
      status: "authorized",
      intent: "analyze",
      briefJson: JSON.stringify(parsed.data),
      mockedPipeline: false,
      pipelineKind: "thesis",
    });
  } catch (err) {
    console.error(
      "[startThesisAnalyzeRun] persist failed",
      err instanceof Error ? err.message : err,
    );
    if (consumedQuota) await refundFeatureQuota(input.userId, "investment_screening");
    return {
      ok: false,
      code: "persist_failed",
      note: "Could not create the thesis run. Try again in a moment.",
    };
  }

  try {
    const hardDataStepId = crypto.randomUUID();
    await insertSteps(runRow.id, [
      { id: hardDataStepId, agentKind: THESIS_HARD_DATA_KIND },
    ]);
  } catch (err) {
    console.error(
      "[startThesisAnalyzeRun] insertSteps failed",
      err instanceof Error ? err.message : err,
    );
    if (consumedQuota) await refundFeatureQuota(input.userId, "investment_screening");
    return {
      ok: false,
      code: "persist_failed",
      note: "Could not queue thesis agents. Try again in a moment.",
    };
  }

  try {
    await appendEvent({
      runId: runRow.id,
      eventType: "RunAuthorized",
      payload: { intent: "analyze", source: "warren" },
    });
  } catch {
    // best-effort
  }

  try {
    await linkPendingAgentOutputToRun({
      userId: input.userId,
      agentKind: "intake",
      runId: runRow.id,
      withinMinutes: 60,
    });
  } catch {
    // best-effort
  }

  recordScreeningRunCreated("analyze", false);
  continueScreeningRunInBackground(runRow.id);

  return {
    ok: true,
    runId: runRow.id,
    href: `/screening/runs/${encodeURIComponent(runRow.id)}`,
    ticker,
    companyName: parsed.data.focusCompanyName ?? null,
  };
}
