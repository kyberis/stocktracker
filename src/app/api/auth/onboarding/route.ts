import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { completeOnboarding, resetUserHoldings, ensureDefaultPortfolio, trackEvent } from "@/lib/db";
import { updateUserSettings } from "@/lib/db/settings";
import { createSessionToken, getSessionCookieConfig } from "@/lib/auth/session";
import { withMetrics } from "@/lib/with-metrics";
import { parseBody } from "@/lib/api-response";
import { onboardingSchema } from "@/lib/schemas";
import { countHoldings } from "@/lib/db/holdings";

export const POST = withMetrics("/api/auth/onboarding", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  const result = await parseBody(req, onboardingSchema);
  if (!result.success) return result.error;
  const { displayName, defaultCurrency, taxResidency, importMethod } = result.data;

  await completeOnboarding(session.userId, {
    displayName: displayName || undefined,
    taxResidency: taxResidency || undefined,
  });

  if (defaultCurrency) {
    await updateUserSettings(session.userId, { defaultCurrency: defaultCurrency as "EUR" });
  }

  const portfolioId = await ensureDefaultPortfolio(session.userId);
  const holdingsCount = await countHoldings(session.userId, portfolioId);

  if (holdingsCount === 0 && importMethod !== "csv" && importMethod !== "broker_sync" && importMethod !== "skip") {
    await resetUserHoldings(session.userId, true, portfolioId);
    trackEvent(session.userId, "onboarding_auto_seeded");
  }

  if (importMethod) {
    trackEvent(session.userId, "onboarding_import_method", { method: importMethod });
  }

  const newSessionToken = await createSessionToken({
    ...session,
    onboardingCompleted: true,
  });

  const response = NextResponse.json({ ok: true, importMethod: importMethod || "skip" });
  response.cookies.set(getSessionCookieConfig(newSessionToken));
  return response;
});
