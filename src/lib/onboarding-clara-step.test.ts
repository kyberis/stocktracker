import { describe, expect, it } from "vitest";
import {
  CLARA_WIZARD_STEP_INDEX,
  TRIAL_WIZARD_STEP_INDEX,
  claraStepAllowsCompletion,
  parseClaraOnboardingLinked,
  shouldAutoAdvancePastHiddenTrial,
  skipSetupTargetStep,
  wizardBackFromClara,
} from "./onboarding-clara-step";

describe("parseClaraOnboardingLinked", () => {
  it("treats linked status as ready", () => {
    expect(parseClaraOnboardingLinked({ linked: true })).toBe(true);
  });

  it("treats unlinked or invalid payloads as not ready", () => {
    expect(parseClaraOnboardingLinked({ linked: false })).toBe(false);
    expect(parseClaraOnboardingLinked(null)).toBe(false);
    expect(parseClaraOnboardingLinked({})).toBe(false);
  });
});

describe("wizard navigation around Clara", () => {
  it("auto-advances past a hidden trial to Clara", () => {
    expect(
      shouldAutoAdvancePastHiddenTrial({
        phase: "wizard",
        step: TRIAL_WIZARD_STEP_INDEX,
        flagsLoaded: true,
        showTrial: false,
      }),
    ).toBe(true);
  });

  it("keeps the trial step when the offer is shown", () => {
    expect(
      shouldAutoAdvancePastHiddenTrial({
        phase: "wizard",
        step: TRIAL_WIZARD_STEP_INDEX,
        flagsLoaded: true,
        showTrial: true,
      }),
    ).toBe(false);
  });

  it("does not auto-advance before flags load", () => {
    expect(
      shouldAutoAdvancePastHiddenTrial({
        phase: "wizard",
        step: TRIAL_WIZARD_STEP_INDEX,
        flagsLoaded: false,
        showTrial: false,
      }),
    ).toBe(false);
  });

  it("lands skip-setup on trial (Clara follows)", () => {
    expect(skipSetupTargetStep()).toBe(TRIAL_WIZARD_STEP_INDEX);
  });

  it("goes back from Clara to trial when shown, else referral", () => {
    expect(wizardBackFromClara(true)).toBe(TRIAL_WIZARD_STEP_INDEX);
    expect(wizardBackFromClara(false)).toBe(2);
  });

  it("lets skip and linked both complete the wizard", () => {
    expect(claraStepAllowsCompletion("skipped")).toBe(true);
    expect(claraStepAllowsCompletion("linked")).toBe(true);
    expect(CLARA_WIZARD_STEP_INDEX).toBe(4);
  });
});

describe("parseClaraActivateLinked", () => {
  it("reads linked from activate responses", async () => {
    const { parseClaraActivateLinked } = await import("./onboarding-clara-step");
    expect(parseClaraActivateLinked({ linked: true })).toBe(true);
    expect(parseClaraActivateLinked({ linked: false })).toBe(false);
    expect(parseClaraActivateLinked(null)).toBe(false);
  });
});
