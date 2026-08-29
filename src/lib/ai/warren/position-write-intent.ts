/**
 * Distinguish three portfolio-write intents for a held ticker:
 * 1) Record a completed sale/buy in the ledger
 * 2) Delete the position + all its transactions (erase history)
 * 3) Ambiguous ("quita X", "elimina NOW") — Warren must ask which of 1/2
 */

import { wantsRecordTransactionIntent } from "./record-transaction-intent";

/** Clear erase-history / wipe-position language (not a sale to log). */
const EXPLICIT_DELETE_HISTORY =
  /\b(?:borr[ae]|elimin[ae]|suprime|wipe|erase|purge)\b.{0,48}\b(?:posici[oó]n|holding|historial|registros?|transacciones|datos|from\s+(?:my\s+)?records?|position)\b/i;

const EXPLICIT_DELETE_HISTORY_EN =
  /\b(?:delete|remove)\b.{0,40}\b(?:(?:entire\s+)?position|holding|history|ledger|from\s+(?:my\s+)?records?)\b/i;

/**
 * Vague "take it out / get rid of X" without saying sale OR delete-history.
 * These used to map wrongly to proposeRemoveHolding.
 */
const AMBIGUOUS_DROP =
  /\b(?:quit[ae]|saca|sac[aá]|elimina|quita(?:me)?|remove|drop|get\s+rid\s+of)\b/i;

const ADVICE_ONLY =
  /\b(?:deber[ií]a|should\s+i|¿vend(?:o|er)|advice|an[aá]lisis|trim|recort)\b/i;

export function wantsExplicitDeleteHistoryIntent(message: string): boolean {
  const m = message.trim();
  if (!m) return false;
  if (wantsRecordTransactionIntent(m)) return false;
  return EXPLICIT_DELETE_HISTORY.test(m) || EXPLICIT_DELETE_HISTORY_EN.test(m);
}

export function wantsAmbiguousPositionWriteIntent(message: string): boolean {
  const m = message.trim();
  if (!m || m.length > 160) return false;
  if (wantsRecordTransactionIntent(m)) return false;
  if (wantsExplicitDeleteHistoryIntent(m)) return false;
  if (ADVICE_ONLY.test(m)) return false;
  return AMBIGUOUS_DROP.test(m);
}

export function buildAmbiguousPositionWriteAppendix(message: string): string | null {
  if (!wantsAmbiguousPositionWriteIntent(message)) return null;

  return [
    "TASK OVERRIDE — Ambiguous position change (could be record-sale OR delete-history):",
    "- Do NOT call `proposeRemoveHolding` or `proposeRecordTransaction` in this turn.",
    "- Ask ONE short clarifying question with both options clearly labeled:",
    '  A) **Record a sale** you already made → keeps buy history, adds a sell tx → user should say "registra la venta" / "record the sale" (then you call `proposeRecordTransaction`).',
    '  B) **Delete the position + all its transactions** from trefolio → no sale recorded, irreversible → user should say "borra la posición" / "delete the holding history" (then you call `proposeRemoveHolding`).',
    "- Wait for their answer before proposing anything.",
  ].join("\n");
}

export function buildExplicitDeleteHistoryAppendix(message: string): string | null {
  if (!wantsExplicitDeleteHistoryIntent(message)) return null;

  return [
    "TASK OVERRIDE — User wants to DELETE position history (not record a sale):",
    "- Call `listHoldings`, then `proposeRemoveHolding` with `userIntent: \"delete_entire_position\"`.",
    "- The card must make clear this deletes ALL transactions and does NOT log a sale.",
    "- NEVER call `proposeRecordTransaction` for this request.",
  ].join("\n");
}
