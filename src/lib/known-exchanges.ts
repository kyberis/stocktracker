export interface KnownExchange {
  code: string;
  label: string;
}

/**
 * Preferred venue codes shown when adding/editing holdings.
 * Codes are stored as-is on holdings; labels are English UI hints only.
 */
export const KNOWN_EXCHANGES: KnownExchange[] = [
  // Special
  { code: "FUND", label: "Mutual fund / SICAV" },
  { code: "CRYPTO", label: "Cryptocurrency" },

  // US (seed/demo prefer NDQ / NSY)
  { code: "NDQ", label: "Nasdaq (Yahoo NDQ)" },
  { code: "NSY", label: "NYSE (Yahoo NSY)" },
  { code: "NASDAQ", label: "Nasdaq" },
  { code: "NYSE", label: "New York Stock Exchange" },
  { code: "AMEX", label: "NYSE American / AMEX" },
  { code: "NYSEARCA", label: "NYSE Arca" },
  { code: "OTC", label: "OTC Markets" },
  { code: "BATS", label: "Cboe BZX" },
  { code: "NMS", label: "Nasdaq Global Select (NMS)" },
  { code: "NGM", label: "Nasdaq Global Market" },
  { code: "NCM", label: "Nasdaq Capital Market" },
  { code: "NYQ", label: "NYSE (Yahoo NYQ)" },

  // Canada
  { code: "TSE", label: "Toronto Stock Exchange" },
  { code: "TOR", label: "Toronto (alias)" },
  { code: "CVE", label: "TSX Venture" },
  { code: "NEO", label: "NEO Exchange" },

  // UK
  { code: "LSE", label: "London Stock Exchange" },
  { code: "LON", label: "London (alias)" },
  { code: "IOB", label: "London International Order Book" },

  // Germany
  { code: "XET", label: "Xetra" },
  { code: "GER", label: "Xetra (Yahoo GER)" },
  { code: "TGD", label: "Tradegate" },
  { code: "TDG", label: "Tradegate (alias)" },
  { code: "FRA", label: "Frankfurt Stock Exchange" },

  // Spain
  { code: "MAD", label: "Bolsa de Madrid" },
  { code: "BME", label: "BME (Spain)" },
  { code: "MCE", label: "Madrid (Yahoo MCE)" },

  // Euronext
  { code: "PAR", label: "Euronext Paris" },
  { code: "EPA", label: "Euronext Paris (EPA)" },
  { code: "AMS", label: "Euronext Amsterdam" },
  { code: "BRU", label: "Euronext Brussels" },
  { code: "EBR", label: "Euronext Brussels (EBR)" },
  { code: "LIS", label: "Euronext Lisbon" },
  { code: "ISE", label: "Euronext Dublin" },

  // Italy / Switzerland / Austria
  { code: "MIL", label: "Borsa Italiana" },
  { code: "BIT", label: "Borsa Italiana (BIT)" },
  { code: "SWX", label: "SIX Swiss Exchange" },
  { code: "EBS", label: "SIX (Yahoo EBS)" },
  { code: "VIE", label: "Wiener Börse" },

  // Nordics
  { code: "OMK", label: "Nasdaq Copenhagen (OMK)" },
  { code: "CPH", label: "Nasdaq Copenhagen" },
  { code: "HEL", label: "Nasdaq Helsinki" },
  { code: "STO", label: "Nasdaq Stockholm" },
  { code: "OSL", label: "Oslo Børs" },
  { code: "ICE", label: "Nasdaq Iceland" },

  // CEE
  { code: "WAR", label: "Warsaw Stock Exchange" },
  { code: "WSE", label: "Warsaw (alias)" },
  { code: "PRA", label: "Prague Stock Exchange" },
  { code: "BUD", label: "Budapest Stock Exchange" },
  { code: "BVB", label: "Bucharest Stock Exchange" },
  { code: "IST", label: "Borsa Istanbul" },
  { code: "TLV", label: "Tel Aviv Stock Exchange" },

  // Asia-Pacific
  { code: "HKG", label: "Hong Kong Exchange" },
  { code: "XHKG", label: "Hong Kong (MIC)" },
  { code: "ASX", label: "Australian Securities Exchange" },
  { code: "SGX", label: "Singapore Exchange" },
  { code: "TYO", label: "Tokyo Stock Exchange" },
  { code: "JPX", label: "Japan Exchange Group" },
  { code: "KRX", label: "Korea Exchange" },
  { code: "NSE", label: "National Stock Exchange of India" },
  { code: "BSE", label: "Bombay Stock Exchange" },
  { code: "TAI", label: "Taiwan Stock Exchange" },
  { code: "SHH", label: "Shanghai Stock Exchange" },
  { code: "SHZ", label: "Shenzhen Stock Exchange" },
  { code: "JKT", label: "Indonesia Stock Exchange" },

  // LatAm
  { code: "SAO", label: "B3 São Paulo" },
  { code: "MEX", label: "Mexican Stock Exchange" },
];

/**
 * Merge portfolio-used exchange codes ahead of the curated catalog.
 * Unknown codes get a generic label; curated entries keep their labels.
 */
export function mergeExchangeSuggestions(extraCodes: string[]): KnownExchange[] {
  const byCode = new Map<string, KnownExchange>();

  for (const entry of KNOWN_EXCHANGES) {
    byCode.set(entry.code.toUpperCase(), entry);
  }

  const extras: KnownExchange[] = [];
  const seenExtra = new Set<string>();
  for (const raw of extraCodes) {
    const code = raw.trim().toUpperCase();
    if (!code || seenExtra.has(code)) continue;
    seenExtra.add(code);
    const known = byCode.get(code);
    if (known) {
      extras.push(known);
    } else {
      extras.push({ code, label: code });
    }
  }

  const catalog = KNOWN_EXCHANGES.filter((e) => !seenExtra.has(e.code.toUpperCase()));
  return [...extras, ...catalog];
}
