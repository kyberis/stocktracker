import { NextRequest, NextResponse } from "next/server";
import {
  applyFeedbackPipelineDbUpdate,
  listFeedbackPendingAckEmail,
  listFeedbackReadyForAutoPipeline,
  markFeedbackAckEmailSent,
} from "@/lib/db/feedback";
import { findUserById, getUserSettings } from "@/lib/db";
import {
  buildFeedbackAutoAckAdminReply,
  feedbackMailLocaleFromAppLanguage,
  sendFeedbackAutoAckEmail,
} from "@/lib/email";
import { createLinearFeedbackIssue, isLinearConfigured } from "@/lib/linear";
import { withCronLogging, verifyCronAuth } from "@/lib/cron-logging";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const runFeedbackPipeline = withCronLogging("feedback-pipeline", async () => {
  let ackRetries = 0;
  let ackRetryErrors = 0;
  let pipelines = 0;
  let pipelineErrors = 0;

  const pendingAck = await listFeedbackPendingAckEmail();
  for (const row of pendingAck) {
    try {
      const user = await findUserById(row.userId);
      if (!user?.email) {
        await markFeedbackAckEmailSent(row.id);
        continue;
      }
      const settings = await getUserSettings(row.userId);
      const locale = feedbackMailLocaleFromAppLanguage(settings.language);
      const sent = await sendFeedbackAutoAckEmail(user.email, row.userId, row.subject, locale);
      if (sent.success) {
        await markFeedbackAckEmailSent(row.id);
        ackRetries++;
      } else {
        ackRetryErrors++;
      }
    } catch (e) {
      console.error(`[cron:feedback-pipeline] ack retry ${row.id}:`, e);
      ackRetryErrors++;
    }
  }

  if (!isLinearConfigured()) {
    return {
      ackRetries,
      ackRetryErrors,
      pipelines: 0,
      pipelineErrors: 0,
      skippedNewPipeline: true,
      reason: "LINEAR_API_KEY / LINEAR_TEAM_ID not set",
    };
  }

  const ready = await listFeedbackReadyForAutoPipeline();
  for (const row of ready) {
    try {
      const user = await findUserById(row.userId);
      if (!user?.email) {
        console.warn(`[cron:feedback-pipeline] skip ${row.id}: user has no email`);
        continue;
      }
      const settings = await getUserSettings(row.userId);
      const locale = feedbackMailLocaleFromAppLanguage(settings.language);
      const adminReply = buildFeedbackAutoAckAdminReply(locale, row.subject);

      const linear = await createLinearFeedbackIssue({
        feedbackId: row.id,
        subject: row.subject,
        message: row.message,
        type: row.type,
      });

      const updated = await applyFeedbackPipelineDbUpdate({
        feedbackId: row.id,
        adminReply,
        linearIssueId: linear.issueId,
        linearIssueUrl: linear.url,
      });
      if (!updated) {
        continue;
      }

      const sent = await sendFeedbackAutoAckEmail(user.email, row.userId, row.subject, locale);
      if (sent.success) {
        await markFeedbackAckEmailSent(row.id);
        pipelines++;
      } else {
        pipelineErrors++;
      }
    } catch (e) {
      console.error(`[cron:feedback-pipeline] pipeline ${row.id}:`, e);
      pipelineErrors++;
    }
  }

  return { ackRetries, ackRetryErrors, pipelines, pipelineErrors, skippedNewPipeline: false };
});

function authorize(req: NextRequest) {
  return verifyCronAuth("feedback-pipeline", req.headers.get("authorization"));
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
