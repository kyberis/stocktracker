import { describe, expect, it } from "vitest";
import type { AgentBoardSignal } from "@/lib/agent-board/types";

describe("agent board signal keys", () => {
  it("uses stable context keys for dedupe", () => {
    const signal: AgentBoardSignal = {
      agent: "warren",
      kind: "mover",
      contextKey: "mover:AAPL:2026-08-28",
      priority: 2,
      payload: { ticker: "AAPL", movePct: 3.1 },
    };
    expect(signal.contextKey).toMatch(/^mover:AAPL:/);
  });
});
