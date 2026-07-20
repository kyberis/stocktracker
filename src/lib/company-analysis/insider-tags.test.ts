import { describe, expect, it } from "vitest";
import { classifyInsiderTransaction } from "./insider-tags";

describe("classifyInsiderTransaction", () => {
  it("marks RSU / tax as neutral", () => {
    expect(classifyInsiderTransaction("RSU award")).toBe("tag-neutral");
    expect(classifyInsiderTransaction("Tax withholding")).toBe("tag-neutral");
    expect(classifyInsiderTransaction("Option exercise")).toBe("tag-neutral");
  });

  it("marks open-market buy/sell", () => {
    expect(classifyInsiderTransaction("Open market purchase")).toBe("tag-buy");
    expect(classifyInsiderTransaction("Sale")).toBe("tag-sell");
  });
});
