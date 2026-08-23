import { withCronLogging, verifyCronAuth } from "@/lib/cron-logging";
import {
  FINPULSE_CACHE_TTL_MS,
  finPulseNeedsIngest,
  ingestFinPulseFromTavily,
} from "@/lib/aid/build-finpulse";
import { listAidSocialPosts } from "@/lib/db";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const runFinPulse = withCronLogging("aid-finpulse", async () => {
  const existing = await listAidSocialPosts(1);
  if (!finPulseNeedsIngest(existing[0]?.fetchedAt, Date.now(), FINPULSE_CACHE_TTL_MS)) {
    return { generated: 0, skippedFresh: true };
  }
  const generated = await ingestFinPulseFromTavily(8);
  return { generated };
});

function authorize(req: NextRequest) {
  return verifyCronAuth("aid-finpulse", req);
}

export async function GET(req: NextRequest) {
  const denied = authorize(req);
  if (denied) return denied;
  return runFinPulse();
}

export async function POST(req: NextRequest) {
  const denied = authorize(req);
  if (denied) return denied;
  return runFinPulse();
}
