import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { getSocialProfile, updateSocialProfile, isValidSlug, isSlugAvailable, trackEvent } from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";
import { requireSocialEnabled } from "@/lib/social-gate";

export const GET = withMetrics("/api/social/profile", async (request: NextRequest) => {
  const { session, error } = await requireSession(request);
  if (error || !session) return error!;
  const gated = await requireSocialEnabled(session.userId);
  if (gated) return gated;

  const profile = await getSocialProfile(session.userId);
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(profile);
});

export const PUT = withMetrics("/api/social/profile", async (request: NextRequest) => {
  const { session, error } = await requireSession(request);
  if (error || !session) return error!;
  const gated = await requireSocialEnabled(session.userId);
  if (gated) return gated;

  const body = await request.json();
  const { profileSlug, bio, headline, socialVisibility, sharePortfolioValue, shareHoldings, allowComments, experienceLevel } = body;

  if (profileSlug !== undefined) {
    if (profileSlug !== "" && !isValidSlug(profileSlug)) {
      return NextResponse.json({ error: "Invalid slug format. Use lowercase letters, numbers, and hyphens (3-40 chars)." }, { status: 400 });
    }
    if (profileSlug !== "") {
      const available = await isSlugAvailable(profileSlug, session.userId);
      if (!available) return NextResponse.json({ error: "This profile URL is already taken." }, { status: 409 });
    }
  }

  if (bio !== undefined && typeof bio === "string" && bio.length > 500) {
    return NextResponse.json({ error: "Bio must be 500 characters or less." }, { status: 400 });
  }

  await updateSocialProfile(session.userId, {
    profileSlug,
    bio,
    headline,
    socialVisibility: socialVisibility === "public" ? "public" : socialVisibility === "private" ? "private" : undefined,
    sharePortfolioValue: typeof sharePortfolioValue === "boolean" ? sharePortfolioValue : undefined,
    shareHoldings: typeof shareHoldings === "boolean" ? shareHoldings : undefined,
    allowComments: typeof allowComments === "boolean" ? allowComments : undefined,
    experienceLevel,
  });

  const fields = Object.keys(body).filter(k => body[k] !== undefined);
  await trackEvent(session.userId, "profile_edit", { fields: fields.join(",") }).catch(() => {});

  const updated = await getSocialProfile(session.userId);
  return NextResponse.json(updated);
});
