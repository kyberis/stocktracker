import { withCronLogging, verifyCronAuth } from "@/lib/cron-logging";
import { ingestFinPulseFromTavily } from "@/lib/aid/build-finpulse";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const runFinPulse = withCronLogging("aid-finpulse", async () => {
  const generated = await ingestFinPulseFromTavily(8);
  return { generated };
});

export async function GET(req: NextRequest) {
  const authError = verifyCronAuth("aid-finpulse", req);
  if (authError) return authError;
  return runFinPulse();
}
