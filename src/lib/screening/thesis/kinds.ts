/** Agent kinds for the thesis screening pipeline (bake-off vs checklist). */

export const THESIS_HARD_DATA_KIND = "thesis_hard_data";
export const THESIS_IR_KIND = "thesis_ir";
export const THESIS_AGGREGATE_IR_KIND = "thesis_aggregate_ir";
export const THESIS_WEB_KIND = "thesis_web";
export const THESIS_AGGREGATE_WEB_KIND = "thesis_aggregate_web";
export const THESIS_TECHNICALS_KIND = "thesis_technicals";
export const THESIS_AGGREGATE_TECHNICALS_KIND = "thesis_aggregate_technicals";
export const THESIS_PORTFOLIO_KIND = "thesis_portfolio";
export const THESIS_RISK_KIND = "thesis_risk";
export const THESIS_COMPILER_KIND = "thesis_compiler";
export const THESIS_EVALUATE_KIND = "thesis_evaluate";
export const THESIS_QA_KIND = "thesis_qa";

export const THESIS_UI_STEP_ORDER: readonly string[] = [
  "intake",
  THESIS_HARD_DATA_KIND,
  THESIS_IR_KIND,
  THESIS_WEB_KIND,
  THESIS_TECHNICALS_KIND,
  THESIS_PORTFOLIO_KIND,
  THESIS_RISK_KIND,
  THESIS_COMPILER_KIND,
  THESIS_EVALUATE_KIND,
  THESIS_QA_KIND,
];

export const THESIS_FANOUT_KINDS = new Set([
  THESIS_IR_KIND,
  THESIS_WEB_KIND,
  THESIS_TECHNICALS_KIND,
]);

export const THESIS_AGGREGATE_KINDS = new Set([
  THESIS_AGGREGATE_IR_KIND,
  THESIS_AGGREGATE_WEB_KIND,
  THESIS_AGGREGATE_TECHNICALS_KIND,
]);
