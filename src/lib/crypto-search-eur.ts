import type { ProviderSearchResult } from "@/lib/api-providers/types";
import { yahooCryptoSymbolToBase } from "@/lib/crypto-page-symbols";

/** True when the query clearly asks for a euro-quoted crypto pair. */
export function queryWantsEurCryptoPair(query: string): boolean {
  const q = query.trim().toUpperCase().replace(/\s+/g, "-");
  if (!q) return false;
  if (/-EUR$/.test(q) || q.includes("-EUR")) return true;
  // Whole-word EUR in the raw query (e.g. "Solana EUR")
  return /\bEUR\b/.test(query.toUpperCase());
}

function eurSibling(result: ProviderSearchResult): ProviderSearchResult | null {
  if (result.quoteType !== "CRYPTOCURRENCY") return null;
  const symbol = result.symbol.trim().toUpperCase().replace(/\s+/g, "-");
  if (symbol.endsWith("-EUR")) return null;
  const coin = yahooCryptoSymbolToBase(symbol);
  if (!coin || !/^[A-Z0-9]{2,10}$/.test(coin)) return null;
  return {
    symbol: `${coin}-EUR`,
    shortname: result.shortname || coin,
    exchange: result.exchange || "CCC",
    quoteType: "CRYPTOCURRENCY",
  };
}

/**
 * Yahoo crypto search usually returns USD pairs (e.g. SOL-USD). European users
 * need EUR pairs (SOL-EUR) in the same list. Ensures an EUR sibling for each
 * crypto hit and synthesizes a direct SOL-EUR-style match when the query asks
 * for EUR and Yahoo omitted it.
 */
export function augmentCryptoSearchWithEurPairs(
  results: ProviderSearchResult[],
  query: string,
): ProviderSearchResult[] {
  const seen = new Set(results.map((r) => r.symbol.trim().toUpperCase().replace(/\s+/g, "-")));
  const out: ProviderSearchResult[] = [...results];
  const wantEur = queryWantsEurCryptoPair(query);

  for (const r of results) {
    const sibling = eurSibling(r);
    if (!sibling) continue;
    const key = sibling.symbol.toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);
    if (wantEur) {
      out.unshift(sibling);
    } else {
      out.push(sibling);
    }
  }

  // Direct ticker like "SOL-EUR" / "SOL EUR" when Yahoo returned nothing useful.
  const normalized = query.trim().toUpperCase().replace(/\s+/g, "-");
  const directEur = normalized.match(/^([A-Z0-9]{2,10})-EUR$/);
  if (directEur) {
    const symbol = `${directEur[1]}-EUR`;
    if (!seen.has(symbol)) {
      out.unshift({
        symbol,
        shortname: directEur[1],
        exchange: "CCC",
        quoteType: "CRYPTOCURRENCY",
      });
    }
  }

  return out;
}
