import type { DreamTeamAgent } from "@/lib/db/dream-team";

/** Parse @mentions from user input. Returns the agent and the cleaned message. */
export function parseAtMention(input: string): { agent: DreamTeamAgent | null; message: string } {
  const match = input.match(/^@(warren|clara|will)\b\s*/i);
  if (!match) return { agent: null, message: input.trim() };
  const agent = match[1].toLowerCase() as DreamTeamAgent;
  const message = input.slice(match[0].length).trim();
  return { agent, message };
}

/** Check if the input is a /schedule command */
export function parseScheduleCommand(input: string): {
  isSchedule: boolean;
  agent?: DreamTeamAgent;
  frequency?: string;
  time?: string;
  prompt?: string;
} {
  const match = input.match(/^\/schedule\s+@(warren|clara|will)\s+(daily|weekly|monthly)\s+(\d{1,2}:\d{2})\s+(.+)/i);
  if (!match) return { isSchedule: false };
  return {
    isSchedule: true,
    agent: match[1].toLowerCase() as DreamTeamAgent,
    frequency: match[2].toLowerCase(),
    time: match[3],
    prompt: match[4].trim(),
  };
}

/** Convert frequency + time to a cron expression */
export function toCronExpr(frequency: string, time: string): string {
  const [hour, minute] = time.split(":").map(Number);
  switch (frequency) {
    case "daily": return `${minute} ${hour} * * *`;
    case "weekly": return `${minute} ${hour} * * 1`;
    case "monthly": return `${minute} ${hour} 1 * *`;
    default: return `${minute} ${hour} * * *`;
  }
}
