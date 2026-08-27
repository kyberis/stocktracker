import { describe, expect, it } from "vitest";
import { formatAgentDockAlertBadge } from "./agent-dock-badge";

describe("formatAgentDockAlertBadge", () => {
  it("hides non-positive counts", () => {
    expect(formatAgentDockAlertBadge(0)).toBeNull();
    expect(formatAgentDockAlertBadge(-1)).toBeNull();
  });

  it("shows 1–9 as digits", () => {
    expect(formatAgentDockAlertBadge(1)).toBe("1");
    expect(formatAgentDockAlertBadge(9)).toBe("9");
  });

  it("caps at 9+", () => {
    expect(formatAgentDockAlertBadge(10)).toBe("9+");
    expect(formatAgentDockAlertBadge(99)).toBe("9+");
  });
});
