import * as XLSX from "xlsx";

/** ZIP local file header — .xlsx is OOXML (ZIP). */
function isZipMagic(buf: Uint8Array): boolean {
  return buf.length >= 4 && buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04;
}

/** OLE compound document — legacy .xls. */
function isOleMagic(buf: Uint8Array): boolean {
  return (
    buf.length >= 8 &&
    buf[0] === 0xd0 &&
    buf[1] === 0xcf &&
    buf[2] === 0x11 &&
    buf[3] === 0xe0 &&
    buf[4] === 0xa1 &&
    buf[5] === 0xb1 &&
    buf[6] === 0x1a &&
    buf[7] === 0xe1
  );
}

function extensionLooksSpreadsheet(filename: string): boolean {
  const lower = filename.toLowerCase();
  return lower.endsWith(".xlsx") || lower.endsWith(".xls") || lower.endsWith(".xlsm");
}

function shouldDecodeAsSpreadsheet(buf: Uint8Array, filename: string): boolean {
  if (extensionLooksSpreadsheet(filename)) return true;
  return isZipMagic(buf) || isOleMagic(buf);
}

/** Decode a broker CSV/Excel buffer to UTF-8 CSV text (first sheet only for Excel). */
export function bufferToUtf8CsvOrPlainText(buf: Uint8Array, filename = ""): string {
  if (buf.length === 0) return "";

  if (shouldDecodeAsSpreadsheet(buf, filename)) {
    const wb = XLSX.read(buf, { type: "array", cellDates: true });
    const sheetName = wb.SheetNames[0];
    if (!sheetName) return "";
    const sheet = wb.Sheets[sheetName];
    return XLSX.utils.sheet_to_csv(sheet);
  }

  try {
    return new TextDecoder("utf-8", { fatal: false }).decode(buf);
  } catch {
    return "";
  }
}

/**
 * Reads an uploaded broker file as UTF-8 text suitable for CSV parsers.
 * Binary Excel (.xls / .xlsx) is converted via SheetJS to CSV (first sheet only).
 */
export async function blobToUtf8CsvOrPlainText(blob: Blob, filename = ""): Promise<string> {
  const buf = new Uint8Array(await blob.arrayBuffer());
  const name =
    filename ||
    (typeof File !== "undefined" && blob instanceof File ? blob.name : "") ||
    "";
  return bufferToUtf8CsvOrPlainText(buf, name);
}
