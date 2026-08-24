import { describe, expect, it } from "vitest";
import {
  decodeAttachmentCsv,
  isImportableImage,
  isImportableSpreadsheetOrCsv,
} from "./import-parse";
import type { RawAttachment } from "./preprocess-attachments";

describe("warren import-parse helpers", () => {
  it("detects csv and excel attachments", () => {
    expect(isImportableSpreadsheetOrCsv("text/csv", "degiro.csv")).toBe(true);
    expect(
      isImportableSpreadsheetOrCsv(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "ops.xlsx",
      ),
    ).toBe(true);
    expect(isImportableSpreadsheetOrCsv("image/png", "shot.png")).toBe(false);
  });

  it("detects screenshot attachments", () => {
    expect(isImportableImage("image/png", "shot.png")).toBe(true);
    expect(isImportableImage("application/octet-stream", "photo.jpg")).toBe(true);
    expect(isImportableImage("text/csv", "a.csv")).toBe(false);
  });

  it("decodes utf-8 csv buffers", () => {
    const file: RawAttachment = {
      buffer: Buffer.from("ticker,type,price,amount,currency\nAAPL,buy,10,2,USD\n", "utf8"),
      mimeType: "text/csv",
      filename: "simple.csv",
    };
    expect(decodeAttachmentCsv(file)).toContain("AAPL");
  });
});
