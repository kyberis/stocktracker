import type { ExtractedHolding } from "@/hooks/import-types";
import type { Holding } from "@/lib/types";
import { createNotification, trackEvent } from "@/lib/db";
import {
  clearSnapTradeMarkReconciliation,
  getSnapTradeMarkReconciliation,
  saveSnapTradeMarkReconciliation,
} from "@/lib/db/snaptrade-connections";
import { buildNeededFxPairs } from "@/lib/fx-pairs";
import { brokerMarkGapNotification } from "@/lib/notification-templates";
import { getRatesWithCache } from "@/lib/quote-cache";
import {
  compareBrokerMarks,
  markGapFingerprint,
  shouldNotifyMarkGap,
  type MarkReconciliation,
} from "@/lib/snaptrade-mark-reconciliation";

/**
 * After SnapTrade positions are upserted, compare broker last vs Yahoo-based
 * `valueInEUR` and notify when the set of diverging tickers is new (or 24h elapsed).
 */
export async function reconcileSnapTradeMarksAndNotify(
  userId: string,
  positions: ExtractedHolding[],
  upserted: Holding[],
  brokerNavEUR?: number | null,
): Promise<MarkReconciliation | null> {
  if (positions.length === 0) {
    await clearSnapTradeMarkReconciliation(userId).catch(() => {});
    return null;
  }

  const marketByTicker = new Map(upserted.map((h) => [h.ticker.toUpperCase(), h]));
  const currencies = new Set<string>();
  for (const pos of positions) {
    if (pos.displayCurrency) currencies.add(pos.displayCurrency);
  }
  const rates = await getRatesWithCache(buildNeededFxPairs(currencies));

  const result = compareBrokerMarks(
    positions.map((pos) => {
      const market = marketByTicker.get(pos.ticker.toUpperCase());
      return {
        ticker: pos.ticker,
        name: pos.name,
        shares: pos.shares,
        displayCurrency: pos.displayCurrency,
        brokerPrice: pos.brokerPrice,
        marketValueEUR: market?.valueInEUR,
      };
    }),
    rates,
    { brokerNavEUR: brokerNavEUR ?? null },
  );

  const fingerprint = markGapFingerprint(result);
  const stored = await getSnapTradeMarkReconciliation(userId);
  const json = result.gaps.length > 0 ? JSON.stringify(result) : "";

  if (result.gaps.length === 0) {
    await clearSnapTradeMarkReconciliation(userId);
    return result;
  }

  const notify = shouldNotifyMarkGap({
    fingerprint,
    lastFingerprint: stored?.lastFingerprint ?? "",
    lastNotifiedAt: stored?.lastNotifiedAt ?? "",
  });

  await saveSnapTradeMarkReconciliation(userId, { json, fingerprint, notify });

  if (notify) {
    const tickers = result.gaps.map((g) => g.ticker).join(", ");
    const delta = Math.round(Math.abs(result.gaps.reduce((s, g) => s + g.deltaEUR, 0)));
    await createNotification(userId, brokerMarkGapNotification(tickers, delta));
    trackEvent(userId, "snaptrade_mark_gap_notified", {
      tickers: result.gaps.map((g) => g.ticker).join(",").slice(0, 120),
      count: String(result.gaps.length),
      delta_eur: String(delta),
    });
  } else {
    trackEvent(userId, "snaptrade_mark_gap_detected", {
      tickers: result.gaps.map((g) => g.ticker).join(",").slice(0, 120),
      count: String(result.gaps.length),
    });
  }

  return result;
}
