export type AgentBoardAgent = "warren" | "clara";

export type AgentBoardKind =
  | "market_open"
  | "mover"
  | "catalyst"
  | "recommendation"
  | "news"
  | "finpulse"
  | "earnings"
  | "alert"
  | "briefing"
  | "market_digest"
  | "weekly_digest"
  | "clara_surplus"
  | "clara_emergency"
  | "clara_month"
  | "clara_end_month"
  | "will_note"
  | "office_mission"
  | "concentration"
  | "near_52w";

export interface AgentBoardSignal {
  agent: AgentBoardAgent;
  kind: AgentBoardKind;
  contextKey: string;
  priority: number;
  /** Structured payload for the AI composer */
  payload: Record<string, string | number | boolean | null | string[]>;
  suggestedChipPrompt?: string;
}

export interface AgentBoardMessage {
  id: string;
  userId: string;
  agent: AgentBoardAgent;
  kind: AgentBoardKind;
  contextKey: string;
  body: string;
  chipLabel: string;
  chipPrompt: string;
  priority: number;
  readAt: string | null;
  dismissedAt: string | null;
  createdAt: string;
  expiresAt: string | null;
}

export interface AgentBoardComposeResult {
  agent: AgentBoardAgent;
  kind: AgentBoardKind;
  contextKey: string;
  body: string;
  chipLabel: string;
  chipPrompt: string;
  priority: number;
  signalsJson: string;
}
