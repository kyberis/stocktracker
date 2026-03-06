import * as XLSX from "xlsx";

const HEADERS = ["ticker", "type", "price", "amount", "currency", "date", "name"];

const SAMPLE_ROWS = [
  ["AAPL", "buy", 178.5, 10, "USD", "2025-01-15", "Apple Inc."],
  ["GOOGL", "buy", 141.2, 5, "USD", "2025-02-01", "Alphabet Inc."],
  ["MSFT", "sell", 415.6, 3, "USD", "2025-03-10", "Microsoft Corp."],
  ["O", "dividend", 0.26, 20, "USD", "2025-03-01", "Realty Income"],
  ["VZ", "buy", 42.1, 15, "USD", "", ""],
];

const COLUMN_NOTES: Record<string, string> = {
  ticker: "Required — Stock symbol (e.g. AAPL, MSFT)",
  type: "Required — buy, sell, dividend, or fee",
  price: "Price per share (default: 0)",
  amount: "Number of shares (default: 0)",
  currency: "3-letter code like USD, EUR (default: EUR)",
  date: "YYYY-MM-DD format (default: today)",
  name: "Security name (default: same as ticker)",
};

export function downloadImportTemplate() {
  const wb = XLSX.utils.book_new();

  const data = [HEADERS, ...SAMPLE_ROWS];
  const ws = XLSX.utils.aoa_to_sheet(data);

  const colWidths = [12, 10, 12, 10, 10, 12, 22];
  ws["!cols"] = colWidths.map((w) => ({ wch: w }));

  XLSX.utils.book_append_sheet(wb, ws, "Transactions");

  const notesData = [
    ["Column", "Description"],
    ...HEADERS.map((h) => [h, COLUMN_NOTES[h] || ""]),
    [],
    ["Valid types", "buy, sell, dividend, fee"],
    ["Separators", "Comma, semicolon, or tab are all accepted if you save as CSV"],
  ];
  const notesWs = XLSX.utils.aoa_to_sheet(notesData);
  notesWs["!cols"] = [{ wch: 14 }, { wch: 58 }];
  XLSX.utils.book_append_sheet(wb, notesWs, "Instructions");

  XLSX.writeFile(wb, "stocktracker-import-template.xlsx");
}
