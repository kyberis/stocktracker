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
    expect(prompt).toContain("cash capacity");
    expect(prompt).toContain("not a licensed advisor");
    expect(prompt).not.toContain("in-app drawer from dashboard");
  });
});

describe("buildWarrenSystemPrompt — clover channel", () => {
  it("tells Clover to use consultClara for spending detail", () => {
    const prompt = buildWarrenSystemPrompt({
      baseCurrency: "EUR",
      channel: "clover",
    });
    expect(prompt).toContain("consultClara");
    expect(prompt).toContain("consultClaraSavings");
    expect(prompt).toContain("Do not tell them to open clara.trefolio.com when the tool returns text");
  });
});

describe("buildWarrenSystemPrompt — research tools", () => {
  it("requires search for insider / buyback / Buffett-buy questions", () => {
    const prompt = buildWarrenSystemPrompt({ baseCurrency: "EUR" });
    expect(prompt).toContain("insider / Form 4 / buybacks");
    expect(prompt).toContain("searchPublicWeb");
    expect(prompt).toContain("Do not answer \"I don't have that information\" without searching");
  });
});
