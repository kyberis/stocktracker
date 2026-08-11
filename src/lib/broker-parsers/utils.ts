/** European number format: 1.234,56 -> 1234.56 */
export function parseEuropeanNumber(raw: string): number {
  if (!raw) return 0;
  const cleaned = raw.replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  return parseFloat(cleaned) || 0;
}

/** Parse a single CSV line respecting quoted fields. */
export function parseCSVLine(line: string, delimiter = ","): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if (ch === delimiter && !inQuotes) { result.push(current); current = ""; continue; }
    current += ch;
  }
  result.push(current);
  return result;
}

/** Build a column-index map from a header row. */
export function buildColumnMap(headers: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (let i = 0; i < headers.length; i++) {
    map[headers[i].trim()] = i;
  }
  return map;
}

/** True if every exact column name in `required` is present in `headers`. */
export function hasExactColumns(headers: string[], required: string[]): boolean {
  const set = new Set(headers.map((h) => h.trim()));
  return required.every((col) => set.has(col));
}

/**
 * Scan the first `maxLines` lines of `csv` for a row that, once parsed as
 * CSV, contains every exact column name in `required` — used for broker
 * auto-detection. Exact-match (not substring) so similarly-shaped US
 * brokerage exports (Schwab/Fidelity/Questrade/Firstrade all share
 * "Date"/"Action"/"Symbol"-ish columns) don't collide with each other.
 * `maxLines` accommodates exports with preamble/summary rows before the
 * real header (Schwab, Fidelity, eToro, Questrade, Firstrade).
 */
export function detectByHeaderColumns(
  csv: string,
  required: string[],
  maxLines = 10,
  delimiter = ",",
): boolean {
  const lines = csv.split("\n");
  const scanLimit = Math.min(lines.length, maxLines);
  for (let i = 0; i < scanLimit; i++) {
    if (!lines[i].trim()) continue;
    const headers = parseCSVLine(lines[i], delimiter).map((h) => h.trim());
    if (hasExactColumns(headers, required)) return true;
  }
  return false;
}

/** Get a trimmed cell value from a row, returning "" if out of bounds. */
export function cell(row: string[], idx: number | undefined): string {
  if (idx === undefined || idx < 0 || idx >= row.length) return "";
  return row[idx].trim();
}

/** Parse a number from a cell, returning 0 for non-numeric strings. */
export function num(raw: string): number {
  if (!raw) return 0;
  return parseFloat(raw.replace(/,/g, "")) || 0;
}

/** Extract date portion (YYYY-MM-DD) from various formats. */
export function extractDate(raw: string): string {
  if (!raw) return "";
  // "2024-01-15 10:30:00" or "2024-01-15T10:30:00" -> "2024-01-15"
  const isoMatch = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) return isoMatch[1];
  // "20240115;103000" or "20240115" (IBKR compact)
  const compactMatch = raw.match(/^(\d{4})(\d{2})(\d{2})/);
  if (compactMatch) return `${compactMatch[1]}-${compactMatch[2]}-${compactMatch[3]}`;
  return raw;
}

/**
 * Ensure every sourceRef in a list of parsed transactions is unique.
 * First occurrence keeps the original ref (backward-compatible with DB);
 * subsequent collisions get a `|1`, `|2`, … suffix.
 */
export function deduplicateSourceRefs<T extends { sourceRef: string }>(txs: T[]): T[] {
  const seen = new Map<string, number>();
  for (const tx of txs) {
    const n = seen.get(tx.sourceRef) ?? 0;
    seen.set(tx.sourceRef, n + 1);
    if (n > 0) tx.sourceRef += `|${n}`;
  }
  return txs;
}
