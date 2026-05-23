import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { completeOnboarding, findUserById, isFeatureEnabled, trackEvent } from "@/lib/db";
import { updateUserSettings } from "@/lib/db/settings";
import { createSessionToken, getSessionCookieConfig } from "@/lib/auth/session";
import { withMetrics } from "@/lib/with-metrics";
import { parseBody } from "@/lib/api-response";
import { onboardingSchema } from "@/lib/schemas";
import { activateProTrial, getTrialEligibilityError, syncOnboardingTrialToIdp } from "@/lib/trial-activation";

export const POST = withMetrics("/api/auth/onboarding", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  if (session.onboardingCompleted) {
    return NextResponse.json({ error: "Onboarding already completed" }, { status: 400 });
  }

  const result = await parseBody(req, onboardingSchema);
  if (!result.success) return result.error;
  const {
    displayName,
    defaultCurrency,
    taxResidency,
    experienceLevel,
    importMethod,
    useCase,
    referralSource,
    activateTrial,
  } = result.data;

  let trialActivated = false;
  if (activateTrial) {
    if (!(await isFeatureEnabled("pro_trial_enabled"))) {
      return NextResponse.json({ error: "Trial is not available" }, { status: 400 });
    }
    const user = await findUserById(session.userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const eligibilityError = getTrialEligibilityError(user);
    if (eligibilityError) {
      return NextResponse.json({ error: "Trial is not available for this account" }, { status: 400 });
    }
    const { planExpiresAt } = await activateProTrial(session.userId);
    trialActivated = true;
    await trackEvent(session.userId, "onboarding_trial_activated", { source: "onboarding" });
    if (user.email) {
      void syncOnboardingTrialToIdp(session.userId, user.email, planExpiresAt);
    }
  } else if (activateTrial === false) {
    await trackEvent(session.userId, "onboarding_trial_skipped", { source: "onboarding" });
  }

  await completeOnboarding(session.userId, {
    displayName: displayName || undefined,
    taxResidency: taxResidency || undefined,
    experienceLevel: experienceLevel || undefined,
    useCase: useCase && useCase.length > 0 ? useCase : undefined,
    referralSource: referralSource || undefined,
  });

  if (defaultCurrency) {
    await updateUserSettings(session.userId, { defaultCurrency: defaultCurrency as "EUR" });
  }

  if (importMethod) {
    trackEvent(session.userId, "onboarding_import_method", { method: importMethod });
  }
  if (useCase && useCase.length > 0) {
    trackEvent(session.userId, "onboarding_use_case", { use_cases: useCase.join(",") });
  }
  if (referralSource) {
    trackEvent(session.userId, "onboarding_referral_source", { source: referralSource });
  }

  const newSessionToken = await createSessionToken({
    ...session,
    onboardingCompleted: true,
  });

  const response = NextResponse.json({
    ok: true,
    importMethod: importMethod || "skip",
    trialActivated,
  });
  response.cookies.set(getSessionCookieConfig(newSessionToken));
  return response;
});
