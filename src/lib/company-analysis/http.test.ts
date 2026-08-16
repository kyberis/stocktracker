import { describe, expect, it } from "vitest";
import { COMPANY_ANALYSIS_RESPONSE_HEADERS } from "./http";

describe("COMPANY_ANALYSIS_RESPONSE_HEADERS", () => {
  it("forbids storing anonymous vs authenticated bodies under the same URL", () => {
    expect(COMPANY_ANALYSIS_RESPONSE_HEADERS["Cache-Control"]).toContain("no-store");
    expect(COMPANY_ANALYSIS_RESPONSE_HEADERS.Vary).toBe("Cookie");
  });
});
