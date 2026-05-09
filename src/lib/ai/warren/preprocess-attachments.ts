import type { UserContent } from "ai";

import { transcribeVoice } from "@/lib/ai/transcribe";
import {
  WARREN_AUDIO_MAX_DURATION_S,
  WARREN_CSV_TEXT_MAX_CHARS,
  WARREN_MAX_ATTACHMENT_BYTES,
  WARREN_MAX_COMBINED_ATTACHMENT_BYTES,
  WARREN_MAX_FILES_PER_MESSAGE,
  WARREN_IMAGE_MAX_EDGE_PX,
  type WarrenRejectReason,
} from "@/lib/ai/warren/upload-limits";
import { extractPdfText } from "@/lib/pdf/extract-text";

export class WarrenAttachmentError extends Error {
  constructor(
    message: string,
    readonly reason: WarrenRejectReason,
  ) {
    super(message);
    this.name = "WarrenAttachmentError";
  }
}

export interface RawAttachment {
  buffer: Buffer;
  mimeType: string;
  filename: string;
  /** Telegram voice duration when known (seconds). */
  audioDurationSec?: number;
}

function extLower(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i).toLowerCase() : "";
}

function isCsvLike(mime: string, filename: string): boolean {
  const m = mime.toLowerCase().split(";")[0]?.trim() ?? "";
  if (m === "text/csv" || m === "application/csv") return true;
  if (m === "text/plain" && filename.toLowerCase().endsWith(".csv")) return true;
  if (m === "application/vnd.ms-excel") return true;
  return extLower(filename) === ".csv";
}

function isPdf(mime: string, filename: string): boolean {
  const m = mime.toLowerCase().split(";")[0]?.trim() ?? "";
  return (
    m === "application/pdf" ||
    m === "application/x-pdf" ||
    extLower(filename) === ".pdf"
  );
}

function isAudio(mime: string): boolean {
  return mime.toLowerCase().startsWith("audio/");
}

function isImage(mime: string): boolean {
  return mime.toLowerCase().startsWith("image/");
}

export function validateRawAttachments(files: RawAttachment[]): void {
  if (files.length > WARREN_MAX_FILES_PER_MESSAGE) {
    throw new WarrenAttachmentError(
      `Too many files (max ${WARREN_MAX_FILES_PER_MESSAGE}).`,
      "too_many_files",
    );
  }
  let combined = 0;
  for (const f of files) {
    combined += f.buffer.length;
  }
  if (combined > WARREN_MAX_COMBINED_ATTACHMENT_BYTES) {
    throw new WarrenAttachmentError(
      `Attachments exceed combined size limit (${Math.round(WARREN_MAX_COMBINED_ATTACHMENT_BYTES / (1024 * 1024))} MiB).`,
      "combined_too_large",
    );
  }

  for (const f of files) {
    const mime = f.mimeType.toLowerCase().split(";")[0]?.trim() || "application/octet-stream";
    let max = WARREN_MAX_ATTACHMENT_BYTES.pdf;
    if (isImage(mime)) max = WARREN_MAX_ATTACHMENT_BYTES.image;
    else if (isAudio(mime)) max = WARREN_MAX_ATTACHMENT_BYTES.audio;
    else if (isPdf(mime, f.filename)) max = WARREN_MAX_ATTACHMENT_BYTES.pdf;
    else if (isCsvLike(mime, f.filename)) max = WARREN_MAX_ATTACHMENT_BYTES.csv;

    if (f.buffer.length > max) {
      throw new WarrenAttachmentError(`File too large: ${f.filename}`, "file_too_large");
    }

    if (isAudio(mime)) {
      const d = f.audioDurationSec;
      if (d != null && d > WARREN_AUDIO_MAX_DURATION_S) {
        throw new WarrenAttachmentError(
          `Audio too long (max ${WARREN_AUDIO_MAX_DURATION_S}s).`,
          "audio_too_long",
        );
      }
    }
  }
}

async function normalizeImageBuffer(
  buffer: Buffer,
): Promise<{ buffer: Buffer; mediaType: string }> {
  try {
    const sharp = (await import("sharp")).default;
    const meta = await sharp(buffer).metadata();
    const w = meta.width ?? 0;
    const h = meta.height ?? 0;
    const longest = Math.max(w, h);
    let pipeline = sharp(buffer).rotate();
    if (longest > WARREN_IMAGE_MAX_EDGE_PX) {
      pipeline = pipeline.resize(WARREN_IMAGE_MAX_EDGE_PX, WARREN_IMAGE_MAX_EDGE_PX, {
        fit: "inside",
        withoutEnlargement: true,
      });
    }
    const out = await pipeline.jpeg({ quality: 85 }).toBuffer();
    return { buffer: out, mediaType: "image/jpeg" };
  } catch {
    return { buffer, mediaType: "image/jpeg" };
  }
}

/** Build multimodal user content + plain-text persistence summary for chat history / logs. */
export async function buildWarrenMultimodalUserContent(args: {
  caption: string;
  files: RawAttachment[];
  /** Whisper / Warren locale hint (optional). */
  transcribeLanguageHint?: string;
}): Promise<{ content: UserContent; persistSummary: string }> {
  const { caption, files, transcribeLanguageHint } = args;
  validateRawAttachments(files);

  const cap = caption.trim();

  const persistBits: string[] = [];
  if (cap) persistBits.push(cap);

  type Part = Exclude<UserContent, string>[number];
  const multi: Part[] = [];

  if (cap) {
    multi.push({ type: "text", text: cap });
  }

  let fi = 0;
  for (const file of files) {
    fi += 1;
    const mime = file.mimeType.toLowerCase().split(";")[0]?.trim() || "application/octet-stream";
    const label = file.filename || `file-${fi}`;

    if (isImage(mime)) {
      const normalized = await normalizeImageBuffer(file.buffer);
      multi.push({
        type: "image",
        image: normalized.buffer,
        mediaType: normalized.mediaType,
      });
      persistBits.push(`[Image ${fi}: ${label}]`);
      continue;
    }

    if (isPdf(mime, file.filename)) {
      try {
        const { text, pageCount, truncated } = await extractPdfText(file.buffer);
        persistBits.push(
          pageCount > 40
            ? `[PDF ${fi}: ${label} — ${pageCount} pages; text truncated to policy]`
            : `[PDF ${fi}: ${label}]`,
        );
        const block =
          `PDF "${label}" (${pageCount} page(s)${truncated ? "; text truncated" : ""}):\n\n` +
          `${text || "(no extractable text)"}`;
        multi.push({ type: "text", text: block });
      } catch {
        throw new WarrenAttachmentError(
          `Could not read PDF: ${label}`,
          "pdf_extract_failed",
        );
      }
      continue;
    }

    if (isCsvLike(mime, file.filename)) {
      const raw = file.buffer.toString("utf8");
      const truncated = raw.length > WARREN_CSV_TEXT_MAX_CHARS;
      const slice = raw.slice(0, WARREN_CSV_TEXT_MAX_CHARS);
      const block =
        `CSV "${label}"${truncated ? " (truncated)" : ""}:\n\n\`\`\`csv\n${slice}\n\`\`\``;
      multi.push({ type: "text", text: block });
      persistBits.push(`[CSV ${fi}: ${label}${truncated ? ", truncated" : ""}]`);
      continue;
    }

    if (isAudio(mime)) {
      const tr = await transcribeVoice({
        buffer: file.buffer,
        mimeType: mime,
        language: transcribeLanguageHint,
      });
      if (!tr.ok || !tr.text?.trim()) {
        throw new WarrenAttachmentError(
          "Could not transcribe audio.",
          "unsupported_type",
        );
      }
      const block = `Voice / audio (${label}):\n${tr.text.trim()}`;
      multi.push({ type: "text", text: block });
      persistBits.push(`[Audio ${fi}: transcribed] ${tr.text.trim().slice(0, 500)}`);
      continue;
    }

    throw new WarrenAttachmentError(
      `Unsupported file type: ${label} (${mime})`,
      "unsupported_type",
    );
  }

  const persistSummary = persistBits.join("\n\n").slice(0, 4000);

  if (multi.length === 0) {
    return { content: cap || "(empty message)", persistSummary: persistSummary || cap };
  }

  if (multi.length === 1 && multi[0].type === "text") {
    return { content: multi[0].text, persistSummary };
  }

  return { content: multi, persistSummary };
}
