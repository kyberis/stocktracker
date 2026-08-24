import { describe, expect, it } from "vitest";

import { extractSnapTradeHttpStatus, isSnapTradeNotFound } from "./snaptrade-http";

describe("extractSnapTradeHttpStatus", () => {
  it("reads statusCode", () => {
    expect(extractSnapTradeHttpStatus({ statusCode: 404 })).toBe(404);
  });

  it("reads axios response.status", () => {
    expect(extractSnapTradeHttpStatus({ response: { status: 404 } })).toBe(404);
  });

  it("parses message text", () => {
    expect(
      extractSnapTradeHttpStatus(
        new Error("Failed to remove brokerage connection: Request failed with status code 404"),
      ),
    ).toBe(404);
  });

  it("returns undefined when absent", () => {
    expect(extractSnapTradeHttpStatus(new Error("boom"))).toBeUndefined();
  });
});

describe("isSnapTradeNotFound", () => {
  it("is true only for 404", () => {
    expect(isSnapTradeNotFound({ statusCode: 404 })).toBe(true);
    expect(isSnapTradeNotFound({ statusCode: 500 })).toBe(false);
  });
});
