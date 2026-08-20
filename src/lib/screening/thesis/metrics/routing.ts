import { isCyclicalSector, publishedMetricValue } from "./validate";
import { metricById } from "./compute";
import type { Metric } from "./types";

export type RejectFilterId =
  | "leveraged_cyclical"
  | "no_moat_no_returns"
  | "chronic_dilution";

export interface RejectMatch {
  id: RejectFilterId;
  sayEn: string;
  sayEs: string;
}

export interface RouteThesisInput {
  metrics: Metric[];
  sector?: string | null;
  industry?: string | null;
  /** WACC as percentage points when known. */
  waccPct?: number | null;
  moatScore?: number | null;
}

function pub(metrics: Metric[], id: Metric["id"]): number | null {
  const row = metricById(metrics, id);
  return row ? publishedMetricValue(row) : null;
}

/**
 * §4 discard filters. Not yet the published report product (slice 5);
 * kept as a pure function so NRG and future notes can assert the decision.
 */
export function matchRejectFilters(input: RouteThesisInput): RejectMatch | null {
  const nd = pub(input.metrics, "netDebtToEbitda");
  const roic = pub(input.metrics, "roic");
  const shares = pub(input.metrics, "shareCountCagr");
  if (
    nd != null &&
    nd > 4 &&
    isCyclicalSector(input.sector, input.industry)
  ) {
    return {
      id: "leveraged_cyclical",
      sayEn: "Cyclical and leveraged: two of the three profiles that have cost the most.",
      sayEs: "Cíclica y apalancada: dos de los tres perfiles que más pérdidas causan.",
    };
  }
  if (
    roic != null &&
    input.waccPct != null &&
    roic < input.waccPct &&
    (input.moatScore == null || input.moatScore < 50)
  ) {
    return {
      id: "no_moat_no_returns",
      sayEn: "Return on capital below its cost, with no moat to hold it up.",
      sayEs: "Retorno sobre el capital por debajo del coste del capital, sin foso que lo sostenga.",
    };
  }
  if (shares != null && shares > 3) {
    return {
      id: "chronic_dilution",
      sayEn: "Sustained dilution above 3% a year.",
      sayEs: "Dilución sostenida por encima del 3 % anual.",
    };
  }
  return null;
}
