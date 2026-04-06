import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth/session";
import { getPublicProfileBySlug, isConnected, getConnectionBetween, trackEvent } from "@/lib/db";
import { requireSocialEnabled } from "@/lib/social-gate";

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const gated = await requireSocialEnabled();
  if (gated) return gated;

  const { slug } = await params;
  const profile = await getPublicProfileBySlug(slug);
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  let viewerId: string | null = null;
  let connectionStatus: string | null = null;
  let isOwner = false;

  try {
    const cookie = request.cookies.get("trefolio_session")?.value;
    if (cookie) {
      const session = await verifySessionToken(cookie);
      if (session) {
        viewerId = session.userId;
        isOwner = session.userId === profile.userId;
        if (!isOwner) {
          const connected = await isConnected(session.userId, profile.userId);
          connectionStatus = connected ? "connected" : null;
          if (!connected) {
            const conn = await getConnectionBetween(session.userId, profile.userId);
            if (conn?.status === "pending") connectionStatus = "pending";
          }
        }
      }
    }
  } catch {}

  if (profile.socialVisibility === "private" && !isOwner && connectionStatus !== "connected") {
    return NextResponse.json({
      userId: profile.userId,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
      profileSlug: profile.profileSlug,
      socialVisibility: "private",
      isPrivate: true,
    });
  }

  await trackEvent(profile.userId, "profile_view", { slug, viewerId: viewerId || "", isOwner: String(isOwner) }).catch(() => {});

  return NextResponse.json({
    ...profile,
    connectionStatus,
    isOwner,
  });
}
