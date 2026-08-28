import { describe, expect, it } from "vitest";
import { fallbackCompose } from "@/lib/agent-board/compose-messages";
import type { AgentBoardSignal } from "@/lib/agent-board/types";

describe("fallbackCompose", () => {
  it("builds mover message in English", () => {
    const signals: AgentBoardSignal[] = [
      {
        agent: "warren",
        kind: "mover",
        contextKey: "mover:NVDA:2026-08-28",
        priority: 1,
        payload: { ticker: "NVDA", movePct: 4.2 },
        suggestedChipPrompt: "Tell me about NVDA",
      },
    ];
    const out = fallbackCompose(signals, "en");
    expect(out).toHaveLength(1);
    expect(out[0]?.body).toContain("NVDA");
    expect(out[0]?.chipLabel).toBe("NVDA");
  });

  it("builds Clara surplus message in Spanish", () => {
    const signals: AgentBoardSignal[] = [
      {
        agent: "clara",
        kind: "clara_surplus",
        contextKey: "clara_surplus:2026-08-28",
        priority: 3,
        payload: { surplusEur: 120 },
      },
    ];
    const out = fallbackCompose(signals, "es");
    expect(out[0]?.body).toContain("superávit");
  });
});
