import type { ScreeningStepRow } from "@/lib/db";

/**
 * Handler contract for the screening orchestrator (HLD §4.4). Each `agent_kind`
 * registers a handler that consumes a leased step and does its own persistence
 * (`screening_agent_outputs`, cache tables, etc.). The worker only cares about
 * ok/fail — the outputs table is the source of truth for the report.
 */

export interface HandlerContext {
  step: ScreeningStepRow;
  userId: string;
  runId: string;
  /**
   * Extra metadata carried from the run, e.g. brief JSON. Loaded once per
   * worker invocation before dispatching to save the handler a round-trip.
   */
  briefJson: string;
}

export interface HandlerSuccess {
  status: "ok";
  /** Optional structured summary appended to the StepCompleted event. */
  payload?: Record<string, unknown>;
}

export interface HandlerFailure {
  status: "error";
  errorMessage: string;
  /** True if the handler wants the step marked permanently failed even before MAX_STEP_ATTEMPTS. */
  fatal?: boolean;
}

export type HandlerResult = HandlerSuccess | HandlerFailure;

export type StepHandler = (ctx: HandlerContext) => Promise<HandlerResult>;

const handlers = new Map<string, StepHandler>();

export function registerHandler(agentKind: string, handler: StepHandler): void {
  handlers.set(agentKind, handler);
}

export function getHandler(agentKind: string): StepHandler | undefined {
  return handlers.get(agentKind);
}

export function listRegisteredKinds(): string[] {
  return [...handlers.keys()];
}
