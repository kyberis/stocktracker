import { NextRequest } from "next/server";
import { runAgentBoardCron } from "@/lib/agent-board/run-cron";
import { verifyCronAuth } from "@/lib/cron-logging";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const denied = verifyCronAuth("agent-board", req);
  if (denied) return denied;
  return runAgentBoardCron();
}

export async function POST(req: NextRequest) {
  const denied = verifyCronAuth("agent-board", req);
  if (denied) return denied;
  return runAgentBoardCron();
}
