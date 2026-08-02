import { describe, expect, it } from "vitest";
import { parseAidBriefingBullets, stripAidBriefingPrefix } from "./briefing-bullets";

describe("stripAidBriefingPrefix", () => {
  it("removes Morning briefing labels", () => {
    expect(stripAidBriefingPrefix("Morning briefing: AMZN leads")).toBe("AMZN leads");
    expect(stripAidBriefingPrefix("Morning brief: Markets steady")).toBe("Markets steady");
    expect(stripAidBriefingPrefix("Resumen matinal: Sube la cartera")).toBe("Sube la cartera");
  });
});

describe("parseAidBriefingBullets", () => {
  it("parses JSON bullets", () => {
    expect(
      parseAidBriefingBullets(JSON.stringify({ bullets: ["AMZN +15%", "Markets steady"] })),
    ).toEqual(["AMZN +15%", "Markets steady"]);
  });

  it("parses newline bullets and strips prefixes", () => {
    expect(
      parseAidBriefingBullets("Morning briefing: AMZN up 15%\nOverall markets stable"),
    ).toEqual(["AMZN up 15%", "Overall markets stable"]);
  });

  it("keeps a legacy single sentence as one bullet", () => {
    expect(
      parseAidBriefingBullets(
        "Morning briefing: The portfolio shows a notable increase with AMZN leading.",
      ),
    ).toEqual(["The portfolio shows a notable increase with AMZN leading."]);
  });
});
