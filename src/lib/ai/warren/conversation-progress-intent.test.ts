import { describe, expect, it } from "vitest";

import {
  buildConversationProgressAppendix,
  wantsConversationProgress,
  warrenThreadFromModelMessages,
} from "./conversation-progress-intent";

describe("wantsConversationProgress", () => {
  it("does not fire on the first user turn", () => {
    expect(
      wantsConversationProgress([{ role: "user", content: "qué stocks parecen caras" }]),
    ).toBe(false);
  });

  it("does not fire without a prior assistant turn", () => {
    expect(
      wantsConversationProgress([
        { role: "user", content: "hola" },
        { role: "user", content: "sí" },
      ]),
    ).toBe(false);
  });

  it("fires when the user accepts a prior offer with sí", () => {
    expect(
      wantsConversationProgress([
        { role: "user", content: "qué stocks parecen caras" },
        {
          role: "assistant",
          content: "UBER y OXY están cerca de fair. ¿Quieres que te ayude a decidir?",
        },
        { role: "user", content: "sí" },
      ]),
    ).toBe(true);
  });

  it("fires when the user accepts and asks to sell the lowest-upside name", () => {
    expect(
      wantsConversationProgress([
        { role: "user", content: "cuáles parecen caras" },
        {
          role: "assistant",
          content: "GOOGL se ve cara. ¿Quieres que te ayude a decidir cuál vender primero?",
        },
        {
          role: "user",
          content: "si, porque quiero vender alguna y quiero aquella con menos margen de subida",
        },
      ]),
    ).toBe(true);
  });

  it("fires on a ranking ask after any prior assistant reply", () => {
    expect(
      wantsConversationProgress([
        { role: "user", content: "analiza mi cartera" },
        { role: "assistant", content: "Estas son las posiciones principales." },
        { role: "user", content: "ordénalas por upside al target" },
      ]),
    ).toBe(true);
  });

  it("does not treat a wrap-up ok as progress", () => {
    expect(
      wantsConversationProgress([
        { role: "user", content: "cuáles parecen caras" },
        { role: "assistant", content: "UBER está cerca de fair. ¿Quieres que te ayude a decidir?" },
        { role: "user", content: "ok" },
      ]),
    ).toBe(false);
  });
});

describe("buildConversationProgressAppendix", () => {
  it("returns the proceed override when the user accepted", () => {
    const appendix = buildConversationProgressAppendix([
      { role: "user", content: "caras?" },
      { role: "assistant", content: "Want me to rank them by upside?" },
      { role: "user", content: "yes" },
    ]);
    expect(appendix).toContain("Do NOT call `analyzeValuation` again");
    expect(appendix).toContain("Do NOT repeat the expensive/fair/cheap");
    expect(appendix).toContain("renderTradeGuidanceCard");
    expect(appendix).toContain("NEVER `proposeAddCash`");
  });

  it("returns null on a first-turn valuation question", () => {
    expect(
      buildConversationProgressAppendix([{ role: "user", content: "qué stocks parecen caras" }]),
    ).toBeNull();
  });
});

describe("warrenThreadFromModelMessages", () => {
  it("keeps user and assistant text and skips other roles", () => {
    expect(
      warrenThreadFromModelMessages([
        { role: "system", content: "ignore" },
        { role: "user", content: "hola" },
        { role: "assistant", content: [{ type: "text", text: "listo" }] },
      ]),
    ).toEqual([
      { role: "user", content: "hola" },
      { role: "assistant", content: "listo" },
    ]);
  });
});
