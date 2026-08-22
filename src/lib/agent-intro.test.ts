import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  AGENT_INTRO_EXPERIMENT_KEY,
  hasAgentIntroShownThisSession,
  isAgentIntroEngagementReady,
  isAgentIntroTreatment,
  markAgentIntroShownThisSession,
  resetAgentIntroEngagementSession,
} from "./agent-intro";

describe("agent-intro session", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    const sessionStorage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => {
        store.clear();
      },
    };
    vi.stubGlobal("window", { sessionStorage });
    vi.stubGlobal("sessionStorage", sessionStorage);
  });

  it("tracks shown state per session", () => {
    expect(hasAgentIntroShownThisSession()).toBe(false);
    markAgentIntroShownThisSession();
    expect(hasAgentIntroShownThisSession()).toBe(true);
  });

  it("resets engagement session for each intro visit", () => {
    resetAgentIntroEngagementSession();
    expect(isAgentIntroEngagementReady()).toBe(false);
  });

  it("recognizes treatment variants", () => {
    expect(isAgentIntroTreatment("convergence")).toBe(true);
    expect(isAgentIntroTreatment("briefing")).toBe(true);
    expect(isAgentIntroTreatment("control")).toBe(false);
  });

  it("uses stable experiment key", () => {
    expect(AGENT_INTRO_EXPERIMENT_KEY).toBe("agent_intro");
  });
});
