import { describe, expect, it } from "vitest";
import { getScreeningCopy } from "../copy";
import { buildIntakeScript } from "../intake-script";
import {
  buildIntakePilotPlan,
  INTAKE_PILOT_PREFERRED_OPTION_IDS,
} from "../intake-pilot";

describe("buildIntakePilotPlan", () => {
  it("picks preferred options for an explore script", () => {
    const copy = getScreeningCopy("en");
    const script = buildIntakeScript(copy, {
      intent: "explore",
      suggestedInclude: [],
      suggestedExclude: [],
    });
    const plan = buildIntakePilotPlan(script);
    expect(plan.length).toBe(script.length);
    expect(plan[0]?.questionId).toBe("sectors");
    expect(plan[0]?.option.id).toBe("wholeUniverse");
    expect(plan[1]?.option.id).toBe("applyAll");
    for (const step of plan) {
      expect(step.option.say.length).toBeGreaterThan(0);
    }
  });

  it("prefers keep on rebalance when sectors are suggested", () => {
    const copy = getScreeningCopy("en");
    const script = buildIntakeScript(copy, {
      intent: "rebalance",
      suggestedInclude: ["Healthcare", "Industrials"],
      suggestedExclude: ["Technology"],
    });
    const plan = buildIntakePilotPlan(script);
    expect(plan[0]?.option.id).toBe("keep");
  });

  it("falls back to the first option when prefs miss", () => {
    const copy = getScreeningCopy("en");
    const script = buildIntakeScript(copy, {
      intent: "explore",
      suggestedInclude: [],
      suggestedExclude: [],
    });
    const plan = buildIntakePilotPlan(script, {
      ...INTAKE_PILOT_PREFERRED_OPTION_IDS,
      sectors: ["does-not-exist"],
    });
    expect(plan[0]?.option.id).toBe(script[0]?.options[0]?.id);
  });
});
