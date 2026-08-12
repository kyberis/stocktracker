import { describe, expect, it } from "vitest";
import {
  EXPERIMENT_METRICS_CATALOG,
  getExperimentMetric,
  listExperimentMetricsByCategory,
} from "@/lib/experiment-metrics-catalog";

describe("experiment-metrics-catalog", () => {
  it("has unique keys", () => {
    const keys = EXPERIMENT_METRICS_CATALOG.map((m) => m.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("includes empty_activation defaults", () => {
    expect(getExperimentMetric("empty_activation_cta")?.recommendedFor).toContain(
      "empty_activation",
    );
    expect(getExperimentMetric("holding_add")?.recommendedFor).toContain("empty_activation");
  });

  it("groups by category without empty buckets", () => {
    const groups = listExperimentMetricsByCategory();
    expect(groups.length).toBeGreaterThan(0);
    for (const g of groups) {
      expect(g.metrics.length).toBeGreaterThan(0);
    }
  });
});
