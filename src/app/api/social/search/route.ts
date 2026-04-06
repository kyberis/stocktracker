import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { searchPeople, getConnectionBetween } from "@/lib/db";
import { requireSocialEnabled } from "@/lib/social-gate";
import { withMetrics } from "@/lib/with-metrics";

export const GET = withMetrics("/api/social/search", async (request: NextRequest) => {
  const { session, error } = await requireSession(request);
  if (error || !session) return error!;

  const gated = await requireSocialEnabled(session.userId);
  if (gated) return gated;

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || "";
  const experienceLevel = searchParams.get("level") || undefined;
  const hasPosts = searchParams.get("hasPosts") === "true";
  const hasConnections = searchParams.get("hasConnections") === "true";
  const limit = parseInt(searchParams.get("limit") || "20");
  const offset = parseInt(searchParams.get("offset") || "0");

  const results = await searchPeople(query, {
    experienceLevel,
    hasPosts,
    hasConnections,
    viewerId: session.userId,
    limit,
    offset,
  });

  const enriched = await Promise.all(
    results.map(async (person) => {
      const conn = await getConnectionBetween(session.userId, person.userId);
      return { ...person, connectionStatus: conn?.status || null };
    })
  );

  return NextResponse.json({ results: enriched });
});
