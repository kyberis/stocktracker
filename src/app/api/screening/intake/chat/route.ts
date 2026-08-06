export const dynamic = "force-dynamic";
export const maxDuration = 60;

import type { NextRequest } from "next/server";
import { withMetrics } from "@/lib/with-metrics";
import { ok, parseBody } from "@/lib/api-response";
import { requireScreeningAccess } from "@/lib/screening/guard";
import { runIntakeAgent } from "@/lib/screening/intake-agent";
import { insertScreeningAgentOutput, findUserById } from "@/lib/db";
import { intakeChatRequestSchema } from "@/lib/screening/schemas";
import { recordScreeningIntakeTurn } from "@/lib/screening/metrics";
import type { SubscriptionPlan } from "@/lib/types";

/**
 * POST /api/screening/intake/chat
 *
 * One turn of the Intake agent. The client sends the full transcript plus its
 * best guess at the brief; the server replies with a `IntakeAgentOutput` whose
 * `brief` is authoritative for the next turn.
 *
 * The turn is persisted in `screening_agent_outputs` (agent_kind='intake',
 * run_id null until the user commits with POST /runs) so the Dev log button
 * can show what the agent actually said.
 */
export const POST = withMetrics(
  "/api/screening/intake/chat",
  async (req: NextRequest) => {
    const { session, error } = await requireScreeningAccess(req);
    if (error || !session) return error;

    const parsed = await parseBody(req, intakeChatRequestSchema);
    if (!parsed.success) return parsed.error;

    const user = await findUserById(session.userId);
    const plan = (user?.plan || "free") as SubscriptionPlan;

    const result = await runIntakeAgent({
      userId: session.userId,
      plan,
      intent: parsed.data.intent,
      locale: parsed.data.locale,
      suggestedInclude: parsed.data.suggestedInclude,
      suggestedExclude: parsed.data.suggestedExclude,
      messages: parsed.data.messages,
      currentBrief: parsed.data.brief,
      gatewayHeaders: req.headers,
    });

    recordScreeningIntakeTurn(result.output.status, parsed.data.intent, result.latencyMs);

    try {
      await insertScreeningAgentOutput({
        userId: session.userId,
        runId: null,
        agentKind: "intake",
        outputJson: result.logJson,
        latencyMs: result.latencyMs,
      });
    } catch (err_) {
      // Best-effort persistence; do not fail the user turn.
      console.error(
        "[screening/intake/chat] output persist failed",
        err_ instanceof Error ? err_.message : err_,
      );
    }

    if (result.output.status === "rejected_shape") {
      // Still return 200 with the envelope so the UI can show the agent message
      // and warnings. A 502 was wrongly treated as a hard failure while the
      // optimistic chip patch already updated the brief — users saw both
      // "agent did not respond" and a working conversation.
    }

    return ok({
      assistantText: result.output.assistantText,
      agent: {
        status: result.output.status,
        questions: result.output.questions,
        suggestions: result.output.suggestions,
        warnings: result.output.warnings,
        inferredFields: result.output.inferredFields,
      },
      brief: result.output.brief,
      latencyMs: result.latencyMs,
    });
  },
);
