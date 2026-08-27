/** Sticky A/B experiment: control | convergence | briefing */
export const AGENT_INTRO_EXPERIMENT_KEY = "agent_intro";

export const AGENT_INTRO_SHOWN_DAY_STORAGE_KEY = "trefolio:agent_intro_shown_day";
export const AGENT_INTRO_DAY_COOKIE = "trefolio_agent_intro_day";
const AGENT_INTRO_DAY_COOKIE_MAX_AGE = 60 * 60 * 48;
const CALENDAR_DAY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export type AgentIntroVariant = "control" | "convergence" | "briefing";

export function isAgentIntroTreatment(variant: string): variant is Exclude<AgentIntroVariant, "control"> {
  return variant === "convergence" || variant === "briefing";
}

/** Local calendar day `YYYY-MM-DD` (browser or server TZ of `now`). */
export function localCalendarDay(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function isAgentIntroShownOnDay(
  storedDay: string | null | undefined,
  day: string,
): boolean {
  return Boolean(storedDay && day && storedDay === day);
}

/** Accept a cookie value or a `document.cookie` snippet; date only, no user id. */
export function parseAgentIntroDayCookie(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  const value = trimmed.includes("=")
    ? trimmed.match(/(?:^|;\s*)trefolio_agent_intro_day=([^;]*)/i)?.[1] ?? trimmed
    : trimmed;
  try {
    const decoded = decodeURIComponent(value).trim();
    return CALENDAR_DAY_RE.test(decoded) ? decoded : null;
  } catch {
    return null;
  }
}

let shownDayMemory: string | null = null;

export function clearAgentIntroShownDayMemory(): void {
  shownDayMemory = null;
}

function readShownDayFromLocalStorage(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(AGENT_INTRO_SHOWN_DAY_STORAGE_KEY);
    return parseAgentIntroDayCookie(raw);
  } catch {
    return null;
  }
}

function readShownDayFromDocumentCookie(): string | null {
  if (typeof document === "undefined") return null;
  try {
    return parseAgentIntroDayCookie(document.cookie);
  } catch {
    return null;
  }
}

/**
 * True when the intro already played on this local calendar day.
 * Checks module memory, localStorage, then cookie (optional `cookieValue` for SSR).
 */
export function hasAgentIntroShownToday(
  now: Date = new Date(),
  cookieValue?: string | null,
): boolean {
  const today = localCalendarDay(now);
  if (isAgentIntroShownOnDay(shownDayMemory, today)) return true;
  if (isAgentIntroShownOnDay(parseAgentIntroDayCookie(cookieValue), today)) {
    shownDayMemory = today;
    return true;
  }
  if (isAgentIntroShownOnDay(readShownDayFromLocalStorage(), today)) {
    shownDayMemory = today;
    return true;
  }
  if (isAgentIntroShownOnDay(readShownDayFromDocumentCookie(), today)) {
    shownDayMemory = today;
    return true;
  }
  return false;
}

export function markAgentIntroShownToday(now: Date = new Date()): void {
  const today = localCalendarDay(now);
  shownDayMemory = today;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(AGENT_INTRO_SHOWN_DAY_STORAGE_KEY, today);
  } catch {
    // localStorage may be unavailable
  }
  try {
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${AGENT_INTRO_DAY_COOKIE}=${today}; path=/; max-age=${AGENT_INTRO_DAY_COOKIE_MAX_AGE}; SameSite=Lax${secure}`;
  } catch {
    // document.cookie may be unavailable
  }
}

export type AgentIntroGateDecisionInput = {
  demoMode: boolean;
  dismissed: boolean;
  forceVariant?: "convergence" | "briefing";
  reducedMotion: boolean;
  experimentLoading: boolean;
  experimentPreviewing: boolean;
  experimentStatus: string;
  treatment: boolean;
  alreadyShownToday: boolean;
};

/** Hide the dashboard behind the intro overlay. */
export function shouldBlockAgentIntro(input: AgentIntroGateDecisionInput): boolean {
  if (input.demoMode || input.dismissed) return false;
  if (input.forceVariant) return isAgentIntroTreatment(input.forceVariant);
  if (input.alreadyShownToday) return false;
  if (input.reducedMotion) return false;
  if (input.experimentLoading) return true;
  if (input.experimentPreviewing && input.treatment) return true;
  if (input.experimentStatus !== "running" || !input.treatment) return false;
  return true;
}

/** Play the treatment animation (admin `forceVariant` always plays). */
export function shouldPlayAgentIntroAnimation(input: AgentIntroGateDecisionInput): boolean {
  if (input.demoMode || input.dismissed) return false;
  if (input.forceVariant) return true;
  if (input.alreadyShownToday) return false;
  if (input.reducedMotion) return false;
  if (input.experimentLoading) return false;
  if (input.experimentPreviewing && input.treatment) return true;
  if (input.experimentStatus !== "running" || !input.treatment) return false;
  return true;
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

/** Reset per-visit engagement tracking when a new intro starts. */
export function resetAgentIntroEngagementSession(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(ENGAGEMENT_READY_KEY);
    window.sessionStorage.removeItem(POST_ACTION_KEY);
  } catch {
    // ignore
  }
}

export function prefersReducedMotionIntro(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
