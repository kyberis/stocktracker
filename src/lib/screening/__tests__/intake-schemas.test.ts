import { describe, expect, it } from "vitest";
import {
  intakeAgentOutputSchema,
  intakeChatRequestSchema,
} from "../schemas";

describe("intakeAgentOutputSchema", () => {
  it("parses a well-formed agent envelope", () => {
    const parsed = intakeAgentOutputSchema.parse({
      status: "ok",
      assistantText: "Got it — keeping the preset.",
      brief: {
        intent: "explore",
        includeSectors: [],
        excludeSectors: [],
        regions: ["us_canada"],
        candidateCount: 5,
        criteria: [
          { key: "roic", condition: "> 12%", source: "preset" },
        ],
        endedEarly: false,
        locale: "es",
      },
      questions: [],
      warnings: [],
      inferredFields: ["candidateCount"],
    });
    expect(parsed.status).toBe("ok");
    expect(parsed.brief.criteria[0]?.key).toBe("roic");
  });

  it("rejects an unknown status", () => {
    const res = intakeAgentOutputSchema.safeParse({
      status: "banana",
      assistantText: "hi",
      brief: {
        intent: "explore",
        includeSectors: [],
        excludeSectors: [],
        regions: [],
        candidateCount: 5,
        criteria: [],
        endedEarly: false,
        locale: "en",
      },
    });
    expect(res.success).toBe(false);
  });

  it("caps clarification questions at 3", () => {
    const res = intakeAgentOutputSchema.safeParse({
      status: "needs_clarification",
      assistantText: "?",
      brief: {
        intent: "explore",
        includeSectors: [],
        excludeSectors: [],
        regions: [],
        candidateCount: 5,
        criteria: [],
        endedEarly: false,
        locale: "en",
      },
      questions: ["a", "b", "c", "d"],
    });
    expect(res.success).toBe(false);
  });
});

describe("intakeChatRequestSchema", () => {
  it("accepts a minimal chat request", () => {
    const res = intakeChatRequestSchema.safeParse({
      intent: "rebalance",
      locale: "es",
      messages: [{ role: "user", content: "quiero small cap" }],
    });
    expect(res.success).toBe(true);
  });

  it("rejects missing messages", () => {
    const res = intakeChatRequestSchema.safeParse({
      intent: "rebalance",
      locale: "es",
      messages: [],
    });
    expect(res.success).toBe(false);
  });
});
