import { NextResponse } from "next/server";
import { countDeviceInterest } from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";

export const GET = withMetrics("/api/device-interest/count", async () => {
  const total = await countDeviceInterest();
  return NextResponse.json({ total });
});
