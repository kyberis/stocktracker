import { describe, expect, it } from "vitest";

import { buildWarrenSystemPrompt } from "./system-prompt";

describe("buildWarrenSystemPrompt — clara channel", () => {
  it("tells Warren it is answering through Clara and not to call consultClaraSavings", () => {
    const prompt = buildWarrenSystemPrompt({
      baseCurrency: "EUR",
      channel: "clara",
    });
    expect(prompt).toContain("through Clara");
    expect(prompt).toContain("consultClaraSavings");
    expect(prompt).toContain("Do **not** call");
    expect(prompt).not.toContain("in-app drawer from dashboard");
  });
});
