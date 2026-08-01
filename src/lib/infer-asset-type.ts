import type { HoldingAssetType } from "./types";

export function assetTypeFromQuoteType(quoteType?: string | null): HoldingAssetType | null {
  if (!quoteType) return null;
  const qt = quoteType.toUpperCase();
  if (qt === "MUTUALFUND") return "fund";
  if (qt === "ETF") return "etf";
  if (qt === "CRYPTOCURRENCY") return "crypto";
  if (qt === "EQUITY") return "stock";
  return null;
}

export interface InferAssetTypeInput {
  quoteType?: string | null;
  name?: string | null;
  description?: string | null;
  brokerType?: string | null;
}

function normalizeText(...parts: Array<string | null | undefined>): string {
  return parts
    .filter(Boolean)
    .join(" ")
    .toUpperCase();
}

/** Infer holding asset type from Yahoo quote type, labels, and broker metadata. */
export function inferAssetType(input: InferAssetTypeInput | string): HoldingAssetType {
  if (typeof input === "string") {
    return inferAssetType({ name: input });
  }

  const fromQuote = assetTypeFromQuoteType(input.quoteType);
  if (fromQuote) return fromQuote;

  const text = normalizeText(input.name, input.description);
  const broker = (input.brokerType || "").toLowerCase();

  if (broker.includes("crypto") || broker.includes("cryptocurrency")) return "crypto";
  if (broker.includes("etf")) return "etf";
  if (
    broker.includes("mutual") ||
    broker.includes("fund") ||
    broker.includes("sicav") ||
    broker.includes("fondo")
  ) {
    return "fund";
  }
  if (broker.includes("stock") || broker.includes("equity")) return "stock";

  if (text.includes("ETF") || text.includes("UCITS") || text.includes("INDEX FUND")) return "etf";

  if (
    text.includes("MUTUAL FUND") ||
    text.includes("MUTUALFUND") ||
    text.includes("SICAV") ||
    text.includes("FONDO") ||
    /\bFI\b/.test(text)
  ) {
    return "fund";
  }

  return "stock";
}
