import { describe, expect, it } from "vitest";

import {
  validateRawAttachments,
  WarrenAttachmentError,
} from "@/lib/ai/warren/preprocess-attachments";
import {
  WARREN_MAX_ATTACHMENT_BYTES,
  WARREN_MAX_FILES_PER_MESSAGE,
} from "@/lib/ai/warren/upload-limits";

describe("validateRawAttachments", () => {
  it("rejects too many files", () => {
    const files = Array.from({ length: WARREN_MAX_FILES_PER_MESSAGE + 1 }, (_, i) => ({
      buffer: Buffer.from("x"),
      mimeType: "text/plain",
      filename: `f${i}.txt`,
    }));
    expect(() => validateRawAttachments(files)).toThrow(WarrenAttachmentError);
  });

  it("rejects oversize image", () => {
    expect(() =>
      validateRawAttachments([
        {
          buffer: Buffer.alloc(WARREN_MAX_ATTACHMENT_BYTES.image + 1),
          mimeType: "image/png",
          filename: "x.png",
        },
      ]),
    ).toThrow(WarrenAttachmentError);
  });
});
