import { describe, expect, it } from "vitest";
import { resolveAidMarketSession } from "@/lib/aid/resolve-market-session";

describe("resolveAidMarketSession", () => {
  it("shows open when a portfolio exchange is open (Friday 14:00 Madrid, BME)", () => {
    const friday14Madrid = new Date("2026-05-29T12:00:00.000Z");
    expect(
      resolveAidMarketSession([{ exchange: "BME", assetType: "stock" }], friday14Madrid),
    ).toBe("open");
  });

  it("shows pre-market for US-only holdings before NYSE open (Friday 14:00 Madrid)", () => {
    const friday14Madrid = new Date("2026-05-29T12:00:00.000Z");
    expect(
      resolveAidMarketSession([{ exchange: "NYSE", assetType: "stock" }], friday14Madrid),
    ).toBe("pre");
  });

  it("shows open at 14:00 UTC for US holdings (10:00 ET regular session)", () => {
    const friday14Utc = new Date("2026-05-29T14:00:00.000Z");
    expect(resolveAidMarketSession([{ exchange: "NYSE", assetType: "stock" }], friday14Utc)).toBe("open");
  });
});
