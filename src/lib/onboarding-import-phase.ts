export type OnboardingPhase = "wizard" | "importProposal";

/**
 * After POST /api/auth/onboarding, refreshUser() marks onboardingCompleted
 * while phase may still be "wizard". Stay on the import chooser until the
 * user picks a method.
 */
export function shouldRedirectCompletedOnboarding(opts: {
  onboardingCompleted: boolean;
  phase: OnboardingPhase;
  stayingForImport: boolean;
}): boolean {
  return opts.onboardingCompleted && opts.phase !== "importProposal" && !opts.stayingForImport;
}
