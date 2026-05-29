import { describe, expect, it } from "vitest";
import {
  DEFAULT_AID_LAYOUT_EMPTY,
  DEFAULT_AID_LAYOUT_HOLDINGS,
  parseAidLayoutOrderJson,
  resolveAidLayout,
  serializeAidLayoutOrder,
} from "@/lib/aid/layout-sections";

describe("layout-sections", () => {
  it("returns defaults when stored layout is empty", () => {
    expect(resolveAidLayout({}, { isEmpty: false })).toEqual(DEFAULT_AID_LAYOUT_HOLDINGS);
    expect(resolveAidLayout("{}", { isEmpty: true })).toEqual(DEFAULT_AID_LAYOUT_EMPTY);
  });

  it("filters unknown ids and appends missing sections", () => {
    const resolved = resolveAidLayout(
      {
        main: ["portfolio", "unknown", "finpulse", "portfolio"],
        sidebar: ["clara", "warren"],
      },
      { isEmpty: false },
    );
    expect(resolved.main[0]).toBe("portfolio");
    expect(resolved.main[1]).toBe("finpulse");
    expect(resolved.main).toContain("briefing");
    expect(resolved.main).toHaveLength(DEFAULT_AID_LAYOUT_HOLDINGS.main.length);
    expect(resolved.sidebar[0]).toBe("clara");
    expect(resolved.sidebar[1]).toBe("warren");
    expect(resolved.sidebar[2]).toBe("will");
  });

  it("uses empty-state catalog when portfolio is empty", () => {
    const resolved = resolveAidLayout(
      { main: ["briefing", "finpulse"], sidebar: ["warren", "will", "clara"] },
      { isEmpty: true },
    );
    expect(resolved.main).toEqual(["finpulse", "empty_main", "shortcuts"]);
  });

  it("parses and serializes JSON", () => {
    const json = serializeAidLayoutOrder(DEFAULT_AID_LAYOUT_HOLDINGS);
    const parsed = parseAidLayoutOrderJson(json);
    expect(parsed.main?.[0]).toBe("briefing");
    expect(parseAidLayoutOrderJson("{bad json")).toEqual({});
  });
});
