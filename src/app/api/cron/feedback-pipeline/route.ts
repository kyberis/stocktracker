import { NextRequest } from "next/server";
import { withCronLogging, verifyCronAuth } from "@/lib/cron-logging";
import { runFeedbackPipelineWork } from "@/lib/feedback-pipeline";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const runFeedbackPipeline = withCronLogging("feedback-pipeline", runFeedbackPipelineWork);

function authorize(req: NextRequest) {
  return verifyCronAuth("feedback-pipeline", req);
}

export async function GET(req: NextRequest) {
  const denied = authorize(req);
  if (denied) return denied;
  return runFeedbackPipeline();
}

export async function POST(req: NextRequest) {
  const denied = authorize(req);
  if (denied) return denied;
  return runFeedbackPipeline();
}
