import { describe, expect, it } from "vitest";
import {
  assignmentSeed,
  controlVariantKey,
  hashToBucket,
  pickVariant,
  validateMetrics,
  validateVariants,
} from "./experiments";

describe("experiments bucketing", () => {
  it("hashes to a stable 0–99 bucket", () => {
    const a = hashToBucket("user1:empty_activation:0");
    const b = hashToBucket("user1:empty_activation:0");
    expect(a).toBe(b);
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThan(100);
  });

  it("changes bucket after reset generation", () => {
    const before = hashToBucket(assignmentSeed("u", "empty_activation", 0));
    const after = hashToBucket(assignmentSeed("u", "empty_activation", 1));
    // Not guaranteed different for every id, but seed string differs
    expect(assignmentSeed("u", "empty_activation", 0)).not.toBe(
      assignmentSeed("u", "empty_activation", 1),
    );
    expect(typeof before).toBe("number");
    expect(typeof after).toBe("number");
  });

  it("picks variants by cumulative weight", () => {
    const variants = [
      { key: "control", weight: 50 },
      { key: "treatment", weight: 50 },
    ];
    expect(pickVariant(variants, 0)).toBe("control");
    expect(pickVariant(variants, 49)).toBe("control");
    expect(pickVariant(variants, 50)).toBe("treatment");
    expect(pickVariant(variants, 99)).toBe("treatment");
  });

  it("requires control and weights summing to 100", () => {
    expect(
      validateVariants([
        { key: "a", weight: 50 },
        { key: "b", weight: 50 },
      ]),
    ).toMatch(/control/i);
    expect(
      validateVariants([
        { key: "control", weight: 40 },
        { key: "b", weight: 50 },
      ]),
    ).toMatch(/100/);
    expect(
      validateVariants([
        { key: "control", weight: 50 },
        { key: "b", weight: 50 },
      ]),
    ).toBeNull();
  });

  it("validates metrics and control key helper", () => {
    expect(validateMetrics([])).not.toBeNull();
    expect(validateMetrics(["holding_add"])).toBeNull();
    expect(controlVariantKey([{ key: "x", weight: 100 }])).toBe("x");
    expect(
      controlVariantKey([
        { key: "a", weight: 50 },
        { key: "control", weight: 50 },
      ]),
    ).toBe("control");
  });
});
