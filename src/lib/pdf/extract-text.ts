import {
  WARREN_PDF_MAX_PAGES,
  WARREN_PDF_TEXT_MAX_CHARS,
} from "@/lib/ai/warren/upload-limits";

export interface ExtractPdfResult {
  text: string;
  pageCount: number;
  truncated: boolean;
}

/**
 * Extract plain text from a PDF buffer (first pages weighted toward token limits).
 * Requires dependency `pdf-parse` — run `npm install` if extraction fails at runtime.
 */
export async function extractPdfText(buffer: Buffer): Promise<ExtractPdfResult> {
  let pdfParse: (b: Buffer) => Promise<{ text: string; numpages: number }>;
  try {
    const mod = await import("pdf-parse");
    pdfParse = mod.default as typeof pdfParse;
  } catch {
    throw new Error(
      "PDF text extraction is unavailable (install the pdf-parse package: npm install).",
    );
  }

  const data = await pdfParse(buffer);
  const pageCount = data.numpages ?? 0;
  let text = (data.text || "").replace(/\u0000/g, "").trim();

  if (pageCount > WARREN_PDF_MAX_PAGES) {
    const ratio = WARREN_PDF_MAX_PAGES / Math.max(pageCount, 1);
    const approxChars = Math.floor(text.length * ratio);
    text = text.slice(0, Math.max(approxChars, Math.min(text.length, WARREN_PDF_TEXT_MAX_CHARS)));
  }

  let truncated = false;
  if (text.length > WARREN_PDF_TEXT_MAX_CHARS) {
    text = text.slice(0, WARREN_PDF_TEXT_MAX_CHARS);
    truncated = true;
  }

  return { text, pageCount, truncated };
}
