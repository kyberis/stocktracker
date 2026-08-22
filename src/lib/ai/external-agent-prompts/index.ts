export { CLARA_PROMPT_EN_SNAPSHOT } from "./clara-en.snapshot";
export { WILL_PROMPT_EN_SNAPSHOT } from "./will-en.snapshot";

/** Preview Will prompt with runtime placeholders replaced for admin display. */
export function previewWillEnPrompt(nowUtc = new Date().toISOString()): string {
  return WILL_PROMPT_EN_SNAPSHOT.replaceAll("{LOCALE}", "en").replaceAll(
    "{NOW_UTC}",
    nowUtc,
  );
}
