import { describe, expect, it } from "vitest";
import {
  buildAmbiguousPositionWriteAppendix,
  buildExplicitDeleteHistoryAppendix,
  wantsAmbiguousPositionWriteIntent,
  wantsExplicitDeleteHistoryIntent,
} from "./position-write-intent";

describe("wantsExplicitDeleteHistoryIntent", () => {
  it("detects clear erase-history phrasing", () => {
    expect(wantsExplicitDeleteHistoryIntent("borra la posición de NOW")).toBe(true);
    expect(wantsExplicitDeleteHistoryIntent("elimina el historial de HOOD")).toBe(true);
    expect(wantsExplicitDeleteHistoryIntent("delete the holding NOW from my records")).toBe(true);
  });

  it("does not treat record-sale as delete", () => {
    expect(wantsExplicitDeleteHistoryIntent("registra la venta de NOW")).toBe(false);
  });
});

describe("wantsAmbiguousPositionWriteIntent", () => {
  it("flags vague drop/remove language", () => {
    expect(wantsAmbiguousPositionWriteIntent("quita HOOD")).toBe(true);
    expect(wantsAmbiguousPositionWriteIntent("elimina NOW")).toBe(true);
    expect(wantsAmbiguousPositionWriteIntent("saca ServiceNow")).toBe(true);
    expect(wantsAmbiguousPositionWriteIntent("remove HOOD")).toBe(true);
  });

  it("does not flag clear record or clear delete", () => {
    expect(wantsAmbiguousPositionWriteIntent("registra la venta de NOW")).toBe(false);
    expect(wantsAmbiguousPositionWriteIntent("borra la posición de NOW")).toBe(false);
  });

  it("does not flag advice questions", () => {
    expect(wantsAmbiguousPositionWriteIntent("¿debería vender NOW?")).toBe(false);
  });
});

describe("appendices", () => {
  it("ambiguous asks before proposing", () => {
    const appendix = buildAmbiguousPositionWriteAppendix("quita HOOD");
    expect(appendix).toContain("Do NOT call");
    expect(appendix).toContain("Record a sale");
    expect(appendix).toContain("Delete the position");
  });

  it("explicit delete forces removeHolding", () => {
    const appendix = buildExplicitDeleteHistoryAppendix("borra la posición NOW");
    expect(appendix).toContain("proposeRemoveHolding");
    expect(appendix).toContain("NEVER call `proposeRecordTransaction`");
  });
});
