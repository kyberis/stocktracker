/** Warren multimodal uploads — align API, Telegram, and docs (single source of truth). */

export const WARREN_MAX_ATTACHMENT_BYTES = {
  audio: 4 * 1024 * 1024,
  image: 8 * 1024 * 1024,
  pdf: 12 * 1024 * 1024,
  csv: 12 * 1024 * 1024,
} as const;

/** Matches Telegram voice limits in `src/lib/telegram/handler.ts`. */
export const WARREN_AUDIO_MAX_DURATION_S = 60;

/** Longest edge when normalizing images before vision (pixels). */
export const WARREN_IMAGE_MAX_EDGE_PX = 4096;

/** UTF-8 characters forwarded to the model for CSV-like content. */
export const WARREN_CSV_TEXT_MAX_CHARS = 15_000;

/** UTF-8 characters forwarded after PDF text extraction. */
export const WARREN_PDF_TEXT_MAX_CHARS = 24_000;

/** Max PDF pages to account for in extraction (best-effort via pdf-parse numpages). */
export const WARREN_PDF_MAX_PAGES = 40;

export const WARREN_MAX_FILES_PER_MESSAGE = 5;

/** Sum of raw file sizes in one multipart request (web). */
export const WARREN_MAX_COMBINED_ATTACHMENT_BYTES = 25 * 1024 * 1024;

export type WarrenRejectReason =
  | "too_many_files"
  | "combined_too_large"
  | "file_too_large"
  | "unsupported_type"
  | "audio_too_long"
  | "pdf_too_many_pages"
  | "pdf_extract_failed";
