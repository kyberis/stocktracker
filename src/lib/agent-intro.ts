/** Sticky A/B experiment: control | convergence | briefing */
export const AGENT_INTRO_EXPERIMENT_KEY = "agent_intro";

export type AgentIntroVariant = "control" | "convergence" | "briefing";

export function isAgentIntroTreatment(variant: string): variant is Exclude<AgentIntroVariant, "control"> {
  return variant === "convergence" || variant === "briefing";
}

const SESSION_KEY = "trefolio:agent_intro_shown";
const ENGAGEMENT_READY_KEY = "trefolio:agent_intro_engagement_ready";
const POST_ACTION_KEY = "trefolio:agent_intro_post_action_done";

export function hasAgentIntroShownThisSession(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

export function markAgentIntroShownThisSession(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    // sessionStorage may be unavailable
  }
}

export function markAgentIntroEngagementReady(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(ENGAGEMENT_READY_KEY, "1");
  } catch {
    // ignore
  }
}

export function isAgentIntroEngagementReady(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(ENGAGEMENT_READY_KEY) === "1";
  } catch {
    return false;
  }
}

export function hasAgentIntroPostActionRecorded(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(POST_ACTION_KEY) === "1";
  } catch {
    return false;
  }
}

export function markAgentIntroPostActionRecorded(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(POST_ACTION_KEY, "1");
  } catch {
    // ignore
  }
}

export function prefersReducedMotionIntro(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
