import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  listHoldings: vi.fn(),
}));

vi.mock("./moat-screener-intent", () => ({
  buildMoatScreenerPrefetchAppendix: vi.fn().mockResolvedValue(null),
}));

vi.mock("./portfolio-holding-intent", () => ({
  buildPortfolioHoldingPrefetchAppendix: vi.fn().mockResolvedValue(null),
}));

vi.mock("./price-move-intent", () => ({
  buildPriceMovePrefetchAppendix: vi.fn().mockResolvedValue(null),
}));

import { buildWarrenPrefetchAppendix } from "./warren-prefetch-appendix";
import { buildPriceMovePrefetchAppendix } from "./price-move-intent";

describe("buildWarrenPrefetchAppendix", () => {
  it("prefers conversation-progress over a fresh valuation fetch", async () => {
    const appendix = await buildWarrenPrefetchAppendix("sí", {
      userId: "u1",
      recentMessages: [
        { role: "user", content: "qué stocks parecen caras" },
        {
          role: "assistant",
          content: "UBER está cerca de fair. ¿Quieres que te ayude a decidir?",
        },
        { role: "user", content: "sí" },
      ],
    });
    expect(appendix).toContain("User accepted a prior offer");
    expect(appendix).toContain("Do NOT call `analyzeValuation` again");
    expect(appendix).not.toContain("Call `analyzeValuation` ONCE");
  });

  it("still injects valuation instructions on a first-turn cheap/expensive ask", async () => {
    const appendix = await buildWarrenPrefetchAppendix("qué stocks parecen caras", {
      userId: "u1",
    });
    expect(appendix).toContain("Call `analyzeValuation` ONCE");
  });

  it("injects price-move appendix when that intent fires", async () => {
    vi.mocked(buildPriceMovePrefetchAppendix).mockResolvedValueOnce(
      "TASK OVERRIDE — Price-move / catalyst question detected:\nCall getMarketCatalysts",
    );
    const appendix = await buildWarrenPrefetchAppendix("Porque Sarabi gold bajo?", {
      userId: "u1",
    });
    expect(appendix).toContain("getMarketCatalysts");
  });

  it("forces recordTransaction override for registra la venta and skips valuation", async () => {
    const appendix = await buildWarrenPrefetchAppendix("Registra la transacción venta de NOW", {
      userId: "u1",
    });
    expect(appendix).toContain("proposeRecordTransaction");
    expect(appendix).toContain("NEVER call `proposeRemoveHolding`");
    expect(appendix).not.toContain("Call `analyzeValuation` ONCE");
  });
});
