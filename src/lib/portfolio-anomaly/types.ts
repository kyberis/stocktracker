import type {
  PortfolioAnomalyFinding,
  PortfolioAnomalySeverity,
} from "@/lib/types";

export type AnomalyScanFinding = PortfolioAnomalyFinding;

export type AnomalyScanResult = {
  userId: string;
  findings: AnomalyScanFinding[];
  severity: PortfolioAnomalySeverity;
  codes: string[];
  fingerprint: string;
};

export type AnomalyExplainResult = {
  aiExplanation: string;
  remediationPrompt: string;
};

export const TELEGRAM_ANOMALY_ACTIONS = [
  { id: "ack", label: "Ack" },
  { id: "apply_safe_fix", label: "Apply safe fix" },
  { id: "dismiss", label: "Dismiss" },
] as const;

export type TelegramAnomalyActionId = (typeof TELEGRAM_ANOMALY_ACTIONS)[number]["id"];
