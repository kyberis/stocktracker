import { describe, expect, it } from "vitest";
import { resolveNavPlanChipKind } from "@/lib/nav-plan-chip";

describe("resolveNavPlanChipKind", () => {
  it("hides free CTA in top nav (home owns the Free upgrade button)", () => {
    expect(resolveNavPlanChipKind("free", true, "nav")).toBe("hidden");
  });

  it("shows free upgrade CTA under the name in studio sidebar", () => {
    expect(resolveNavPlanChipKind("free", true, "sidebar")).toBe("upgrade_cta");
  });

  it("links paid plans below Wealth to billing", () => {
    expect(resolveNavPlanChipKind("basic", true, "nav")).toBe("plan_link");
    expect(resolveNavPlanChipKind("pro", true, "nav")).toBe("plan_link");
  });

  it("shows Wealth as a static badge", () => {
    expect(resolveNavPlanChipKind("wealth", true, "nav")).toBe("plan_static");
  });

  it("falls back when commerce is off", () => {
    expect(resolveNavPlanChipKind("free", false, "nav")).toBe("hidden");
    expect(resolveNavPlanChipKind("free", false, "sidebar")).toBe("free_label");
    expect(resolveNavPlanChipKind("pro", false, "nav")).toBe("plan_static");
  });
});
