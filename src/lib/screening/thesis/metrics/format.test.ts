import { describe, expect, it } from "vitest";
import { formatMetricValue } from "./format";
import { truncateAtLastSentence } from "./truncate";

describe("truncateAtLastSentence", () => {
  it("does not cut mid-word when a period exists", () => {
    const text =
      "NRG Energy serves residential, commercial and industrial customers. " +
      "word ".repeat(80);
    const out = truncateAtLastSentence(text, 70);
    expect(out.endsWith(".")).toBe(true);
    expect(out).not.toMatch(/residential, com$/);
    expect(out.toLowerCase()).toMatch(/customers/);
  });
});

describe("format never leaks unit tokens", () => {
  it("formats x, pct, pp, usd", () => {
    expect(formatMetricValue(2.396, "x", "es")).toBe("2,4x");
    expect(formatMetricValue(-0.9, "pct", "es")).toBe("−0,9 %");
    expect(formatMetricValue(6.28, "pp", "es")).toBe("6,3 pp");
    expect(formatMetricValue(202.36, "usd", "es")).toBe("202,36 $");
  });
});
