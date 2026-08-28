import { describe, it, expect } from "vitest";
import { userHasWarren } from "./user-has-warren";

describe("userHasWarren", () => {
  it("exports a function", () => {
    expect(typeof userHasWarren).toBe("function");
  });
});
