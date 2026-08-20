export type { Metric, MetricId, MetricUnit, StatementYear } from "./types";
export { METRIC_CATALOG, coverageBand } from "./catalog";
export {
  formatMetric,
  formatMetricValue,
  formatMetricUnreliable,
  metricLocaleFromTag,
} from "./format";
export { validateMetric, publishedMetricValue, isCyclicalSector } from "./validate";
export { computeThesisMetrics, metricById } from "./compute";
export { metricsFromCandidate } from "./from-candidate";
export {
  adjectiveFor,
  mustDescribeBuyback,
  mustDescribeFcfGenerates,
  compoundedChangePct,
  cagrSpanYears,
} from "./adjectives";
export { matchRejectFilters } from "./routing";
