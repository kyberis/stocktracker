import { z } from "zod";

/**
 * Contract shared by the mock stage (E0) and the real agent pipeline.
 *
 * Mirrors HLD §5.3 (`screening_reports.report_json`). Stages E2+ replace the
 * fixture behind the API routes without touching these shapes, so anything the
 * UI reads must be declared here first.
 */

export const SCREENING_INTENTS = ["rebalance", "explore", "analyze"] as const;
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

export const SCREENING_RISK_PROFILES = [
  "conservative",
  "balanced",
  "aggressive",
] as const;
export type ScreeningRiskProfile = (typeof SCREENING_RISK_PROFILES)[number];

/** Base brief object — use `.partial()` on this for intake drafts. */
export const screeningBriefObjectSchema = z.object({
  intent: z.enum(SCREENING_INTENTS),
  /** Sectors to look for. Empty = no sector preference. */
  includeSectors: z.array(z.string().min(1).max(64)).max(20).default([]),
  excludeSectors: z.array(z.string().min(1).max(64)).max(20).default([]),
  regions: z.array(z.string().min(1).max(64)).max(20).default([]),
  /**
   * Final shortlist size. Explore/rebalance: 3–5 (product always uses 5).
   * Analyze (single company): always 1.
   */
  candidateCount: z.number().int().min(1).max(5).default(5),
  criteria: z.array(briefCriterionSchema).max(30).default([]),
  /** True when the user cut the chat short and presets filled the gaps. */
  endedEarly: z.boolean().default(false),
  locale: z.string().min(2).max(10).default("es"),
  /**
   * Risk / suitability profile for Agent 5. Null until the user answers
   * (or early-exit fills "balanced").
   */
  riskProfile: z.enum(SCREENING_RISK_PROFILES).nullable().default(null),
  /**
   * Single-company analyze intent: resolved listing. Null for screen intents.
   * Symbol is the Yahoo/FMP ticker (e.g. SAP.DE); exchange is a short label
   * shown in the UI (e.g. XETRA / GER).
   */
  focusTicker: z.string().min(1).max(20).nullable().optional(),
  focusExchange: z.string().min(1).max(40).nullable().optional(),
  focusCompanyName: z.string().min(1).max(200).nullable().optional(),
});

/** Fully validated brief ready to authorize a run. */
export const screeningBriefSchema = screeningBriefObjectSchema.superRefine(
  (brief, ctx) => {
    if (brief.intent === "analyze") {
      if (!brief.focusTicker) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["focusTicker"],
          message: "analyze intent requires focusTicker",
        });
      }
      if (brief.candidateCount !== 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["candidateCount"],
          message: "analyze intent requires candidateCount = 1",
        });
      }
    } else if (brief.candidateCount < 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["candidateCount"],
        message: "screen intents require candidateCount between 3 and 5",
      });
    }
  },
);
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
  brief: screeningBriefObjectSchema.partial().optional(),
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
  /** For fan-out kinds (IR × N tickers): total sub-steps and how many are done. */
  subStepsTotal: z.number().int().nonnegative().optional(),
  subStepsDone: z.number().int().nonnegative().optional(),
  /** Present when the step (or a fan-out sibling) failed. */
  errorMessage: z.string().max(500).nullable().optional(),
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
  /**
   * Latest step/run update timestamp (ISO). Used by the progress UI to prove
   * the pipeline is alive and to detect stalls.
   */
  lastActivityAt: z.string().min(1).nullable().optional(),
  /**
   * Server-side liveness hint while the run is still in progress.
   * - ok: recent activity
   * - stale: no updates for a while (still may recover)
   * - stuck: no updates long enough that the UI should offer resume / error
   */
  stallState: z.enum(["ok", "stale", "stuck"]).optional(),
  /**
   * QA round context. Present only when QA gating is on for the user. Lets the
   * progress UI show "Verifying (round N of 2)" while QA is running or between
   * rounds. `roundsCompleted` counts persisted `screening_qa_rounds` rows.
   */
  qa: z
    .object({
      gating: z.boolean(),
      verdict: z
        .enum(["pass", "fail", "pass_with_degradation"])
        .nullable(),
      roundsCompleted: z.number().int().min(0),
      maxRounds: z.number().int().min(1),
    })
    .nullable()
    .optional(),
});
export type ScreeningRun = z.infer<typeof screeningRunSchema>;

/** No step updates for this long → "still working, but quiet". */
export const SCREENING_STALE_MS = 60_000;
/** No step updates for this long → treat as stuck and offer resume. */
export const SCREENING_STUCK_MS = 2 * 60_000 + 30_000;

/** Compact row for the entry-page history list. */
export const screeningRunListItemSchema = z.object({
  runId: z.string().min(1),
  intent: z.enum(SCREENING_INTENTS),
  status: z.enum(SCREENING_RUN_STATUSES),
  createdAt: z.string().min(1),
  mocked: z.boolean(),
  /** Short label derived from the brief (sectors / region). */
  summary: z.string().max(160),
  candidateCount: z.number().int().min(0).max(5).nullable(),
  reportReady: z.boolean(),
});
export type ScreeningRunListItem = z.infer<typeof screeningRunListItemSchema>;

export const screeningRunListResponseSchema = z.object({
  runs: z.array(screeningRunListItemSchema),
});
export type ScreeningRunListResponse = z.infer<typeof screeningRunListResponseSchema>;

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
  /** IR Agent 2 one-liner (HLD §4.5). Optional until E4+. */
  businessOneLiner: z.string().max(280).optional(),
  /** IR guidance block. Optional until E4+. */
  guidance: z
    .object({
      summary: z.string().max(500),
      direction: z.enum(["up", "flat", "down", "unclear"]),
      asOf: z.string().max(40),
    })
    .nullable()
    .optional(),
  /** IR catalysts list (plural). Coexists with singular `catalyst` for compat. */
  catalystsList: z
    .array(
      z.object({
        label: z.string().max(120),
        evidence: z.string().max(400),
      }),
    )
    .max(8)
    .optional(),
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
  thesis: z.string().min(1).max(4000),
  risks: z.array(z.string()),
  priorityReason: z.string(),
  citedFields: z.array(z.string()),
  sources: z.array(sourceRefSchema),
  illustrativeAllocation: z.string().optional(),
  positionKind: z.enum(["new_position", "top_up_existing"]).optional(),
  /** Web & Sentiment (E5). */
  sentimentSummary: z.string().max(500).optional(),
  webSignals: z
    .array(
      z.object({
        kind: z.enum(["tailwind", "headwind", "neutral", "noise"]),
        claim: z.string().max(280),
        confirmation: z.enum(["confirmed", "single_source_unconfirmed"]),
      }),
    )
    .max(3)
    .optional(),
  insiderBias: z.enum(["buying", "selling", "mixed", "none"]).optional(),
  /** Portfolio Context (E6). */
  topUpTicker: z.string().max(20).nullable().optional(),
  illustrativeAllocationEur: z
    .object({
      min: z.number().finite(),
      max: z.number().finite(),
    })
    .nullable()
    .optional(),
  /** Risk & Suitability (E7). */
  riskFlags: z.array(z.string().max(200)).max(8).optional(),
  suitability: z.enum(["fit", "stretch", "poor_fit"]).nullable().optional(),
  illustrativeWeightPct: z.number().finite().nullable().optional(),
  concentrationImpact: z.string().max(400).nullable().optional(),
  /** Technicals (Phase 2). Deterministic; absent when FMP OHLC is missing. */
  technicals: z
    .object({
      distanceTo52wHighPct: z.number().finite().nullable(),
      distanceTo52wLowPct: z.number().finite().nullable(),
      ma50: z.number().finite().nullable(),
      ma200: z.number().finite().nullable(),
      aboveMa200: z.boolean().nullable(),
      support: z.number().finite().nullable(),
      resistance: z.number().finite().nullable(),
      return3mPct: z.number().finite().nullable(),
      return1yPct: z.number().finite().nullable(),
      volatilityAnnPct: z.number().finite().nullable(),
      nearHigh: z.boolean().nullable(),
    })
    .nullable()
    .optional(),
  /**
   * QA verification (Agent 6). Absent when QA hasn't run for this ticker or
   * when the flag is off. `unsupportedClaims[]` lists short human-readable
   * summaries of issues flagged for this specific ticker.
   */
  qa: z
    .object({
      verified: z.boolean(),
      unsupportedClaims: z.array(z.string().max(400)).max(8),
    })
    .nullable()
    .optional(),
  /** Brief expectations this ticker missed (shown when it misses the majority). */
  unmetBriefCriteria: z.array(z.string().max(200)).max(12).optional(),
  meetsMajorityBrief: z.boolean().optional(),
  briefCriteriaMet: z.number().int().min(0).max(20).optional(),
  briefCriteriaTotal: z.number().int().min(0).max(20).optional(),
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
  cards: z.array(screeningCandidateCardSchema).min(0).max(5),
  disclaimer: z.string().min(1),
  partial: z.boolean(),
  pendingAgentKinds: z.array(z.string()),
  /**
   * QA verification summary. Present after QA has run; null when QA is
   * disabled or still pending. `degradedTickers[]` lists tickers that still
   * had blocking issues after directed retry — usually omitted from `cards`,
   * but kept when omitting them would leave an empty report (e.g. analyze).
   */
  verification: z
    .object({
      verdict: z.enum(["pass", "fail", "pass_with_degradation"]),
      roundNumber: z.number().int().min(1).max(3),
      issueCount: z.number().int().min(0).max(200),
      blockingIssueCount: z.number().int().min(0).max(200),
      degradedTickers: z.array(z.string().max(20)).max(15),
    })
    .nullable()
    .optional(),
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
  /** Optional report enrichment (FMP + trefolio MOAT /analisis). */
  currency: z.string().max(8).nullable().optional(),
  fwdPe: z.number().finite().nullable().optional(),
  ownHistPe: z.number().finite().nullable().optional(),
  /** P/E on latest FY diluted EPS when TTM quality is suspect. */
  normalizedPe: z.number().finite().nullable().optional(),
  /** True when TTM earnings look inflated vs FY (one-offs). */
  earningsQualitySuspect: z.boolean().nullable().optional(),
  evEbitda: z.number().finite().nullable().optional(),
  ndEbitda: z.number().finite().nullable().optional(),
  dividendYield: z.number().finite().nullable().optional(),
  netCash: z.boolean().nullable().optional(),
  targetPrice: z.number().finite().nullable().optional(),
  upsidePct: z.number().finite().nullable().optional(),
  moatScore: z.number().finite().nullable().optional(),
  moatVerdict: z.string().max(40).nullable().optional(),
  analysisSummary: z.string().max(400).nullable().optional(),
  growthNote: z.string().max(120).nullable().optional(),
  valuationNote: z.string().max(120).nullable().optional(),
  /**
   * Last 5y annual revenue growth (percent points, most recent first). Used to
   * score criterion 4 (earnings resilience) deterministically at compose time.
   */
  revenueGrowthHistoryPct: z
    .array(z.number().finite())
    .max(10)
    .nullable()
    .optional(),
  /**
   * Deterministic earnings-resilience verdict: `true` when no year in the last
   * 5 had revenue growth < -10% AND the mean is non-negative.
   */
  earningsResilient: z.boolean().nullable().optional(),
  /** Deterministic checklist score 0–8 after enrichment. */
  checklistScore: z.number().int().min(0).max(8).nullable().optional(),
  stepsPassed: z.array(z.number().int()).max(9).optional(),
  stepsFailed: z.array(z.number().int()).max(9).optional(),
  reportVerdict: z.enum(["fuerte", "watch", "pass", "fail"]).nullable().optional(),
  /** How many brief criteria we could evaluate numerically. */
  briefCriteriaTotal: z.number().int().min(0).max(20).optional(),
  /** How many of those evaluated criteria the ticker met. */
  briefCriteriaMet: z.number().int().min(0).max(20).optional(),
  /** True when metCount >= ceil(total/2). */
  meetsMajorityBrief: z.boolean().optional(),
  /** Human-readable brief expectations this ticker missed. */
  unmetBriefCriteria: z.array(z.string().max(200)).max(12).optional(),
});
export type HardDataCandidate = z.infer<typeof hardDataCandidateSchema>;

export const HARD_DATA_STATUSES = ["ok", "empty"] as const;
export type HardDataStatus = (typeof HARD_DATA_STATUSES)[number];

export const hardDataSourceSchema = z.object({
  label: z.string().min(1).max(120),
  url: z.string().max(500).optional().default(""),
  asOf: z.string().max(40).optional().default(""),
});
export type HardDataSource = z.infer<typeof hardDataSourceSchema>;

export const hardDataOutputSchema = z.object({
  status: z.enum(HARD_DATA_STATUSES),
  universeSize: z.number().int().min(0),
  candidates: z.array(hardDataCandidateSchema).max(20),
  deferredTickers: z.array(z.string().min(1).max(20)).max(20).default([]),
  gaps: z.array(z.string().min(1).max(200)).max(8).default([]),
  locale: z.string().min(2).max(10),
  /** Data providers consulted (Dev log + QA citations). */
  sources: z.array(hardDataSourceSchema).max(12).default([]),
});
export type HardDataOutput = z.infer<typeof hardDataOutputSchema>;

/* ── Compiler agent (HLD §4.5, Agent 6 / Compiler) ────────────────────── */

export const compilerBulletSchema = z.object({
  ticker: z.string().min(1).max(20),
  headline: z.string().min(1).max(120),
  bullet: z.string().min(1).max(4000),
});
export type CompilerBullet = z.infer<typeof compilerBulletSchema>;

export const compilerReportDraftSchema = z.object({
  summary: z.string().min(1).max(2000),
  candidateBullets: z.array(compilerBulletSchema).max(10),
  disclaimer: z.string().min(1).max(500),
  locale: z.string().min(2).max(10),
});
export type CompilerReportDraft = z.infer<typeof compilerReportDraftSchema>;

/* ── IR / Business agent (HLD §4.5, Agent 2) ─────────────────────────── */

export const irSourceSchema = z.object({
  url: z.string().max(500).default(""),
  asOf: z.string().max(40).default(""),
  label: z.string().max(120).optional(),
});
export type IrSource = z.infer<typeof irSourceSchema>;

export const irGuidanceSchema = z.object({
  summary: z.string().min(1).max(500),
  direction: z.enum(["up", "flat", "down", "unclear"]),
  asOf: z.string().min(1).max(40),
  sources: z.array(irSourceSchema).max(6).default([]),
});
export type IrGuidance = z.infer<typeof irGuidanceSchema>;

export const irCatalystSchema = z.object({
  label: z.string().min(1).max(120),
  evidence: z.string().min(1).max(400),
  sources: z.array(irSourceSchema).max(4).default([]),
});
export type IrCatalyst = z.infer<typeof irCatalystSchema>;

export const irBusinessOutputSchema = z.object({
  ticker: z.string().min(1).max(20),
  businessOneLiner: z.string().min(1).max(280),
  guidance: irGuidanceSchema,
  catalysts: z.array(irCatalystSchema).max(8).default([]),
  segments: z.array(z.string().min(1).max(80)).max(12).default([]),
  contradictionWithHardData: z.boolean().default(false),
  confidence: z.enum(["high", "medium", "low"]).default("medium"),
  bullets: z.array(z.string().min(1).max(280)).min(1).max(5),
  gaps: z.array(z.string().min(1).max(200)).max(8).default([]),
});
export type IrBusinessOutput = z.infer<typeof irBusinessOutputSchema>;

export const aggregateIrBusinessOutputSchema = z.object({
  tickers: z.array(irBusinessOutputSchema).max(20),
  generatedAt: z.string().min(1),
});
export type AggregateIrBusinessOutput = z.infer<
  typeof aggregateIrBusinessOutputSchema
>;

/* ── Web & Sentiment agent (HLD §4.5, Agent 3) ───────────────────────── */

export const webSignalSchema = z.object({
  kind: z.enum(["tailwind", "headwind", "neutral", "noise"]),
  claim: z.string().min(1).max(280),
  confirmation: z.enum(["confirmed", "single_source_unconfirmed"]),
  sources: z.array(irSourceSchema).max(6).default([]),
});
export type WebSignal = z.infer<typeof webSignalSchema>;

export const webInsiderSummarySchema = z.object({
  netBias: z.enum(["buying", "selling", "mixed", "none"]),
  notes: z.string().min(1).max(500),
  sources: z.array(irSourceSchema).max(6).default([]),
});
export type WebInsiderSummary = z.infer<typeof webInsiderSummarySchema>;

export const webSentimentOutputSchema = z.object({
  ticker: z.string().min(1).max(20),
  signals: z.array(webSignalSchema).max(12).default([]),
  insiderSummary: webInsiderSummarySchema,
  sentimentSummary: z.string().min(1).max(500),
  gaps: z.array(z.string().min(1).max(200)).max(8).default([]),
});
export type WebSentimentOutput = z.infer<typeof webSentimentOutputSchema>;

export const aggregateWebSentimentOutputSchema = z.object({
  tickers: z.array(webSentimentOutputSchema).max(20),
  generatedAt: z.string().min(1),
});
export type AggregateWebSentimentOutput = z.infer<
  typeof aggregateWebSentimentOutputSchema
>;

/* ── Portfolio Context agent (HLD §4.5, Agent 4) ─────────────────────── */

export const portfolioSectorGapSchema = z.object({
  sector: z.string().min(1).max(80),
  currentPct: z.number().finite(),
  targetPct: z.number().finite().nullable(),
  gapPct: z.number().finite(),
});
export type PortfolioSectorGap = z.infer<typeof portfolioSectorGapSchema>;

export const portfolioPerCandidateSchema = z.object({
  ticker: z.string().min(1).max(20),
  positionKind: z.enum(["new_position", "top_up_existing"]),
  topUpTicker: z.string().max(20).nullable().default(null),
  overlapNotes: z.string().max(400).default(""),
  illustrativeAllocationEur: z.object({
    min: z.number().finite().nonnegative(),
    max: z.number().finite().nonnegative(),
  }),
  rationale: z.string().min(1).max(400),
});
export type PortfolioPerCandidate = z.infer<typeof portfolioPerCandidateSchema>;

export const portfolioContextOutputSchema = z.object({
  sectorGaps: z.array(portfolioSectorGapSchema).max(12).default([]),
  perCandidate: z.array(portfolioPerCandidateSchema).max(20).default([]),
  cashAvailableEur: z.number().finite().nonnegative().default(0),
  gaps: z.array(z.string().min(1).max(200)).max(8).default([]),
});
export type PortfolioContextOutput = z.infer<typeof portfolioContextOutputSchema>;

/* ── Risk & Suitability agent (HLD §4.5, Agent 5) ────────────────────── */

export const riskPerCandidateSchema = z.object({
  ticker: z.string().min(1).max(20),
  illustrativeWeightPct: z.number().finite().min(0).max(100),
  concentrationImpact: z.string().min(1).max(400),
  riskFlags: z.array(z.string().min(1).max(200)).max(8).default([]),
  suitability: z.enum(["fit", "stretch", "poor_fit"]),
  rationale: z.string().min(1).max(400),
});
export type RiskPerCandidate = z.infer<typeof riskPerCandidateSchema>;

export const riskOutputSchema = z.object({
  assumedProfile: z.boolean().default(false),
  perCandidate: z.array(riskPerCandidateSchema).max(20).default([]),
  portfolioLevelFlags: z.array(z.string().min(1).max(200)).max(10).default([]),
  gaps: z.array(z.string().min(1).max(200)).max(8).default([]),
});
export type RiskOutput = z.infer<typeof riskOutputSchema>;

/* ── Technicals agent (Phase 2) ──────────────────────────────────────── */

/**
 * Deterministic price-level snapshot per ticker. All values come from FMP
 * `historical-price-eod/full` (1y). Missing values stay null — never guessed.
 */
export const technicalsOutputSchema = z.object({
  ticker: z.string().min(1).max(20),
  price: z.number().finite().nullable(),
  currency: z.string().max(8).nullable(),
  closeHigh12m: z.number().finite().nullable(),
  closeHigh12mDate: z.string().max(40).nullable(),
  closeLow12m: z.number().finite().nullable(),
  closeLow12mDate: z.string().max(40).nullable(),
  distanceTo52wHighPct: z.number().finite().nullable(),
  distanceTo52wLowPct: z.number().finite().nullable(),
  ma50: z.number().finite().nullable(),
  ma200: z.number().finite().nullable(),
  aboveMa200: z.boolean().nullable(),
  support: z.number().finite().nullable(),
  resistance: z.number().finite().nullable(),
  return3mPct: z.number().finite().nullable(),
  return1yPct: z.number().finite().nullable(),
  volatilityAnnPct: z.number().finite().nullable(),
  nearHigh: z.boolean().nullable(),
  asOf: z.string().min(1).max(40),
  gaps: z.array(z.string().min(1).max(200)).max(4).default([]),
});
export type TechnicalsOutput = z.infer<typeof technicalsOutputSchema>;

export const aggregateTechnicalsOutputSchema = z.object({
  tickers: z.array(technicalsOutputSchema).max(20),
  generatedAt: z.string().min(1),
});
export type AggregateTechnicalsOutput = z.infer<
  typeof aggregateTechnicalsOutputSchema
>;

/* ── QA agent (HLD §4.5, Agent 6) ─────────────────────────────────────── */

export const qaIssueTypeSchema = z.enum([
  "quant_mismatch",
  "unconfirmed_source",
  "cross_agent_inconsistency",
  "rule_violation",
  "other",
]);
export type QaIssueTypeSchema = z.infer<typeof qaIssueTypeSchema>;

export const qaRuleIdSchema = z.enum([
  "R1",
  "R2",
  "R3",
  "R4",
  "R5",
  "R6",
  "R7",
  "R8",
  "R9",
  "R10",
]);
export type QaRuleIdSchema = z.infer<typeof qaRuleIdSchema>;

export const qaVerdictSchema = z.enum([
  "pass",
  "fail",
  "pass_with_degradation",
]);
export type QaVerdictSchema = z.infer<typeof qaVerdictSchema>;

export const qaIssueSchema = z.object({
  issueType: qaIssueTypeSchema,
  ruleId: qaRuleIdSchema.nullable(),
  /** Agent whose output the issue lives in (null for compiler-only issues). */
  agentKind: z.string().max(40).nullable(),
  /** Ticker the issue applies to; null for run-level issues. */
  ticker: z.string().max(20).nullable(),
  /** JSON-path style location of the offending claim (e.g. `cards[0].multiples.fwdPe`). */
  claimPath: z.string().max(500).nullable(),
  expectedValue: z.string().max(1000).nullable(),
  actualValue: z.string().max(1000).nullable(),
  summary: z.string().min(1).max(1000),
  /** Blocking issues fail the round; non-blocking ones are warnings. */
  blocking: z.boolean().default(true),
});
export type QaIssue = z.infer<typeof qaIssueSchema>;

/**
 * The verdict a single QA round emits. Persisted both as one row per issue
 * in `screening_qa_rounds` (audit trail) and mirrored to
 * `screening_agent_outputs` for compose-time reads.
 */
export const qaOutputSchema = z.object({
  verdict: qaVerdictSchema,
  roundNumber: z.number().int().min(1).max(3),
  issues: z.array(qaIssueSchema).max(50).default([]),
  flaggedAgentKinds: z.array(z.string().max(40)).max(10).default([]),
  degradedTickers: z.array(z.string().max(20)).max(15).default([]),
  generatedAt: z.string().min(1).max(40),
});
export type QaOutput = z.infer<typeof qaOutputSchema>;

/**
 * Tool-call payload accepted from the Layer B LLM. Kept close to
 * `qaOutputSchema.issues` so the two layers merge cleanly. The final round
 * verdict is recomputed by `runQaStep` after merging Layer A + Layer B.
 */
export const qaLlmOutputSchema = z.object({
  verdict: z.enum(["pass", "fail"]),
  issues: z
    .array(
      z.object({
        issueType: qaIssueTypeSchema,
        ruleId: qaRuleIdSchema.nullable().optional(),
        agentKind: z.string().max(40).nullable().optional(),
        ticker: z.string().max(20).nullable().optional(),
        claimPath: z.string().max(500).nullable().optional(),
        expectedValue: z.string().max(1000).nullable().optional(),
        actualValue: z.string().max(1000).nullable().optional(),
        summary: z.string().min(1).max(1000),
        blocking: z.boolean().default(true),
      }),
    )
    .max(15)
    .default([]),
});
export type QaLlmOutput = z.infer<typeof qaLlmOutputSchema>;

/* ── Shortlist company research (Tavily Research post-Compiler) ──────── */

export const shortlistResearchTickerSchema = z.object({
  ticker: z.string().min(1).max(20),
  businessOneLiner: z.string().max(500).default(""),
  segments: z.array(z.string().max(120)).max(20).default([]),
  catalysts: z.array(z.string().max(400)).max(12).default([]),
  guidanceSummary: z.string().max(1200).default(""),
  competitors: z.array(z.string().max(120)).max(20).default([]),
  sources: z
    .array(
      z.object({
        title: z.string().max(200),
        url: z.string().max(500),
      }),
    )
    .max(20)
    .default([]),
  fromCache: z.boolean().default(false),
  creditsUsed: z.number().nonnegative().default(0),
  errors: z.array(z.string().max(200)).max(8).default([]),
});
export type ShortlistResearchTicker = z.infer<
  typeof shortlistResearchTickerSchema
>;

export const shortlistResearchOutputSchema = z.object({
  tickers: z.array(shortlistResearchTickerSchema).max(5),
  generatedAt: z.string().min(1),
});
export type ShortlistResearchOutput = z.infer<
  typeof shortlistResearchOutputSchema
>;

/** Ops-facing variable cost attached to report responses (not user billing). */
export const screeningReportCostSchema = z.object({
  costUsd: z.number().nonnegative(),
  breakdown: z.object({
    currency: z.literal("USD"),
    llmUsd: z.number().nonnegative(),
    tavilySearchUsd: z.number().nonnegative(),
    tavilyExtractUsd: z.number().nonnegative().default(0),
    tavilyResearchUsd: z.number().nonnegative(),
    tavilySearchCredits: z.number().nonnegative(),
    tavilyExtractCredits: z.number().nonnegative().default(0),
    tavilyResearchCredits: z.number().nonnegative(),
    llmTokensIn: z.number().nonnegative(),
    llmTokensOut: z.number().nonnegative(),
  }),
});
export type ScreeningReportCost = z.infer<typeof screeningReportCostSchema>;
