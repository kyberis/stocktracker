import { NextRequest } from "next/server";
import { verifyCronAuth, withCronLogging } from "@/lib/cron-logging";
import { syncZonaCatalogoFromIne } from "@/lib/real-estate-screening/services/ine";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const denied = verifyCronAuth("re-zona-sync", request);
  if (denied) return denied;
  const run = withCronLogging("re-zona-sync", async () => {
    const result = await syncZonaCatalogoFromIne();
    return { ...result };
  });
  return run();
}
