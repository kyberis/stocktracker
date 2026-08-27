import type { WarrenPart } from "./types";

/**
 * Detect “import my portfolio / importar mi cartera” so the web drawer can
 * mount the existing `/import` broker picker without waiting for a tool call.
 * The model often narrates “I’ll show the options” and never calls
 * `presentImportOptions` — that left an empty gap under the reply.
 */
export function isWarrenImportIntent(text: string): boolean {
  const t = text.trim().toLowerCase().replace(/\s+/g, " ");
  if (!t) return false;

  if (
    /^(import(ar)?( mi cartera| mi portafolio| my portfolio)?|import my portfolio|import portfolio)$/i.test(
      t,
    )
  ) {
    return true;
  }

  const asksImport = /\b(import(ar)?|sync|sincroniz|conect(ar|e)?|connect|upload|sub(e|ir)|traer|trae)\b/.test(
    t,
  );
  const namesPortfolio =
    /\b(portfolio|portafolio|cartera|holdings?|posiciones|broker|br[oó]ker|csv|excel|snaptrade|degiro|ibkr)\b/.test(
      t,
    );
  return asksImport && namesPortfolio;
}

export const WARREN_IMPORT_OPTIONS_PART: WarrenPart = {
  kind: "importOptions",
  data: {
    methods: [
      { id: "csv", available: true },
      { id: "snaptrade", available: true },
      { id: "ai", available: true },
    ],
  },
};

export function isImportOptionsPart(part: { kind: string } | undefined | null): boolean {
  return part?.kind === "importOptions";
}
