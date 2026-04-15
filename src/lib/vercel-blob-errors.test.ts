import { describe, expect, it } from "vitest";
import { httpResponseForBlobPutError } from "./vercel-blob-errors";

describe("httpResponseForBlobPutError", () => {
  it("returns 503 when the Blob store no longer exists", () => {
    const r = httpResponseForBlobPutError(new Error("Vercel Blob: This store does not exist."));
    expect(r.status).toBe(503);
    expect(r.error).toContain("Blob");
  });

  it("returns 503 for no token found", () => {
    const r = httpResponseForBlobPutError(new Error("No token found"));
    expect(r.status).toBe(503);
  });

  it("returns 500 for other errors", () => {
    const r = httpResponseForBlobPutError(new Error("Network timeout"));
    expect(r.status).toBe(500);
  });
});
