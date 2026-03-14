const STORAGE_KEY = "trefolio_paywall_nudge";
const NUDGE_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface NudgeState {
  firstSeen: number;
  lastShown: number;
  dismissCount: number;
}

function getState(): NudgeState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as NudgeState;
  } catch {
    return null;
  }
}

function setState(state: NudgeState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* private browsing */ }
}

export function initNudgeTracking() {
  const existing = getState();
  if (!existing) {
    setState({ firstSeen: Date.now(), lastShown: 0, dismissCount: 0 });
  }
}

export function shouldShowPaywallNudge(): boolean {
  const state = getState();
  if (!state) return false;

  const now = Date.now();
  const usageDuration = now - state.firstSeen;
  if (usageDuration < NUDGE_INTERVAL_MS) return false;
  if (now - state.lastShown < NUDGE_INTERVAL_MS) return false;

  return true;
}

export function recordPaywallNudgeDismiss() {
  const state = getState() ?? { firstSeen: Date.now(), lastShown: 0, dismissCount: 0 };
  state.lastShown = Date.now();
  state.dismissCount += 1;
  setState(state);
}

export function recordPaywallNudgeShown() {
  const state = getState() ?? { firstSeen: Date.now(), lastShown: 0, dismissCount: 0 };
  state.lastShown = Date.now();
  setState(state);
}
