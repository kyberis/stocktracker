/**
 * Content fingerprint for transaction deduplication.
 * Uniqueness: date + type + ticker + shares + total amount (cross-source).
 */

export interface TransactionFingerprintInput {
  date: string;
  type: string;
  ticker: string;
  shares: number;
  totalAmount?: number;
  pricePerShare?: number;
}

/** Milli-shares + cent-amount key shared by import, sync, and DB backfill. */
export function transactionContentFingerprint(tx: TransactionFingerprintInput): string {
  const ticker = (tx.ticker || "").toUpperCase();
  const sharesMillis = Math.round(Math.abs(tx.shares) * 1000);
  const total =
    tx.totalAmount != null && tx.totalAmount !== 0
      ? tx.totalAmount
      : tx.shares * (tx.pricePerShare ?? 0);
  const amountCents = Math.round(Math.abs(total) * 100);
  return `${tx.date}|${tx.type}|${ticker}|${sharesMillis}|${amountCents}`;
}

/**
 * SnapTrade activity/order merge uses shares-only matching — the same fill
 * can report slightly different amounts between activity and order endpoints.
 */
export function snapTradeTradeFingerprint(tx: {
  date: string;
  type: string;
  ticker: string;
  shares: number;
}): string {
  return `${tx.date}|${tx.type}|${tx.ticker.toUpperCase()}|${Math.round(Math.abs(tx.shares) * 1000)}`;
}

export function filterNewTransactions<T extends TransactionFingerprintInput>(
  incoming: T[],
  existing: Set<string>,
): { kept: T[]; removed: number } {
  const seen = new Set(existing);
  const kept: T[] = [];
  let removed = 0;
  for (const tx of incoming) {
    const fp = transactionContentFingerprint(tx);
    if (seen.has(fp)) {
      removed++;
      continue;
    }
    seen.add(fp);
    kept.push(tx);
  }
  return { kept, removed };
}

export function isDuplicateAgainstLedger(
  tx: TransactionFingerprintInput,
  existingFingerprints: Set<string>,
  existingSourceRefs?: Set<string>,
  sourceRef?: string,
): boolean {
  if (sourceRef && existingSourceRefs?.has(sourceRef)) return true;
  return existingFingerprints.has(transactionContentFingerprint(tx));
}

export function dedupeParsedAgainstLedger<T extends TransactionFingerprintInput & { sourceRef?: string }>(
  parsed: T[],
  existingSourceRefs: Set<string>,
  existingFingerprints: Set<string>,
): { deduped: T[]; duplicatesRemoved: number } {
  const seen = new Set(existingFingerprints);
  const deduped: T[] = [];
  let duplicatesRemoved = 0;

  for (const tx of parsed) {
    if (tx.sourceRef && existingSourceRefs.has(tx.sourceRef)) {
      duplicatesRemoved++;
      continue;
    }
    const fp = transactionContentFingerprint(tx);
    if (seen.has(fp)) {
      duplicatesRemoved++;
      continue;
    }
    seen.add(fp);
    deduped.push(tx);
  }

  return { deduped, duplicatesRemoved };
}
