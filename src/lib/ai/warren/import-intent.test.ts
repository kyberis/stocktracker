import { describe, expect, it } from "vitest";
import {
  isImportOptionsPart,
  isWarrenImportIntent,
  WARREN_IMPORT_OPTIONS_PART,
} from "./import-intent";
import { warrenImportHref } from "@/lib/import-entry";

describe("isWarrenImportIntent", () => {
  it("matches the empty-home chip and the reported Spanish prompt", () => {
    expect(isWarrenImportIntent("quiero importar mi portfolio")).toBe(true);
    expect(isWarrenImportIntent("Import my portfolio")).toBe(true);
    expect(isWarrenImportIntent("Importar mi cartera")).toBe(true);
    expect(isWarrenImportIntent("import")).toBe(true);
    expect(isWarrenImportIntent("importar")).toBe(true);
  });

  it("matches broker / CSV wording in EN and ES", () => {
    expect(isWarrenImportIntent("import from my broker")).toBe(true);
    expect(isWarrenImportIntent("conectar mi bróker")).toBe(true);
    expect(isWarrenImportIntent("upload a CSV of my holdings")).toBe(true);
    expect(isWarrenImportIntent("trae mis posiciones del broker")).toBe(true);
  });

  it("does not treat add-stock chat as import", () => {
    expect(isWarrenImportIntent("I bought 10 AAPL at $150")).toBe(false);
    expect(isWarrenImportIntent("añade 7 acciones de Apple")).toBe(false);
    expect(isWarrenImportIntent("what is my portfolio worth?")).toBe(false);
    expect(isWarrenImportIntent("")).toBe(false);
  });
});

describe("import intent opens the existing /import surface", () => {
  it("maps picker actions to the live import wizard, not a parallel pipeline", () => {
    expect(isWarrenImportIntent("quiero importar mi portfolio")).toBe(true);
    expect(warrenImportHref({ type: "snaptrade", brokerSlug: "trading212" })).toContain(
      "/import?method=snaptrade_api",
    );
    expect(warrenImportHref({ type: "csv", guideId: "simple_csv" })).toContain(
      "method=broker_csv",
    );
    expect(warrenImportHref({ type: "manual" })).toBe("/import?method=manual");
  });

  it("uses a first-party importOptions part so the drawer can mount BrokerPickerGrid", () => {
    expect(isImportOptionsPart(WARREN_IMPORT_OPTIONS_PART)).toBe(true);
    expect(isImportOptionsPart({ kind: "summary" })).toBe(false);
  });
});
