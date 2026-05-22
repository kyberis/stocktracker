import { addCashEntry } from "@/lib/db";
import { getAgentMissionById, updateAgentMissionSteps } from "@/lib/db/agent-office";
import { proposeClaraSavingsRelease } from "./clara-client";
import { createWillOfficeNote } from "./will-client";
import { stubClaraRelease, stubWillNote } from "./orchestrator";
import type { AgentMissionRecord, AgentMissionStep } from "./types";

export interface ConfirmMissionStepResult {
  ok: boolean;
  message: string;
  mission?: AgentMissionRecord;
}

function unlockNextSteps(steps: AgentMissionStep[], completedStep: number): AgentMissionStep[] {
  return steps.map((s) => {
    if (s.step === completedStep) return { ...s, status: "done" as const };
    if (s.requiresStep === completedStep && s.status === "blocked") {
      return { ...s, status: "ready" as const };
    }
    return s;
  });
}

export async function confirmAgentMissionStep(opts: {
  userId: string;
  idpSub: string;
  missionId: string;
  stepNumber: number;
  portfolioId?: string;
}): Promise<ConfirmMissionStepResult> {
  const mission = await getAgentMissionById(opts.userId, opts.missionId);
  if (!mission) return { ok: false, message: "Mission not found" };
  if (mission.status !== "active") return { ok: false, message: "Mission not active" };

  const step = mission.steps.find((s) => s.step === opts.stepNumber);
  if (!step) return { ok: false, message: "Step not found" };
  if (step.status === "done") return { ok: true, message: "Already confirmed", mission };
  if (step.status === "blocked") return { ok: false, message: "Complete the previous step first" };

  switch (step.kind) {
    case "clara_release_savings": {
      const amountEur = Number(step.payload?.amountEur ?? 0);
      let result = await proposeClaraSavingsRelease(opts.idpSub, amountEur);
      if (!result.ok) result = stubClaraRelease(amountEur);
      if (!result.ok) return { ok: false, message: result.message };
      break;
    }
    case "warren_add_cash": {
      const amountEur = Number(step.payload?.amountEur ?? 0);
      const sector = String(step.payload?.sector || "Investing");
      await addCashEntry(
        opts.userId,
        {
          name: `Office: ${sector}`,
          amountEUR: amountEur,
          type: "cash",
          displayCurrency: "EUR",
        },
        opts.portfolioId,
      );
      break;
    }
    case "warren_add_holding":
      return { ok: false, message: "ETF proposals from Office are not wired yet — use Warren drawer." };
    case "will_log_note": {
      const text = String(step.payload?.text || "Office mission note");
      let result = await createWillOfficeNote(opts.idpSub, text);
      if (!result.ok) result = stubWillNote(text);
      if (!result.ok) return { ok: false, message: result.message };
      break;
    }
    default:
      return { ok: false, message: "Unknown step kind" };
  }

  let nextSteps = unlockNextSteps(mission.steps, opts.stepNumber);
  const allDone = nextSteps.every((s) => s.status === "done" || s.status === "skipped");
  const updated = await updateAgentMissionSteps(opts.userId, opts.missionId, nextSteps, allDone ? "completed" : "active");

  return {
    ok: true,
    message: "Step confirmed",
    mission: updated ?? undefined,
  };
}

export async function skipAgentMissionStep(opts: {
  userId: string;
  missionId: string;
  stepNumber: number;
}): Promise<ConfirmMissionStepResult> {
  const mission = await getAgentMissionById(opts.userId, opts.missionId);
  if (!mission) return { ok: false, message: "Mission not found" };

  const nextSteps = mission.steps.map((s) =>
    s.step === opts.stepNumber ? { ...s, status: "skipped" as const } : s,
  );
  const updated = await updateAgentMissionSteps(opts.userId, opts.missionId, nextSteps, mission.status);
  return { ok: true, message: "Step skipped", mission: updated ?? undefined };
}

export async function cancelAgentMission(opts: {
  userId: string;
  missionId: string;
}): Promise<ConfirmMissionStepResult> {
  const mission = await getAgentMissionById(opts.userId, opts.missionId);
  if (!mission) return { ok: false, message: "Mission not found" };

  const nextSteps = mission.steps.map((s) =>
    s.status === "done" ? s : { ...s, status: "cancelled" as const },
  );
  const updated = await updateAgentMissionSteps(opts.userId, opts.missionId, nextSteps, "cancelled");
  return { ok: true, message: "Mission cancelled", mission: updated ?? undefined };
}
