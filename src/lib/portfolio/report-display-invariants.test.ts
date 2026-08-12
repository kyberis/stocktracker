import { afterEach, describe, expect, it, vi } from "vitest";
import {
  reportDisplayInvariantViolations,
  resetDisplayInvariantReportStateForTests,
} from "./report-display-invariants";

describe("reportDisplayInvariantViolations", () => {
  afterEach(() => {
    resetDisplayInvariantReportStateForTests();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function stubBrowser(store: Record<string, string> = {}) {
    const fetchMock = vi.fn().mockResolvedValue({});
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("window", {
      sessionStorage: {
        getItem: (k: string) => store[k] ?? null,
        setItem: (k: string, v: string) => {
          store[k] = v;
        },
      },
    });
    return fetchMock;
  }

  it("does nothing when there are no violations", () => {
    const fetchMock = stubBrowser();
    reportDisplayInvariantViolations([], "home", 2);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts once per page load with privacy-safe metadata", () => {
    const fetchMock = stubBrowser();
    const violations = [{ code: "non_finite" as const, relErrorBps: 0 }];
    reportDisplayInvariantViolations(violations, "home", 3);
    reportDisplayInvariantViolations(violations, "home", 3);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.event).toBe("display_invariant_violation");
    expect(body.metadata).toEqual({
      codes: "non_finite",
      max_bps: "0",
      surface: "home",
      holding_bucket: "1-5",
    });
    expect(JSON.stringify(body)).not.toMatch(/EUR|ticker|totalCurrent|amountEUR/i);
  });

  it("skips when session already reported the same fingerprint", () => {
    const fetchMock = stubBrowser({ "trefolio:display_invariants:fp": "non_finite" });
    reportDisplayInvariantViolations([{ code: "non_finite", relErrorBps: 0 }], "home", 1);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
