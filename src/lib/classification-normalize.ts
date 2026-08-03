/**
 * Canonical labels for portfolio classification so Yahoo GICS names,
 * AI short names, and ETF weight keys collapse into one bucket.
 */

/** Strip to a comparable key: "Information Technology" → "informationtechnology" */
export function classificationKey(label: string): string {
  return label
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "");
}

/** Prefer these short labels (aligned with crisis-scenarios ALL_SECTORS). */
const SECTOR_ALIASES: Record<string, string> = {
  technology: "Technology",
  informationtechnology: "Technology",
  informationtech: "Technology",
  tech: "Technology",
  it: "Technology",

  healthcare: "Healthcare",
  healthcaresector: "Healthcare",
  health: "Healthcare",

  financialservices: "Financial Services",
  financials: "Financial Services",
  financial: "Financial Services",
  finance: "Financial Services",
  banks: "Financial Services",

  consumercyclical: "Consumer Cyclical",
  consumerdiscretionary: "Consumer Cyclical",
  discretionary: "Consumer Cyclical",
  consumercategorical: "Consumer Cyclical",

  consumerdefensive: "Consumer Defensive",
  consumerstaples: "Consumer Defensive",
  staples: "Consumer Defensive",

  conglomerate: "Industrials",
  conglomerates: "Industrials",

  communicationservices: "Communication Services",
  communication: "Communication Services",
  telecommunications: "Communication Services",
  telecom: "Communication Services",
  mediaservices: "Communication Services",

  basicmaterials: "Basic Materials",
  materials: "Basic Materials",
  basicmaterial: "Basic Materials",

  realestate: "Real Estate",
  property: "Real Estate",
  reits: "Real Estate",
  reit: "Real Estate",

  industrials: "Industrials",
  industrial: "Industrials",

  energy: "Energy",
  oilandgas: "Energy",

  utilities: "Utilities",
  utility: "Utilities",

  diversified: "Diversified",

  cryptocurrency: "Cryptocurrency",
  crypto: "Cryptocurrency",
  digitalassets: "Cryptocurrency",

  etf: "ETF",
  exchangetradedfund: "ETF",
};

const REGION_ALIASES: Record<string, string> = {
  unitedstates: "United States",
  usa: "United States",
  us: "United States",
  america: "United States",
  unitedstatesofamerica: "United States",

  unitedkingdom: "United Kingdom",
  uk: "United Kingdom",
  greatbritain: "United Kingdom",
  britain: "United Kingdom",
  england: "United Kingdom",
  gb: "United Kingdom",

  europe: "Europe",
  eu: "Europe",
  eurozone: "Europe",
  europeanunion: "Europe",

  global: "Global",
  worldwide: "Global",
  international: "Global",
  world: "Global",

  japan: "Japan",
  china: "China",
  hongkong: "Hong Kong",
  canada: "Canada",
  australia: "Australia",
  switzerland: "Switzerland",
  germany: "Germany",
  france: "France",
  spain: "Spain",
  italy: "Italy",
  netherlands: "Netherlands",
  ireland: "Ireland",
  sweden: "Sweden",
  norway: "Norway",
  denmark: "Denmark",
  finland: "Finland",
  belgium: "Belgium",
  portugal: "Portugal",
  austria: "Austria",
  poland: "Poland",
  brazil: "Brazil",
  india: "India",
  southkorea: "South Korea",
  korea: "South Korea",
  taiwan: "Taiwan",
  singapore: "Singapore",
  mexico: "Mexico",
  emergingmarkets: "Emerging Markets",
  em: "Emerging Markets",
  asia: "Asia",
  asiapacific: "Asia Pacific",
  apac: "Asia Pacific",
  latinamerica: "Latin America",
  latam: "Latin America",
  northamerica: "North America",
};

const ASSET_CLASS_ALIASES: Record<string, string> = {
  equity: "Equity",
  equities: "Equity",
  stock: "Equity",
  stocks: "Equity",
  shares: "Equity",
  commonstock: "Equity",

  etf: "ETF",
  etfs: "ETF",
  exchangetradedfund: "ETF",
  exchangetradedfunds: "ETF",

  fund: "Fund",
  funds: "Fund",
  mutualfund: "Fund",
  mutualfunds: "Fund",

  bond: "Bond",
  bonds: "Bond",
  fixedincome: "Bond",

  commodity: "Commodity",
  commodities: "Commodity",

  cryptocurrency: "Cryptocurrency",
  crypto: "Cryptocurrency",

  cash: "Cash",
  money: "Cash",
  moneymarket: "Cash",

  other: "Other",
};

function applyAliasMap(raw: string, aliases: Record<string, string>): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const key = classificationKey(trimmed);
  if (!key) return trimmed;
  return aliases[key] ?? trimmed.replace(/\s+/g, " ");
}

export function normalizeSectorLabel(raw: string): string {
  return applyAliasMap(raw, SECTOR_ALIASES);
}

export function normalizeRegionLabel(raw: string): string {
  return applyAliasMap(raw, REGION_ALIASES);
}

export function normalizeAssetClassLabel(raw: string): string {
  return applyAliasMap(raw, ASSET_CLASS_ALIASES);
}

export interface ClassificationFields {
  sector?: string;
  region?: string;
  assetClass?: string;
}

/** Return only fields that change after canonicalization. */
export function diffNormalizedClassification(fields: ClassificationFields): ClassificationFields {
  const out: ClassificationFields = {};
  if (fields.sector != null && fields.sector !== "") {
    const next = normalizeSectorLabel(fields.sector);
    if (next !== fields.sector) out.sector = next;
  }
  if (fields.region != null && fields.region !== "") {
    const next = normalizeRegionLabel(fields.region);
    if (next !== fields.region) out.region = next;
  }
  if (fields.assetClass != null && fields.assetClass !== "") {
    const next = normalizeAssetClassLabel(fields.assetClass);
    if (next !== fields.assetClass) out.assetClass = next;
  }
  return out;
}

export function normalizeClassificationFields<T extends ClassificationFields>(fields: T): T {
  const next = { ...fields };
  if (typeof next.sector === "string" && next.sector) {
    next.sector = normalizeSectorLabel(next.sector);
  }
  if (typeof next.region === "string" && next.region) {
    next.region = normalizeRegionLabel(next.region);
  }
  if (typeof next.assetClass === "string" && next.assetClass) {
    next.assetClass = normalizeAssetClassLabel(next.assetClass);
  }
  return next;
}

export function holdingNeedsClassificationNormalize(h: {
  sector?: string;
  region?: string;
  assetClass?: string;
}): boolean {
  return Object.keys(diffNormalizedClassification(h)).length > 0;
}
