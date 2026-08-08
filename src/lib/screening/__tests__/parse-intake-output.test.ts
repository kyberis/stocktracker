import { describe, expect, it } from "vitest";
import {
  coerceIntakeAgentPayload,
  extractJsonPayload,
  tryRepairTruncatedJson,
} from "../parse-intake-output";

describe("coerceIntakeAgentPayload", () => {
  it("accepts messy LLM output with null arrays and stringy candidateCount", () => {
    const out = coerceIntakeAgentPayload(
      {
        status: "needs_clarification",
        assistantText: "I recommend market cap 300–15,000M USD. Keep it?",
        brief: {
          intent: "rebalance",
          includeSectors: null,
          excludeSectors: ["Technology"],
          regions: null,
          candidateCount: "5",
          criteria: [
            { key: "marketCap", condition: "300 – 15,000M USD", source: "recommended" },
            { key: "roic", condition: "> 12%", source: "preset" },
            { key: "", condition: "bad" },
          ],
          endedEarly: false,
          locale: "en",
        },
        questions: null,
        suggestions: [
          { label: "Keep it", say: "Keep 300–15,000M USD." },
          { label: "  ", say: "x" },
        ],
        warnings: null,
      },
      { intent: "rebalance", locale: "en" },
    );
    expect(out).not.toBeNull();
    expect(out!.status).toBe("needs_clarification");
    expect(out!.brief.candidateCount).toBe(5);
    expect(out!.brief.includeSectors).toEqual([]);
    expect(out!.brief.excludeSectors).toEqual(["Technology"]);
    // Unknown source coerced to chat
    expect(out!.brief.criteria.find((c) => c.key === "marketCap")?.source).toBe("chat");
    expect(out!.brief.criteria).toHaveLength(2);
    expect(out!.suggestions).toHaveLength(1);
  });

  it("returns null without assistantText", () => {
    expect(
      coerceIntakeAgentPayload(
        { status: "ok", brief: {} },
        { intent: "explore", locale: "en" },
      ),
    ).toBeNull();
  });

  it("maps message → assistantText", () => {
    const out = coerceIntakeAgentPayload(
      { status: "ok", message: "Ready to launch.", brief: { candidateCount: 4 } },
      { intent: "explore", locale: "es" },
    );
    expect(out?.assistantText).toBe("Ready to launch.");
    expect(out?.brief.locale).toBe("es");
    expect(out?.brief.candidateCount).toBe(5);
  });
});

describe("extractJsonPayload / tryRepairTruncatedJson", () => {
  it("strips fences", () => {
    expect(extractJsonPayload('```json\n{"a":1}\n```')).toBe('{"a":1}');
  });

  it("repairs truncated object", () => {
    const raw = '{"status":"ok","assistantText":"hi","brief":{"intent":"explore"';
    const repaired = tryRepairTruncatedJson(raw);
    expect(repaired).not.toBeNull();
    expect(JSON.parse(repaired!)).toMatchObject({
      status: "ok",
      assistantText: "hi",
    });
  });
});
