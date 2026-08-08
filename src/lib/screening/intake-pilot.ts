import type { IntakeOption, IntakeQuestion } from "./intake-script";

/**
 * Curated option ids the intake pilot prefers per question, so the sample
 * conversation fills a sensible brief without the full one-by-one walk.
 * Falls back to the first option when a preferred id is missing.
 */
export const INTAKE_PILOT_PREFERRED_OPTION_IDS: Record<string, string[]> = {
  sectors: ["keep", "wholeUniverse", "avoidTech"],
  preset: ["applyAll"],
  size: ["keepPreset"],
  valuation: ["keepAll"],
  quality: ["keepAll"],
  region: ["allThree"],
  riskProfile: ["balanced"],
};

export type IntakePilotStep = {
  questionId: string;
  option: IntakeOption;
};

/**
 * Build the ordered list of user replies the pilot will send. Caps at the
 * script length so a long clarification loop cannot run forever.
 */
export function buildIntakePilotPlan(
  script: IntakeQuestion[],
  preferredIds: Record<string, string[]> = INTAKE_PILOT_PREFERRED_OPTION_IDS,
): IntakePilotStep[] {
  return script.map((question) => {
    const prefs = preferredIds[question.id] ?? [];
    const option =
      prefs
        .map((id) => question.options.find((o) => o.id === id))
        .find((o): o is IntakeOption => Boolean(o)) ?? question.options[0];
    if (!option) {
      throw new Error(`intake pilot: question ${question.id} has no options`);
    }
    return { questionId: question.id, option };
  });
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
