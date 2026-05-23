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
