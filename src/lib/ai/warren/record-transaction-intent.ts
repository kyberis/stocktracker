/**
 * Detect when the user wants to record a completed trade in their ledger
 * (not advice, not delete-position). Used for Warren prefetch overrides.
 */

const RECORD_SALE =
  /\b(?:registr[ae]|registrá|anot[ae]|apunt[ae]|añad[ae]|guarda|guardar|log|record|enter|add)\b.{0,40}\b(?:venta|vendid[oa]|sale|sold|sell)\b/i;

const RECORD_SALE_REVERSED =
  /\b(?:venta|vendid[oa]|sale|sold|sell)\b.{0,40}\b(?:registr[ae]|registrá|anot[ae]|apunt[ae]|añad[ae]|guarda|guardar|log|record|enter)\b/i;

const RECORD_BUY =
  /\b(?:registr[ae]|registrá|anot[ae]|apunt[ae]|añad[ae]|guarda|guardar|log|record|enter|add)\b.{0,40}\b(?:compra|comprad[oa]|purchase|bought|buy)\b/i;

const RECORD_BUY_REVERSED =
  /\b(?:compra|comprad[oa]|purchase|bought)\b.{0,40}\b(?:registr[ae]|registrá|anot[ae]|apunt[ae]|añad[ae]|guarda|guardar|log|record|enter)\b/i;

const RECORD_TX_GENERIC =
  /\b(?:registr[ae]|registrá|anot[ae]|log|record)\b.{0,30}\b(?:transacci[oó]n|transaction|trade|operaci[oó]n)\b/i;

/** Explicit delete/remove of a position — do NOT treat as record-sale. */
const EXPLICIT_DELETE =
  /\b(?:borr[ae]|elimin[ae]|quit[ae]|suprime|delete|remove|wipe)\b.{0,40}\b(?:posici[oó]n|holding|holding|ticker|acci[oó]n|acciones|position)\b/i;

export function wantsRecordTransactionIntent(message: string): boolean {
  const m = message.trim();
  if (!m || EXPLICIT_DELETE.test(m)) return false;
  return (
    RECORD_SALE.test(m) ||
    RECORD_SALE_REVERSED.test(m) ||
    RECORD_BUY.test(m) ||
    RECORD_BUY_REVERSED.test(m) ||
    RECORD_TX_GENERIC.test(m)
  );
}

export function buildRecordTransactionPrefetchAppendix(message: string): string | null {
  if (!wantsRecordTransactionIntent(message)) return null;

  const isSale = RECORD_SALE.test(message) || RECORD_SALE_REVERSED.test(message);

  return [
    "TASK OVERRIDE — User wants to RECORD a completed trade in their ledger:",
    "- Call `listHoldings` first (required for sells).",
    isSale
      ? '- Then call `proposeRecordTransaction` with `type: "sell"` and real shares/price/currency/fees from the user (or from listHoldings + getQuote when they omitted price).'
      : '- Then call `proposeRecordTransaction` with `type: "buy"` | `"sell"` | `"dividend"` | `"fee"` as appropriate.',
    "- The user will tap Confirm / Cancel (NOT \"Yes, delete\").",
    "- NEVER call `proposeRemoveHolding` — that deletes the whole position and all its transactions.",
    "- NEVER call `proposeAddCash` for sale proceeds.",
    "- NEVER use `renderTradeGuidanceCard` for this — they are not asking for advice.",
  ].join("\n");
}
