import { z } from "zod";
import { hardDataCandidateSchema } from "@/lib/screening/schemas";

/** Subset of thesis.schema.json used by the screening thesis pipeline. */

export const thesisConfidenceSchema = z.enum([
  "high",
  "medium",
  "low",
  "insufficient_evidence",
]);
export type ThesisConfidence = z.infer<typeof thesisConfidenceSchema>;

export const thesisMethodSchema = z.enum(["raw", "derived", "estimated"]);
export type ThesisMethod = z.infer<typeof thesisMethodSchema>;

export const thesisSourceSchema = z.object({
  type: z.enum([
    "fmp",
    "sec_edgar",
    "sec_fts",
    "issuer_document",
    "transcript",
    "news",
    "defillama",
    "coingecko",
    "github",
    "explorer",
    "fred",
    "manual",
  ]),
  ref: z.string().min(1).max(500),
  url: z.string().max(2000).optional(),
  retrieved_at: z.string().min(1).max(40),
  primary: z.boolean().optional(),
});
export type ThesisSource = z.infer<typeof thesisSourceSchema>;

export const thesisEvidenceSchema = z.object({
  quote: z.string().min(10).max(2000),
  location: z.string().min(1).max(300),
  url: z.string().max(2000).optional(),
  date: z.string().max(40).optional(),
});
export type ThesisEvidence = z.infer<typeof thesisEvidenceSchema>;

export const thesisFieldIdSchema = z
  .string()
  .regex(/^(EQ|ETF|CR|calc):[A-Za-z0-9_\-]+$/);
export type ThesisFieldId = z.infer<typeof thesisFieldIdSchema>;

export const thesisFactSchema = z
  .object({
    id: z.string().max(80).optional(),
    asset_id: z.string().min(1).max(40),
    field_id: thesisFieldIdSchema,
    value: z.union([z.number(), z.string(), z.boolean(), z.null()]),
    unit: z.string().max(40).optional(),
    period: z
      .object({
        kind: z.enum(["FY", "Q", "TTM", "POINT_IN_TIME", "RANGE"]).optional(),
        start: z.string().max(40).optional(),
        end: z.string().max(40).optional(),
        fiscal_label: z.string().max(40).optional(),
      })
      .optional(),
    as_of: z.string().min(1).max(40),
    max_staleness_days: z.number().int().min(1).optional(),
    source: thesisSourceSchema,
    method: thesisMethodSchema,
    estimation_method: z.string().max(400).optional(),
    disputed: z.boolean().optional(),
    supersedes: z.string().max(80).optional(),
  })
  .superRefine((fact, ctx) => {
    if (fact.method === "estimated" && !fact.estimation_method) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["estimation_method"],
        message: "estimated facts require estimation_method",
      });
    }
  });
export type ThesisFact = z.infer<typeof thesisFactSchema>;

export const thesisSoftAssessmentSchema = z
  .object({
    id: z.string().max(80).optional(),
    asset_id: z.string().min(1).max(40),
    field_id: thesisFieldIdSchema,
    score: z.number().int().min(1).max(5).nullable(),
    confidence: thesisConfidenceSchema,
    rationale: z.string().max(500).optional(),
    evidence: z.array(thesisEvidenceSchema).max(8).default([]),
    disconfirming_evidence: z.array(thesisEvidenceSchema).max(8).default([]),
    external_knowledge: z.boolean().optional(),
    assessed_at: z.string().min(1).max(40),
    assessed_by: z.string().min(1).max(120),
  })
  .superRefine((row, ctx) => {
    if (row.score != null && row.evidence.length < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["evidence"],
        message: "scored soft assessments require at least one quote",
      });
    }
    if (row.confidence === "insufficient_evidence" && row.score != null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["score"],
        message: "insufficient_evidence requires score null",
      });
    }
  });
export type ThesisSoftAssessment = z.infer<typeof thesisSoftAssessmentSchema>;

export const thesisKillCriterionSchema = z.object({
  id: z.string().max(80).optional(),
  label: z.string().max(200).optional(),
  metric_field_id: thesisFieldIdSchema,
  operator: z.enum([
    "<",
    "<=",
    ">",
    ">=",
    "==",
    "!=",
    "crosses_below",
    "crosses_above",
    "changes_by_pct",
  ]),
  threshold: z.union([z.number(), z.string(), z.boolean()]),
  window: z.string().max(80).optional(),
  action: z.enum(["alert", "review", "reduce", "exit"]),
  breached_at: z.string().max(40).nullable().optional(),
});
export type ThesisKillCriterion = z.infer<typeof thesisKillCriterionSchema>;

export const thesisScenarioSchema = z.object({
  label: z.enum(["bull", "base", "bear"]),
  probability: z.number().min(0).max(1),
  value: z.number(),
  key_assumptions: z
    .array(
      z.object({
        driver: z.string().min(1).max(80),
        assumption: z.union([z.number(), z.string()]),
        justification: z.string().max(300).optional(),
      }),
    )
    .min(1)
    .max(8),
});
export type ThesisScenario = z.infer<typeof thesisScenarioSchema>;

export const thesisVerdictSchema = z.enum([
  "high_quality_attractively_priced",
  "high_quality_richly_priced",
  "improving_fundamentals",
  "value_with_open_questions",
  "deteriorating",
  "insufficient_data",
  "watchlist_gate_failed",
]);
export type ThesisVerdict = z.infer<typeof thesisVerdictSchema>;

export const ADVICE_LANGUAGE = /\b(buy|sell|hold|compr[aeá]|vend[aeé]|mantener)\b/i;

export const thesisAssessmentSchema = z.object({
  ruleset_version: z.string().min(1).max(40),
  gates: z
    .array(
      z.object({
        field_id: z.string().min(1).max(40),
        passed: z.boolean().nullable(),
        value: z.union([z.number(), z.string(), z.boolean(), z.null()]).optional(),
        threshold: z.union([z.number(), z.string()]).optional(),
        note: z.string().max(400).optional(),
      }),
    )
    .max(20),
  pillar_scores: z.object({
    business_quality: z.number().min(0).max(100).nullable(),
    growth: z.number().min(0).max(100).nullable(),
    earnings_quality: z.number().min(0).max(100).nullable(),
    balance_sheet: z.number().min(0).max(100).nullable(),
    capital_allocation: z.number().min(0).max(100).nullable(),
    valuation: z.number().min(0).max(100).nullable(),
  }),
  penalties: z
    .array(
      z.object({
        flag: z.string().min(1).max(80),
        points: z.number().max(0),
        note: z.string().max(400).optional(),
      }),
    )
    .max(12)
    .default([]),
  total: z.number().min(0).max(100).nullable(),
  verdict: thesisVerdictSchema,
  stale: z.boolean().default(false),
  coverage_pct: z.number().min(0).max(100).optional(),
  computed_at: z.string().min(1).max(40),
});
export type ThesisAssessment = z.infer<typeof thesisAssessmentSchema>;

export const thesisDraftSchema = z
  .object({
    ticker: z.string().min(1).max(20),
    statement: z.string().min(40).max(800),
    /** Multi-paragraph research note. Optional so older runs still parse. */
    writeup: z.string().max(8000).optional(),
    variant_perception: z.object({
      consensus_view: z.string().min(1).max(600),
      our_view: z.string().min(1).max(600),
      why_mispricing_persists: z.string().min(1).max(600),
    }),
    horizon_months: z.number().int().min(1).max(240),
    conviction: z.number().int().min(1).max(5),
    conviction_rationale: z.string().max(400).optional(),
    kill_criteria: z.array(thesisKillCriterionSchema).max(8).default([]),
    premortem: z.string().min(50).max(2000),
    scenarios: z.array(thesisScenarioSchema).max(3).default([]),
    key_risks: z
      .array(
        z.object({
          risk: z.string().min(1).max(280),
          likelihood: z.enum(["low", "medium", "high"]),
          impact: z.enum(["low", "medium", "high"]),
          mitigant: z.string().max(280).optional(),
          monitorable_via: z.string().max(80).optional(),
        }),
      )
      .max(8)
      .default([]),
    status: z.enum(["draft", "watchlist"]).default("draft"),
    gaps: z.array(z.string().max(280)).max(16).default([]),
    disclaimer: z.string().min(1).max(400),
  })
  .superRefine((draft, ctx) => {
    if (ADVICE_LANGUAGE.test(draft.statement)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["statement"],
        message: "advisory language (buy/sell/hold) is not allowed",
      });
    }
    const probs = draft.scenarios.map((s) => s.probability);
    if (draft.scenarios.length === 3) {
      const sum = probs.reduce((a, b) => a + b, 0);
      if (Math.abs(sum - 1) > 0.02) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["scenarios"],
          message: "scenario probabilities must sum to 1.0",
        });
      }
    }
  });
export type ThesisDraft = z.infer<typeof thesisDraftSchema>;

export const thesisHardDataOutputSchema = z.object({
  status: z.enum(["ok", "empty"]),
  universeSize: z.number().int().min(0),
  tickers: z.array(z.string().min(1).max(20)).max(20),
  candidates: z.array(hardDataCandidateSchema).max(20),
  facts: z.array(thesisFactSchema).max(400),
  gaps: z.array(z.string().max(200)).max(16).default([]),
  locale: z.string().min(2).max(10),
  generatedAt: z.string().min(1).max(40),
});
export type ThesisHardDataOutput = z.infer<typeof thesisHardDataOutputSchema>;

export const thesisIrOutputSchema = z.object({
  ticker: z.string().min(1).max(20),
  soft_assessments: z.array(thesisSoftAssessmentSchema).max(12),
  references: z
    .array(
      z.object({
        url: z.string().max(2000),
        asOf: z.string().max(40),
        label: z.string().max(120).optional(),
        excerpt: z.string().max(400).optional(),
      }),
    )
    .max(16)
    .default([]),
  gaps: z.array(z.string().max(200)).max(8).default([]),
});
export type ThesisIrOutput = z.infer<typeof thesisIrOutputSchema>;

export const thesisWebOutputSchema = z.object({
  ticker: z.string().min(1).max(20),
  soft_assessments: z.array(thesisSoftAssessmentSchema).max(8),
  insider_net_bias: z
    .enum(["buying", "selling", "mixed", "none"])
    .nullable()
    .optional(),
  gaps: z.array(z.string().max(200)).max(8).default([]),
});
export type ThesisWebOutput = z.infer<typeof thesisWebOutputSchema>;

export const thesisEvaluateTickerSchema = z.object({
  ticker: z.string().min(1).max(20),
  companyName: z.string().min(1).max(200),
  assessment: thesisAssessmentSchema,
  thesis_draft: thesisDraftSchema.nullable(),
  narrative: z.string().max(8000).optional(),
});
export type ThesisEvaluateTicker = z.infer<typeof thesisEvaluateTickerSchema>;

export const thesisEvaluateOutputSchema = z.object({
  evaluations: z.array(thesisEvaluateTickerSchema).max(5),
  ruleset_version: z.string().min(1).max(40),
  locale: z.string().min(2).max(10),
  generatedAt: z.string().min(1).max(40),
});
export type ThesisEvaluateOutput = z.infer<typeof thesisEvaluateOutputSchema>;

export const thesisCompilerOutputSchema = z.object({
  tickers: z.array(z.string().min(1).max(20)).max(5),
  notes: z.array(z.string().max(280)).max(8).default([]),
  generatedAt: z.string().min(1).max(40),
});
export type ThesisCompilerOutput = z.infer<typeof thesisCompilerOutputSchema>;

export const thesisQaOutputSchema = z.object({
  verdict: z.enum(["pass", "fail", "pass_with_degradation"]),
  issues: z
    .array(
      z.object({
        ruleId: z.string().min(1).max(20),
        ticker: z.string().max(20).nullable(),
        summary: z.string().min(1).max(400),
        blocking: z.boolean(),
      }),
    )
    .max(40)
    .default([]),
  degradedTickers: z.array(z.string().max(20)).max(5).default([]),
  generatedAt: z.string().min(1).max(40),
});
export type ThesisQaOutput = z.infer<typeof thesisQaOutputSchema>;

export const thesisReportCardSchema = z.object({
  ticker: z.string().min(1).max(20),
  companyName: z.string().min(1).max(200),
  assessment: thesisAssessmentSchema,
  thesis_draft: thesisDraftSchema.nullable(),
  facts: z.array(thesisFactSchema).max(80),
  soft_assessments: z.array(thesisSoftAssessmentSchema).max(16),
  gaps: z.array(z.string().max(280)).max(16).default([]),
  businessSummary: z.string().max(400).optional(),
  industry: z.string().max(200).optional(),
  narrative: z.string().max(8000).optional(),
});
export type ThesisReportCard = z.infer<typeof thesisReportCardSchema>;

export const thesisReportSchema = z.object({
  kind: z.literal("thesis"),
  runId: z.string().min(1),
  locale: z.string().min(2).max(10),
  generatedAt: z.string().min(1).max(40),
  ruleset_version: z.string().min(1).max(40),
  summary: z.string().max(2000).optional(),
  cards: z.array(thesisReportCardSchema).max(5),
  disclaimer: z.string().min(1).max(400),
  qa: thesisQaOutputSchema.nullable().optional(),
});
export type ThesisReport = z.infer<typeof thesisReportSchema>;

export const THESIS_RULESET_VERSION = "thesis-screening-v1";
