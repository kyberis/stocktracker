import { describe, expect, it } from "vitest";
import {
  buildRecordTransactionPrefetchAppendix,
  wantsRecordTransactionIntent,
} from "./record-transaction-intent";

describe("wantsRecordTransactionIntent", () => {
  it("detects Spanish register-sale phrases", () => {
    expect(wantsRecordTransactionIntent("Registra la transacción venta")).toBe(true);
    expect(wantsRecordTransactionIntent("registra la venta de NOW")).toBe(true);
    expect(wantsRecordTransactionIntent("anota la venta de ServiceNow")).toBe(true);
  });

  it("detects English record-sale phrases", () => {
    expect(wantsRecordTransactionIntent("Record this sale of NOW")).toBe(true);
    expect(wantsRecordTransactionIntent("log the sell transaction")).toBe(true);
  });

  it("ignores explicit delete-position requests", () => {
    expect(wantsRecordTransactionIntent("borra la posición de NOW")).toBe(false);
    expect(wantsRecordTransactionIntent("delete the holding NOW")).toBe(false);
  });

  it("ignores pure advice questions", () => {
    expect(wantsRecordTransactionIntent("¿debería vender NOW?")).toBe(false);
    expect(wantsRecordTransactionIntent("should I sell ServiceNow?")).toBe(false);
  });
});

describe("buildRecordTransactionPrefetchAppendix", () => {
  it("forces proposeRecordTransaction and bans removeHolding", () => {
    const appendix = buildRecordTransactionPrefetchAppendix("Registra la venta de NOW 15 acciones");
    expect(appendix).toContain("proposeRecordTransaction");
    expect(appendix).toContain('type: "sell"');
    expect(appendix).toContain("NEVER call `proposeRemoveHolding`");
    expect(appendix).toContain("listHoldings");
  });

  it("returns null when intent does not match", () => {
    expect(buildRecordTransactionPrefetchAppendix("borra la posición NOW")).toBeNull();
  });
});
