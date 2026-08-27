import { describe, expect, it } from "vitest";
import { shouldRedirectCompletedOnboarding } from "./onboarding-import-phase";

describe("shouldRedirectCompletedOnboarding", () => {
  it("does not redirect while staying for import after completeOnboarding", () => {
    expect(
      shouldRedirectCompletedOnboarding({
        onboardingCompleted: true,
        phase: "wizard",
        stayingForImport: true,
      }),
    ).toBe(false);
  });

  it("does not redirect on importProposal", () => {
    expect(
      shouldRedirectCompletedOnboarding({
        onboardingCompleted: true,
        phase: "importProposal",
        stayingForImport: false,
      }),
    ).toBe(false);
  });

  it("redirects returning users who already finished onboarding", () => {
    expect(
      shouldRedirectCompletedOnboarding({
        onboardingCompleted: true,
        phase: "wizard",
        stayingForImport: false,
      }),
    ).toBe(true);
  });
});
