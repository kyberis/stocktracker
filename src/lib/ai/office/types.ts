export type OfficeAgentId = "warren" | "clara" | "will";

export type AgentMissionStepStatus = "pending" | "ready" | "done" | "skipped" | "blocked" | "cancelled";

export type AgentMissionStepKind =
  | "clara_release_savings"
  | "warren_add_cash"
  | "warren_add_holding"
  | "will_log_note";

export interface AgentMissionStep {
  step: number;
  agent: OfficeAgentId;
  agentLabel: string;
  action: string;
  status: AgentMissionStepStatus;
  kind: AgentMissionStepKind;
  requiresStep?: number;
  payload?: Record<string, unknown>;
}

export type AgentMissionStatus = "active" | "completed" | "cancelled";

export interface AgentMissionRecord {
  id: string;
  userId: string;
  title: string;
  description: string;
  status: AgentMissionStatus;
  steps: AgentMissionStep[];
  createdAt: string;
  updatedAt: string;
}

export interface OfficeCoordinationLine {
  from: OfficeAgentId;
  to: OfficeAgentId;
  summary: string;
}

export interface OfficeChatMessage {
  id: string;
  role: "user" | OfficeAgentId;
  content: string;
  createdAt: string;
}

export type OfficeStreamFrame =
  | { kind: "message"; role: "user" | OfficeAgentId; content: string; createdAt?: string; streamId?: string }
  | { kind: "message_delta"; role: OfficeAgentId; delta: string; streamId: string }
  | { kind: "warren_part"; part: import("@/lib/ai/warren/types").WarrenPart }
  | { kind: "warren_proposal"; proposal: import("@/lib/ai/warren/types").WarrenProposal }
  | { kind: "warren_tool_step"; label: string }
  | { kind: "coordination"; lines: OfficeCoordinationLine[] }
  | { kind: "mission"; mission: AgentMissionRecord }
  | { kind: "error"; message: string };

export interface ClaraSavingsSummary {
  available: boolean;
  emergencyBalanceEur?: number;
  emergencyTargetEur?: number;
  surplusEur?: number;
  freeInInvestingBucketEur?: number;
  note?: string;
}

export interface WillNoteHit {
  available: boolean;
  excerpt?: string;
  noteDate?: string;
  query?: string;
  note?: string;
}

export interface WillTagInsight {
  label: string;
  date?: string;
}

export interface WillRecentTagsHit {
  available: boolean;
  tags: WillTagInsight[];
  excerpt?: string;
  noteDate?: string;
  note?: string;
}

export interface SectorGap {
  label: string;
  currentPct: number;
  targetPct: number;
  gapEur: number;
}
