const MAX_TICKERS = 30;

/**
 * Parse + cap the `tickers` query param (TRF-026). Dedupes *before* the cap:
 * a caller sending one entry per holding lot (multiple buys of the same
 * ticker, undeduped) would otherwise waste cap slots on repeats, silently
 * dropping unique tickers — and their ex-dividend events — past the limit.
 *
 * Kept out of route.ts: Next.js's App Router only allows HTTP-method and a
 * small fixed set of config exports from a route file — any other export
 * (like this helper) fails the production build's route-type validation.
 */
export function parseTickersParam(tickersParam: string, max = MAX_TICKERS): string[] {
  return [
    ...new Set(
      tickersParam
        .split(",")
        .map((t) => t.trim().toUpperCase())
        .filter(Boolean),
    ),
  ].slice(0, max);
}
