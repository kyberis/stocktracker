import { describe, expect, it } from "vitest";
import { buildNavMenuIndex, filterNavMenuItems, type NavMenuItem } from "./nav-menu-search";

const sampleIndex = () =>
  buildNavMenuIndex({
    holdingsLabel: "Holdings",
    toolsLabel: "Tools",
    newsLabel: "News",
    importLabel: "Import",
    widgetSetupLabel: "Home screen widget",
    viewLinks: [
      { id: "diversification", label: "Diversification", href: "/tools/taxonomy" },
      { id: "dividends", label: "Dividends", href: "/tools/dividends" },
      { id: "metrics", label: "Performance", href: "/tools/performance", tierBadge: "pro" },
      { id: "growth", label: "Growth", href: "/tools/projection", tierBadge: "pro" },
      { id: "events", label: "Events", href: "/tools/events" },
    ],
    tools: [
      { id: "dividends", label: "Dividends (tool)", href: "/tools/dividends" },
      { id: "taxonomy", label: "Classification", href: "/tools/taxonomy" },
      { id: "performance", label: "Return metrics", href: "/tools/performance", tierBadge: "pro" },
      { id: "screener", label: "Screener", href: "/tools/screener" },
      { id: "evaluation", label: "Moat Evaluation", href: "/tools/evaluation" },
      { id: "strategies", label: "Strategies", href: "/tools/strategies" },
    ],
  });

describe("buildNavMenuIndex", () => {
  it("includes core, views, extras, and unique tools", () => {
    const items = sampleIndex();
    const ids = items.map((i) => i.id);
    expect(ids).toContain("core-holdings");
    expect(ids).toContain("core-tools");
    expect(ids).toContain("view-dividends");
    expect(ids).toContain("extra-news");
    expect(ids).toContain("extra-import");
    expect(ids).toContain("extra-widget-setup");
    expect(ids).toContain("tool-screener");
    expect(ids).toContain("tool-evaluation");
    expect(ids).toContain("tool-strategies");
  });

  it("dedupes tools that share an href with a view (views label wins)", () => {
    const items = sampleIndex();
    const dividendHits = items.filter(
      (i) => i.kind === "href" && i.href === "/tools/dividends",
    );
    expect(dividendHits).toHaveLength(1);
    expect(dividendHits[0].id).toBe("view-dividends");
    expect(dividendHits[0].label).toBe("Dividends");

    expect(items.some((i) => i.id === "tool-dividends")).toBe(false);
    expect(items.some((i) => i.id === "tool-taxonomy")).toBe(false);
    expect(items.some((i) => i.id === "tool-performance")).toBe(false);
  });

  it("preserves disabled flag on view links", () => {
    const items = buildNavMenuIndex({
      holdingsLabel: "Holdings",
      toolsLabel: "Tools",
      newsLabel: "News",
      importLabel: "Import",
      viewLinks: [
        {
          id: "diversification",
          label: "Diversification",
          href: "/tools/taxonomy",
          disabled: true,
        },
      ],
      tools: [],
    });
    const view = items.find((i) => i.id === "view-diversification");
    expect(view?.disabled).toBe(true);
  });
});

describe("filterNavMenuItems", () => {
  const items = sampleIndex();

  it("returns empty for blank query", () => {
    expect(filterNavMenuItems(items, "")).toEqual([]);
    expect(filterNavMenuItems(items, "   ")).toEqual([]);
  });

  it("matches case-insensitively on label substring", () => {
    const hits = filterNavMenuItems(items, "moat");
    expect(hits.map((i) => i.id)).toEqual(["tool-evaluation"]);
  });

  it("matches multiple items", () => {
    const hits = filterNavMenuItems(items, "div");
    expect(hits.some((i: NavMenuItem) => i.id === "view-dividends")).toBe(true);
    expect(hits.some((i: NavMenuItem) => i.id === "view-diversification")).toBe(true);
  });

  it("returns empty when nothing matches", () => {
    expect(filterNavMenuItems(items, "zzzzz")).toEqual([]);
  });
});
