/** Agent kinds for the thesis screening pipeline (simplified Attractiveness DAG). */

export const THESIS_HARD_DATA_KIND = "thesis_hard_data";
/** Combined IR + light web soft evidence (replaces IR/Web/Tech fan-out). */
export const THESIS_RESEARCH_KIND = "thesis_research";
export const THESIS_EVALUATE_KIND = "thesis_evaluate";
export const THESIS_QA_KIND = "thesis_qa";

/** @deprecated Kept so old runs / logs still resolve kinds. */
export const THESIS_IR_KIND = "thesis_ir";
/** @deprecated */
export const THESIS_AGGREGATE_IR_KIND = "thesis_aggregate_ir";
/** @deprecated */
export const THESIS_WEB_KIND = "thesis_web";
/** @deprecated */
export const THESIS_AGGREGATE_WEB_KIND = "thesis_aggregate_web";
/** @deprecated */
export const THESIS_TECHNICALS_KIND = "thesis_technicals";
/** @deprecated */
export const THESIS_AGGREGATE_TECHNICALS_KIND = "thesis_aggregate_technicals";
/** @deprecated */
export const THESIS_PORTFOLIO_KIND = "thesis_portfolio";
/** @deprecated */
export const THESIS_RISK_KIND = "thesis_risk";
/** @deprecated */
export const THESIS_COMPILER_KIND = "thesis_compiler";

export const THESIS_UI_STEP_ORDER: readonly string[] = [
  "intake",
  THESIS_HARD_DATA_KIND,
  THESIS_RESEARCH_KIND,
  THESIS_EVALUATE_KIND,
  THESIS_QA_KIND,
];

/** Fan-out kinds (legacy empty — research is one step per ticker). */
export const THESIS_FANOUT_KINDS = new Set([THESIS_RESEARCH_KIND]);

export const THESIS_AGGREGATE_KINDS = new Set<string>();
