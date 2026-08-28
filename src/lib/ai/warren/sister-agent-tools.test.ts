import { describe, expect, it, vi } from "vitest";

import { sisterAgentToolsEnabled } from "./sister-agent-tools";
import type { WarrenToolContext } from "./tools";

function baseCtx(overrides: Partial<WarrenToolContext> = {}): WarrenToolContext {
  return {
    userId: "u1",
    isDemo: false,
    baseCurrency: "EUR",
    emitPart: vi.fn(),
    emitProposal: vi.fn(),
    emitStep: vi.fn(),
    ...overrides,
  };
}

describe("sisterAgentToolsEnabled", () => {
  it("enables when idp sub is present", () => {
    expect(
      sisterAgentToolsEnabled(
        baseCtx({ officeIdentity: { idpSub: "sub1", email: "a@test.com", trefolioUserId: "u1" } }),
      ),
    ).toBe(true);
  });

  it("disables without identity", () => {
    expect(sisterAgentToolsEnabled(baseCtx())).toBe(false);
  });
});

describe("buildSisterAgentTools", () => {
  it("omits consultClaraSavings on the clara channel", async () => {
    const { buildSisterAgentTools } = await import("./sister-agent-tools");
    const tools = buildSisterAgentTools(
      baseCtx({
        channel: "clara",
        officeIdentity: { idpSub: "sub1", email: "a@test.com", trefolioUserId: "u1" },
      }),
    );
    expect("consultClaraSavings" in tools).toBe(false);
    expect("consultClara" in tools).toBe(false);
    expect("searchWillNotes" in tools).toBe(true);
  });

  it("includes consultClaraSavings on web", async () => {
    const { buildSisterAgentTools } = await import("./sister-agent-tools");
    const tools = buildSisterAgentTools(
      baseCtx({
        channel: "web",
        officeIdentity: { idpSub: "sub1", email: "a@test.com", trefolioUserId: "u1" },
      }),
    );
    expect("consultClaraSavings" in tools).toBe(true);
    expect("consultClara" in tools).toBe(true);
  });
});
