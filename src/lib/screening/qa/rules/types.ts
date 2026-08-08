import type {
  AggregateIrBusinessOutput,
  AggregateWebSentimentOutput,
  AggregateTechnicalsOutput,
  CompilerReportDraft,
  HardDataOutput,
  PortfolioContextOutput,
  QaIssue,
  RiskOutput,
  ScreeningReport,
} from "@/lib/screening/schemas";

/**
 * Bundle every agent output QA needs to evaluate its rules. Rules stay pure:
 * they take this in, they return `QaIssue[]`. No DB, no LLM, no I/O.
 */
export interface QaEvaluationContext {
  runId: string;
  hardData: HardDataOutput | null;
  irAggregate: AggregateIrBusinessOutput | null;
  webAggregate: AggregateWebSentimentOutput | null;
  technicalsAggregate: AggregateTechnicalsOutput | null;
  portfolioContext: PortfolioContextOutput | null;
  risk: RiskOutput | null;
  compilerDraft: CompilerReportDraft | null;
  /** The already-composed candidate cards, ready for cross-agent checks. */
  report: ScreeningReport | null;
}

export type QaRule = (ctx: QaEvaluationContext) => QaIssue[];
