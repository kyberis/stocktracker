import { z } from "zod";

/**
 * Contract shared by the mock stage (E0) and the real agent pipeline.
 *
 * Mirrors HLD §5.3 (`screening_reports.report_json`). Stages E2+ replace the
 * fixture behind the API routes without touching these shapes, so anything the
 * UI reads must be declared here first.
 */

export const SCREENING_INTENTS = ["rebalance", "explore"] as const;
export type ScreeningIntent = (typeof SCREENING_INTENTS)[number];

/** First-screen product analytics (entry + discovery). Dual-written to GA + DB. */
export const SCREENING_ENTRY_EVENTS = [
  "screening_discovery_opened",
  "screening_entry_viewed",
  "screening_entry_cta_clicked",
  "screening_entry_back_home",
] as const;
export type ScreeningEntryEvent = (typeof SCREENING_ENTRY_EVENTS)[number];

export const SCREENING_ENTRY_VARIANTS = ["empty", "overexposed", "balanced"] as const;
export type ScreeningEntryVariant = (typeof SCREENING_ENTRY_VARIANTS)[number];

export const SCREENING_ENTRY_PREVIEW_MODES = ["live", "fixture"] as const;
export type ScreeningEntryPreviewMode = (typeof SCREENING_ENTRY_PREVIEW_MODES)[number];

export const screeningEntryEventBodySchema = z.object({
  event: z.enum(SCREENING_ENTRY_EVENTS),
  metadata: z.record(z.string(), z.string().max(128)).optional(),
});
export type ScreeningEntryEventBody = z.infer<typeof screeningEntryEventBodySchema>;

/** Where a brief value came from — surfaced to the user so presets are never silent. */
export const BRIEF_SOURCES = ["chat", "preset", "rebalance", "confirmed"] as const;
export type BriefSource = (typeof BRIEF_SOURCES)[number];

export const briefCriterionSchema = z.object({
  /** Stable key of the filter, e.g. "marketCap" or "netDebtEbitda". */
  key: z.string().min(1).max(64),
  /** Human-readable condition as shown in the brief, e.g. "< 2.5x". */
  condition: z.string().min(1).max(120),
  source: z.enum(BRIEF_SOURCES),
});
export type BriefCriterion = z.infer<typeof briefCriterionSchema>;

export const screeningBriefSchema = z.object({
  intent: z.enum(SCREENING_INTENTS),
  /** Sectors to look for. Empty = no sector preference. */
  includeSectors: z.array(z.string().min(1).max(64)).max(20).default([]),
  excludeSectors: z.array(z.string().min(1).max(64)).max(20).default([]),
  regions: z.array(z.string().min(1).max(64)).max(20).default([]),
  candidateCount: z.number().int().min(3).max(5).default(5),
  criteria: z.array(briefCriterionSchema).max(30).default([]),
  /** True when the user cut the chat short and presets filled the gaps. */
  endedEarly: z.boolean().default(false),
  locale: z.string().min(2).max(10).default("es"),
});
export type ScreeningBrief = z.infer<typeof screeningBriefSchema>;

/** Intake agent turn output. Never trusted directly — always parsed with this. */
export const INTAKE_AGENT_STATUSES = [
  "ok",
  "needs_clarification",
  "rejected_infeasible",
  "rejected_shape",
] as const;
export type IntakeAgentStatus = (typeof INTAKE_AGENT_STATUSES)[number];

export const intakeAgentOutputSchema = z.object({
  status: z.enum(INTAKE_AGENT_STATUSES),
  assistantText: z.string().min(1).max(2000),
  brief: screeningBriefSchema,
  questions: z.array(z.string().min(1).max(300)).max(3).default([]),
  /** Recommended answers shown as chips. Prefer these over silent preset fills. */
  suggestions: z
    .array(
      z.object({
        label: z.string().min(1).max(80),
        say: z.string().min(1).max(200),
      }),
    )
    .max(5)
    .default([]),
  warnings: z.array(z.string().min(1).max(300)).max(10).default([]),
  inferredFields: z.array(z.string().min(1).max(64)).max(20).default([]),
});
export type IntakeAgentOutput = z.infer<typeof intakeAgentOutputSchema>;

/** Body accepted by POST /api/screening/intake/chat. */
export const intakeChatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
});
export const intakeChatRequestSchema = z.object({
  intent: z.enum(SCREENING_INTENTS),
  locale: z.string().min(2).max(10).default("es"),
  messages: z.array(intakeChatMessageSchema).min(1).max(40),
  brief: screeningBriefSchema.partial().optional(),
  suggestedInclude: z.array(z.string().min(1).max(64)).max(10).default([]),
  suggestedExclude: z.array(z.string().min(1).max(64)).max(10).default([]),
});
export type IntakeChatRequest = z.infer<typeof intakeChatRequestSchema>;

export const SCREENING_RUN_STATUSES = [
  "queued",
  "running",
  "completed",
  "failed",
] as const;
export type ScreeningRunStatus = (typeof SCREENING_RUN_STATUSES)[number];

export const SCREENING_STEP_STATUSES = [
  "pending",
  "running",
  "done",
  "failed",
  "skipped",
] as const;
export type ScreeningStepStatus = (typeof SCREENING_STEP_STATUSES)[number];

export const screeningRunStepSchema = z.object({
  /** Matches the future `agent_kind` so Dev Lab and this UI speak the same language. */
  agentKind: z.string().min(1),
  status: z.enum(SCREENING_STEP_STATUSES),
  /** Seconds; null while pending. */
  elapsedSeconds: z.number().nonnegative().nullable(),
});
export type ScreeningRunStep = z.infer<typeof screeningRunStepSchema>;

export const screeningRunSchema = z.object({
  runId: z.string().min(1),
  mode: z.enum(["user_report", "daily_screen"]),
  status: z.enum(SCREENING_RUN_STATUSES),
  createdAt: z.string().min(1),
  steps: z.array(screeningRunStepSchema),
  /** 0–100, derived from completed steps. */
  progressPct: z.number().min(0).max(100),
  /** True while the pipeline is mocked — the UI must say so out loud. */
  mocked: z.boolean(),
  reportReady: z.boolean(),
});
export type ScreeningRun = z.infer<typeof screeningRunSchema>;

export const sourceRefSchema = z.object({
  url: z.string().url(),
  asOf: z.string().min(1),
  field: z.string().min(1),
  label: z.string().min(1).optional(),
});
export type SourceRef = z.infer<typeof sourceRefSchema>;

export const candidateBusinessSchema = z.object({
  /** LLM prose condensed from the provider description. No figures. */
  summary: z.string().min(1),
  employees: z.number().int().positive().nullable(),
  listedSince: z.number().int().nullable(),
  /** Provider field only. A hallucinated link is a phishing vector. */
  website: z.string().url().nullable(),
  irUrl: z.string().url().nullable(),
  filings: z
    .object({ label: z.string().min(1), url: z.string().url() })
    .nullable(),
});
export type CandidateBusiness = z.infer<typeof candidateBusinessSchema>;

export const screeningCandidateCardSchema = z.object({
  ticker: z.string().min(1),
  companyName: z.string().min(1),
  sector: z.string().min(1),
  country: z.string().min(1),
  business: candidateBusinessSchema.nullable(),
  mktCapUsd: z.number().nullable(),
  currency: z.string().min(1),
  price: z.number(),
  priceAsOf: z.string().min(1),
  targetPrice: z.number().nullable(),
  upsidePct: z.number().nullable(),
  score: z.number().nullable(),
  verdict: z.enum(["fuerte", "watch", "pass", "fail"]).nullable(),
  /** Ids from SCREENING_CRITERIA — resolved to names by the UI. */
  stepsPassed: z.array(z.number().int()),
  stepsFailed: z.array(z.number().int()),
  catalyst: z.string().nullable(),
  catalystDate: z.string().nullable(),
  multiples: z.object({
    fwdPe: z.number().nullable(),
    ownHistPe: z.number().nullable(),
    peerPe: z.number().nullable(),
    evEbitda: z.number().nullable(),
    ndEbitda: z.number().nullable(),
    growthNote: z.string().nullable(),
  }),
  flags: z.object({
    netCash: z.boolean().nullable(),
    buyback: z.boolean().nullable(),
    dividendYield: z.number().nullable(),
    moatScore: z.number().nullable(),
  }),
  thesis: z.string().min(1),
  risks: z.array(z.string()),
  priorityReason: z.string(),
  citedFields: z.array(z.string()),
  sources: z.array(sourceRefSchema),
  illustrativeAllocation: z.string().optional(),
  positionKind: z.enum(["new_position", "top_up_existing"]).optional(),
});
export type ScreeningCandidateCard = z.infer<typeof screeningCandidateCardSchema>;

export const screeningReportSchema = z.object({
  jobId: z.string().min(1),
  mode: z.enum(["user_report", "daily_screen"]),
  locale: z.string().min(2),
  generatedAt: z.string().min(1),
  methodologyNote: z.string().min(1),
  executiveSummary: z.string().min(1),
  priorityOrder: z.array(z.string()),
  comparisonRows: z.array(
    z.object({
      ticker: z.string().min(1),
      companyName: z.string().min(1),
      valuationNote: z.string(),
      growthNote: z.string(),
      score: z.number().nullable(),
      verdict: z.string().nullable(),
    }),
  ),
  cards: z.array(screeningCandidateCardSchema).min(1).max(5),
  disclaimer: z.string().min(1),
  partial: z.boolean(),
  pendingAgentKinds: z.array(z.string()),
});
export type ScreeningReport = z.infer<typeof screeningReportSchema>;

/* ── Hard Data agent (HLD §4.5, Agent 1) ──────────────────────────────── */

export const hardDataCandidateSchema = z.object({
  ticker: z.string().min(1).max(20),
  name: z.string().max(200).default(""),
  sector: z.string().max(120).nullable().default(null),
  industry: z.string().max(120).nullable().default(null),
  country: z.string().max(10).nullable().default(null),
  marketCapUsd: z.number().finite().nullable().default(null),
  price: z.number().finite().nullable().default(null),
  /** 0..100, higher is a stronger fit. */
  rankScore: z.number().min(0).max(100),
  /** Short locale-aware sentence, no prices or targets. */
  rankReason: z.string().min(1).max(280),
});
export type HardDataCandidate = z.infer<typeof hardDataCandidateSchema>;

export const HARD_DATA_STATUSES = ["ok", "empty"] as const;
export type HardDataStatus = (typeof HARD_DATA_STATUSES)[number];

export const hardDataOutputSchema = z.object({
  status: z.enum(HARD_DATA_STATUSES),
  universeSize: z.number().int().min(0),
  candidates: z.array(hardDataCandidateSchema).max(15),
  deferredTickers: z.array(z.string().min(1).max(20)).max(20).default([]),
  gaps: z.array(z.string().min(1).max(200)).max(8).default([]),
  locale: z.string().min(2).max(10),
});
export type HardDataOutput = z.infer<typeof hardDataOutputSchema>;

/* ── Compiler agent (HLD §4.5, Agent 6 / Compiler) ────────────────────── */

export const compilerBulletSchema = z.object({
  ticker: z.string().min(1).max(20),
  headline: z.string().min(1).max(120),
  bullet: z.string().min(1).max(320),
});
export type CompilerBullet = z.infer<typeof compilerBulletSchema>;

export const compilerReportDraftSchema = z.object({
  summary: z.string().min(1).max(2000),
  candidateBullets: z.array(compilerBulletSchema).max(10),
  disclaimer: z.string().min(1).max(500),
  locale: z.string().min(2).max(10),
});
export type CompilerReportDraft = z.infer<typeof compilerReportDraftSchema>;
