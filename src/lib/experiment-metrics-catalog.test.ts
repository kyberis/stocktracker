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

  it("includes agent_intro defaults", () => {
    expect(getExperimentMetric("agent_intro_post_action")?.recommendedFor).toContain("agent_intro");
    expect(getExperimentMetric("agent_intro_completed")?.recommendedFor).toContain("agent_intro");
    expect(getExperimentMetric("holding_add")?.recommendedFor).toContain("agent_intro");
  });

  it("includes warren_first_stock defaults", () => {
    expect(getExperimentMetric("first_stock_activation_shown")?.recommendedFor).toContain(
      "warren_first_stock",
    );
    expect(getExperimentMetric("first_stock_example_sent")?.recommendedFor).toContain(
      "warren_first_stock",
    );
    expect(getExperimentMetric("holding_add")?.recommendedFor).toContain("warren_first_stock");
  });

  it("groups by category without empty buckets", () => {
    const groups = listExperimentMetricsByCategory();
    expect(groups.length).toBeGreaterThan(0);
    for (const g of groups) {
      expect(g.metrics.length).toBeGreaterThan(0);
    }
  });
});
