import { NextResponse } from "next/server";
import { countVerifiedUsers } from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";

export const dynamic = "force-dynamic";

export const GET = withMetrics("/api/landing/stats", async () => {
  const userCount = await countVerifiedUsers();
  return NextResponse.json({ userCount });
});
