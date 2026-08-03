/**
 * TRF-017 — single watchlist venue scheme: ISO country · MIC/Yahoo code when known,
 * otherwise the raw exchange string (never mix unlabeled country vs MIC alone).
 */

const YAHOO_EXCHANGE_TO_COUNTRY: Record<string, string> = {
  NMS: "US",
  NYQ: "US",
  NGM: "US",
  NCM: "US",
  ASE: "US",
  AMX: "US",
  ARCA: "US",
  BATS: "US",
  PCX: "US",
  OQB: "US",
  OQX: "US",
  NASDAQ: "US",
  NYSE: "US",
  AMEX: "US",
  CCY: "US",
  GER: "DE",
  FRA: "DE",
  DUS: "DE",
  STU: "DE",
  MUN: "DE",
  HAM: "DE",
  BER: "DE",
  HAN: "DE",
  ETR: "DE",
  MCE: "ES",
  MAD: "ES",
  PAR: "FR",
  EPA: "FR",
  AMS: "NL",
  AEX: "NL",
  BRU: "BE",
  LIS: "PT",
  MIL: "IT",
  MTA: "IT",
  SWX: "CH",
  EBS: "CH",
  VIE: "AT",
  WSE: "PL",
  PRA: "CZ",
  BUD: "HU",
  ATH: "GR",
  IST: "TR",
  STO: "SE",
  CPH: "DK",
  HEL: "FI",
  OSL: "NO",
  ICE: "IS",
  LSE: "GB",
  LON: "GB",
  IOB: "GB",
  TOR: "CA",
  TSE: "CA",
  VAN: "CA",
  CNQ: "CA",
  SAO: "BR",
  MEX: "MX",
  ASX: "AU",
  HKG: "HK",
  TYO: "JP",
  JPX: "JP",
  KSC: "KR",
  KOE: "KR",
  SHH: "CN",
  SHZ: "CN",
  SES: "SG",
  SET: "TH",
  JKT: "ID",
  KLS: "MY",
  TAI: "TW",
  TWO: "TW",
  NZE: "NZ",
  JNB: "ZA",
};

/** Format for display: `US · NMS` or raw code when unmapped. */
export function formatWatchlistVenue(exchange: string | null | undefined): string {
  if (!exchange) return "";
  const code = exchange.trim().toUpperCase().replace(/\s+/g, " ");
  if (!code) return "";
  const country = YAHOO_EXCHANGE_TO_COUNTRY[code.replace(/\s/g, "")] ?? YAHOO_EXCHANGE_TO_COUNTRY[code];
  if (country) return `${country} · ${code.replace(/\s/g, "")}`;
  // Already looks like ISO country
  if (/^[A-Z]{2}$/.test(code)) return code;
  return code;
}
