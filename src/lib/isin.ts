/** ISIN format: 2 letters + 9 alphanumeric + 1 check digit */
const ISIN_PATTERN = /^[A-Z]{2}[A-Z0-9]{9}\d$/;

export function looksLikeIsin(symbol: string): boolean {
  return ISIN_PATTERN.test(symbol.trim().toUpperCase());
}
