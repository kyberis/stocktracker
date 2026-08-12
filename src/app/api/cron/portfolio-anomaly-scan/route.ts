import { NextRequest } from "next/server";

import { verifyCronAuth, withCronLogging } from "@/lib/cron-logging";
import { runPortfolioAnomalyScan } from "@/lib/portfolio-anomaly";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const runPortfolioAnomalyScanCron = withCronLogging("portfolio-anomaly-scan", async () => {
  return runPortfolioAnomalyScan({
    maxLlmExplanations: 40,
    notify: true,
  });
});

export async function GET(req: NextRequest) {
  const denied = verifyCronAuth("portfolio-anomaly-scan", req);
  if (denied) return denied;
  return runPortfolioAnomalyScanCron();
}

export async function POST(req: NextRequest) {
  return GET(req);
}
