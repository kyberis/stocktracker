import { parseClaraDeskStatus } from "@/lib/clara-desk-status";

export const WIZARD_STEP_COUNT = 5;
export const TRIAL_WIZARD_STEP_INDEX = 3;
export const CLARA_WIZARD_STEP_INDEX = 4;
export const CLARA_ONBOARDING_POLL_INTERVAL_MS = 2_000;

export type ClaraOnboardingActivation = "linked" | "skipped";

export function parseClaraOnboardingLinked(raw: unknown): boolean {
  return parseClaraDeskStatus(raw).linked;
}

/** Skip-setup from early steps lands on trial; hidden trial auto-advances to Clara. */
export function skipSetupTargetStep(): number {
  return TRIAL_WIZARD_STEP_INDEX;
}

export function wizardBackFromClara(showTrial: boolean): number {
  return showTrial ? TRIAL_WIZARD_STEP_INDEX : 2;
}

export function shouldAutoAdvancePastHiddenTrial(opts: {
  phase: "wizard" | "importProposal";
  step: number;
  flagsLoaded: boolean;
  showTrial: boolean;
}): boolean {
  return (
    opts.phase === "wizard" &&
    opts.step === TRIAL_WIZARD_STEP_INDEX &&
    opts.flagsLoaded &&
    !opts.showTrial
  );
}

/** Skip and successful SSO both finish the wizard; neither blocks import. */
export function claraStepAllowsCompletion(
  outcome: ClaraOnboardingActivation,
): boolean {
  return outcome === "linked" || outcome === "skipped";
}
