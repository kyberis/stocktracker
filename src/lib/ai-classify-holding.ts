/**
 * LLM-assisted holding classification (sector / region / asset class).
 * Prompt + parse are pure so they can be unit-tested without the gateway.
 */

export interface HoldingClassificationInput {
  ticker: string;
  name: string;
  isin?: string;
  exchange?: string;
  assetType?: string;
  quoteType?: string;
}

export interface HoldingClassificationResult {
  sector: string;
  region: string;
  assetClass: string;
}

export const HOLDING_CLASSIFICATION_SYSTEM_PROMPT = `You classify securities for a retail portfolio tracker.
Return ONLY a JSON object with exactly these string fields:
- "sector": GICS-style sector or fund category (e.g. "Technology", "Healthcare", "Equity ETF — US Large Cap"). Use "Cryptocurrency" for crypto.
- "region": primary country or region of listing/exposure (e.g. "United States", "Europe", "Global", "Japan"). Empty string if unknown.
- "assetClass": one of Equity, ETF, Fund, Bond, Commodity, Cryptocurrency, Cash, Other — or a short precise label if none fit.

Rules:
- Base the answer on the ticker, name, ISIN, exchange, and any asset/quote type hints provided.
- Do not invent company-specific facts beyond well-known public knowledge implied by the symbol/name.
- Prefer English labels.
- No markdown, no commentary — JSON only.`;

export function buildHoldingClassificationUserPrompt(input: HoldingClassificationInput): string {
  const lines = [
    `Ticker: ${input.ticker}`,
    `Name: ${input.name || "(unknown)"}`,
  ];
  if (input.isin) lines.push(`ISIN: ${input.isin}`);
  if (input.exchange) lines.push(`Exchange: ${input.exchange}`);
  if (input.assetType) lines.push(`Asset type hint: ${input.assetType}`);
  if (input.quoteType) lines.push(`Quote type hint: ${input.quoteType}`);
  lines.push("Classify this holding.");
  return lines.join("\n");
}

function stripCodeFences(text: string): string {
  return text.replace(/```(?:json)?\s*/gi, "").replace(/```\s*/g, "").trim();
}

function asNonEmptyString(value: unknown, max = 120): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

/**
 * Parse model output into a classification. Returns null if required fields are missing.
 */
export function parseHoldingClassificationResponse(raw: string): HoldingClassificationResult | null {
  const cleaned = stripCodeFences(raw);
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      parsed = JSON.parse(match[0]);
    } catch {
      return null;
    }
  }

  if (!parsed || typeof parsed !== "object") return null;
  const obj = parsed as Record<string, unknown>;
  const sector = asNonEmptyString(obj.sector);
  const region = asNonEmptyString(obj.region);
  const assetClass = asNonEmptyString(obj.assetClass ?? obj.asset_class);

  if (!sector && !assetClass) return null;

  return {
    sector: sector || assetClass,
    region,
    assetClass: assetClass || sector,
  };
}
