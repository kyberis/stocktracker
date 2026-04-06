import { NextResponse } from "next/server";
import { isFeatureEnabled, isFeatureEnabledForUser } from "@/lib/db";

const DISABLED_RESPONSE = NextResponse.json(
  { error: "Social features are not available" },
  { status: 404 },
);

export async function requireSocialEnabled(userId?: string | null): Promise<NextResponse | null> {
  const enabled = userId
    ? await isFeatureEnabledForUser("social_network_enabled", userId)
    : await isFeatureEnabled("social_network_enabled");
  return enabled ? null : DISABLED_RESPONSE;
}
