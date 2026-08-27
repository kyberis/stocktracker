import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { StubPortalAdapter, validateSelectors } from "./portal";
import { classifyFlags, isHardExcluded } from "./flags";
import { extractUsableAreaM2 } from "./flags";
import { DEFAULT_SCREENING_PARAMS } from "../schemas";

const fixtures = join(process.cwd(), "src/lib/real-estate-screening/fixtures");

describe("portal fixtures", () => {
  it("search HTML still has the expected selectors", () => {
    const html = readFileSync(join(fixtures, "idealista-search.html"), "utf8");
    expect(validateSelectors(html, ["article.item", ".item-link", ".item-price", ".item-detail"])).toEqual([]);
  });

  it("parses sale listings and applies URL filters via the stub", async () => {
    const adapter = new StubPortalAdapter();
    const list = await adapter.buscarVentas(
      { geocod: "1B01512", nombre: "Setúbal" },
      DEFAULT_SCREENING_PARAMS,
    );
    expect(list.length).toBeGreaterThan(0);
    expect(list.every((l) => l.precio <= DEFAULT_SCREENING_PARAMS.presupuestoMaxEur)).toBe(true);
  });

  it("trap detail triggers hard flags and smaller usable area", async () => {
    const adapter = new StubPortalAdapter();
    const detail = await adapter.obtenerFicha("trap-usufruto-1");
    const flags = classifyFlags(detail.description);
    expect(isHardExcluded(flags)).toBe(true);
    const area = extractUsableAreaM2(detail.description, 90);
    expect(area.areaUsadaM2).toBe(60);
  });
});
