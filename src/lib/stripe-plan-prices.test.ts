import { describe, expect, it } from "vitest";
import { planFromStripePriceId, planFromStripePriceKey, STRIPE_PRICE_ADMIN_FIELDS, stripePriceKeyForPlan } from "./stripe-plan-prices";
import type { StripePriceKey } from "./db/settings";

describe("STRIPE_PRICE_ADMIN_FIELDS", () => {
  it("covers every StripePriceKey exactly once", () => {
    const keys = STRIPE_PRICE_ADMIN_FIELDS.map((f) => f.key);
    const expected: StripePriceKey[] = [
      "stripe_price_basic_monthly",
      "stripe_price_basic_annual",
      "stripe_price_pro_monthly",
      "stripe_price_pro_annual",
      "stripe_price_wealth_monthly",
      "stripe_price_wealth_annual",
      "stripe_coupon_device_free_year",
      "stripe_price_screening_pack_1",
      "stripe_price_screening_pack_5",
    ];
    expect(keys.sort()).toEqual([...expected].sort());
  });
});

describe("stripePriceKeyForPlan", () => {
  it("maps paid plans to monthly/annual keys", () => {
    expect(stripePriceKeyForPlan("free", "monthly")).toBeNull();
    expect(stripePriceKeyForPlan("basic", "monthly")).toBe("stripe_price_basic_monthly");
    expect(stripePriceKeyForPlan("pro", "annual")).toBe("stripe_price_pro_annual");
    expect(stripePriceKeyForPlan("wealth", "monthly")).toBe("stripe_price_wealth_monthly");
  });
});

describe("planFromStripePriceKey", () => {
  it("reverses paid price keys", () => {
    expect(planFromStripePriceKey("stripe_price_basic_annual")).toBe("basic");
    expect(planFromStripePriceKey("stripe_price_pro_monthly")).toBe("pro");
    expect(planFromStripePriceKey("stripe_coupon_device_free_year")).toBeNull();
  });
});

describe("planFromStripePriceId", () => {
  const config = {
    stripe_price_basic_monthly: "price_basic_m",
    stripe_price_basic_annual: "",
    stripe_price_pro_monthly: "price_pro_m",
    stripe_price_pro_annual: "",
    stripe_price_wealth_monthly: "price_wealth_m",
    stripe_price_wealth_annual: "",
    stripe_coupon_device_free_year: "",
    stripe_price_screening_pack_1: "",
    stripe_price_screening_pack_5: "",
  } as const;

  it("prefers checkout metadata", () => {
    expect(planFromStripePriceId("price_pro_m", config, "wealth")).toBe("wealth");
  });

  it("maps configured price ids", () => {
    expect(planFromStripePriceId("price_basic_m", config)).toBe("basic");
    expect(planFromStripePriceId("price_unknown", config)).toBe("pro");
  });
});
