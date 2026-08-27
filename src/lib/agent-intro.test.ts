import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import {
  AGENT_INTRO_DAY_COOKIE,
  AGENT_INTRO_EXPERIMENT_KEY,
  AGENT_INTRO_SHOWN_DAY_STORAGE_KEY,
  clearAgentIntroShownDayMemory,
  hasAgentIntroShownThisSession,
  hasAgentIntroShownToday,
  isAgentIntroEngagementReady,
  isAgentIntroShownOnDay,
  isAgentIntroTreatment,
  localCalendarDay,
  markAgentIntroShownThisSession,
  markAgentIntroShownToday,
  parseAgentIntroDayCookie,
  resetAgentIntroEngagementSession,
  shouldBlockAgentIntro,
  shouldPlayAgentIntroAnimation,
} from "./agent-intro";

function stubBrowserStorage() {
  const sessionStore = new Map<string, string>();
  const localStore = new Map<string, string>();
  let cookie = "";
  const sessionStorage = {
    getItem: (key: string) => sessionStore.get(key) ?? null,
    setItem: (key: string, value: string) => {
      sessionStore.set(key, value);
    },
    removeItem: (key: string) => {
      sessionStore.delete(key);
    },
    clear: () => {
      sessionStore.clear();
    },
  };
  const localStorage = {
    getItem: (key: string) => localStore.get(key) ?? null,
    setItem: (key: string, value: string) => {
      localStore.set(key, value);
    },
    removeItem: (key: string) => {
      localStore.delete(key);
    },
    clear: () => {
      localStore.clear();
    },
  };
  const document = {
    get cookie() {
      return cookie;
    },
    set cookie(value: string) {
      const pair = value.split(";")[0] ?? "";
      const eq = pair.indexOf("=");
      if (eq < 0) return;
      const name = pair.slice(0, eq).trim();
      const val = pair.slice(eq + 1).trim();
      if (value.includes("max-age=0") || val === "") {
        cookie = cookie
          .split(";")
          .map((p) => p.trim())
          .filter((p) => p && !p.startsWith(`${name}=`))
          .join("; ");
        return;
      }
      const rest = cookie
        .split(";")
        .map((p) => p.trim())
        .filter((p) => p && !p.startsWith(`${name}=`));
      rest.push(`${name}=${val}`);
      cookie = rest.join("; ");
    },
  };
  vi.stubGlobal("window", {
    sessionStorage,
    localStorage,
    location: { protocol: "http:" },
  });
  vi.stubGlobal("sessionStorage", sessionStorage);
  vi.stubGlobal("localStorage", localStorage);
  vi.stubGlobal("document", document);
}

describe("agent-intro session", () => {
  beforeEach(() => {
    stubBrowserStorage();
    clearAgentIntroShownDayMemory();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    clearAgentIntroShownDayMemory();
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

describe("agent-intro once per local calendar day", () => {
  beforeEach(() => {
    stubBrowserStorage();
    clearAgentIntroShownDayMemory();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    clearAgentIntroShownDayMemory();
  });

  it("localCalendarDay is YYYY-MM-DD in local time", () => {
    expect(localCalendarDay(new Date(2026, 7, 28, 23, 59, 0))).toBe("2026-08-28");
    expect(localCalendarDay(new Date(2026, 0, 1, 0, 0, 0))).toBe("2026-01-01");
  });

  it("treats today as shown and yesterday as a new day", () => {
    const today = localCalendarDay(new Date(2026, 7, 28, 10, 0, 0));
    const yesterday = localCalendarDay(new Date(2026, 7, 27, 10, 0, 0));
    expect(today).toBe("2026-08-28");
    expect(yesterday).toBe("2026-08-27");
    expect(isAgentIntroShownOnDay(today, today)).toBe(true);
    expect(isAgentIntroShownOnDay(yesterday, today)).toBe(false);
    expect(isAgentIntroShownOnDay(null, today)).toBe(false);
  });

  it("parses the day cookie value only", () => {
    expect(parseAgentIntroDayCookie("2026-08-28")).toBe("2026-08-28");
    expect(parseAgentIntroDayCookie(`${AGENT_INTRO_DAY_COOKIE}=2026-08-28; path=/`)).toBe(
      "2026-08-28",
    );
    expect(parseAgentIntroDayCookie("not-a-date")).toBeNull();
    expect(parseAgentIntroDayCookie("")).toBeNull();
  });

  it("hasAgentIntroShownToday is true after mark and false for yesterday's stamp", () => {
    const now = new Date(2026, 7, 28, 15, 0, 0);
    expect(hasAgentIntroShownToday(now)).toBe(false);
    markAgentIntroShownToday(now);
    expect(hasAgentIntroShownToday(now)).toBe(true);
    expect(window.localStorage.getItem(AGENT_INTRO_SHOWN_DAY_STORAGE_KEY)).toBe("2026-08-28");
    expect(document.cookie).toContain(`${AGENT_INTRO_DAY_COOKIE}=2026-08-28`);

    clearAgentIntroShownDayMemory();
    window.localStorage.setItem(AGENT_INTRO_SHOWN_DAY_STORAGE_KEY, "2026-08-27");
    document.cookie = `${AGENT_INTRO_DAY_COOKIE}=2026-08-27; path=/; max-age=172800; SameSite=Lax`;
    expect(hasAgentIntroShownToday(now)).toBe(false);
  });

  const runningTreatment = {
    demoMode: false,
    dismissed: false,
    reducedMotion: false,
    experimentLoading: false,
    experimentPreviewing: false,
    experimentStatus: "running",
    treatment: true,
    alreadyShownToday: false,
  };

  it("skips blocking the dashboard when already shown today, even while the experiment is loading", () => {
    expect(
      shouldBlockAgentIntro({
        ...runningTreatment,
        experimentLoading: true,
        alreadyShownToday: true,
      }),
    ).toBe(false);
    expect(
      shouldPlayAgentIntroAnimation({
        ...runningTreatment,
        alreadyShownToday: true,
      }),
    ).toBe(false);
  });

  it("forceVariant still blocks and plays even if already shown today", () => {
    expect(
      shouldBlockAgentIntro({
        ...runningTreatment,
        forceVariant: "convergence",
        alreadyShownToday: true,
      }),
    ).toBe(true);
    expect(
      shouldPlayAgentIntroAnimation({
        ...runningTreatment,
        forceVariant: "briefing",
        alreadyShownToday: true,
      }),
    ).toBe(true);
  });

  it("still blocks while the experiment is loading on a first visit", () => {
    expect(
      shouldBlockAgentIntro({
        ...runningTreatment,
        experimentLoading: true,
        alreadyShownToday: false,
      }),
    ).toBe(true);
    expect(
      shouldPlayAgentIntroAnimation({
        ...runningTreatment,
        experimentLoading: true,
        alreadyShownToday: false,
      }),
    ).toBe(false);
  });
});
