import type { DreamTeamAgent } from "@/lib/db/dream-team";

export type DreamTeamStreamFrame =
  | { kind: "text"; delta: string }
  | { kind: "tool_step"; label: string }
  | { kind: "part"; part: unknown }
  | { kind: "proposal"; proposal: unknown }
  | { kind: "cross_agent_start"; fromAgent: DreamTeamAgent; toAgent: DreamTeamAgent; query: string }
  | { kind: "cross_agent_result"; fromAgent: DreamTeamAgent; toAgent: DreamTeamAgent; summary: string }
  | { kind: "followup"; question: string; quickReplies: string[] }
  | { kind: "error"; message: string }
  | { kind: "done" };

export interface AgentInvokeResult {
  text: string;
  parts: unknown[];
  proposals: unknown[];
}
