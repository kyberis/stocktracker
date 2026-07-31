import { SUPPORTED_PORTFOLIO_CURRENCIES } from "@/lib/db/helpers";
import { normalizeCurrency } from "@/lib/utils";

/**
 * Every EUR→foreign pair for supported portfolio currencies.
 * Storage stays EUR-anchored; display converts EUR → portfolio currency.
 */
export const ALL_EUR_FX_PAIRS: string[] = SUPPORTED_PORTFOLIO_CURRENCIES
  .filter((c) => c !== "EUR")
  .map((c) => `EUR${c}`);

const KNOWN_PAIR_SET = new Set(ALL_EUR_FX_PAIRS);

/**
 * Build the EUR{CCY} pairs needed to convert the given currencies.
 * Always maps GBX → EURGBP. Unknown ISO codes still produce EUR{CCY}
 * so Yahoo can resolve them when possible.
 */
export function buildNeededFxPairs(
  currencies: Iterable<string | null | undefined>,
): string[] {
  const needed = new Set<string>();

  for (const raw of currencies) {
    if (raw == null || raw === "") continue;
    const norm = normalizeCurrency(String(raw).trim().toUpperCase());
    if (!norm || norm === "EUR") continue;
    if (norm === "GBX") {
      needed.add("EURGBP");
      continue;
    }
    needed.add(`EUR${norm}`);
  }

  return [...needed];
}

/** True when the pair is one of the supported portfolio FX pairs. */
export function isKnownEurFxPair(pair: string): boolean {
  return KNOWN_PAIR_SET.has(pair.toUpperCase());
}
