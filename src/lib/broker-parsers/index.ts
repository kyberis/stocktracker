import type { BrokerParser } from "./types";
import { degiroParser } from "./degiro";
import { ibkrParser } from "./interactive-brokers";
import { trading212Parser } from "./trading-212";
import { revolutParser } from "./revolut";
import { charlesSchwabParser } from "./charles-schwab";
import { fidelityParser } from "./fidelity";
import { nordnetParser } from "./nordnet";
import { tastytradeParser } from "./tastytrade";
import { freetradeParser } from "./freetrade";
import { etoroParser } from "./etoro";
import { wealthsimpleParser } from "./wealthsimple";
import { questradeParser } from "./questrade";
import { firsttradeParser } from "./firstrade";
import { myinvestorParser } from "./myinvestor";

export type { BrokerParser, ParsedTransaction, CashBalance } from "./types";

const PARSERS: BrokerParser[] = [
  degiroParser,
  ibkrParser,
  trading212Parser,
  revolutParser,
  charlesSchwabParser,
  fidelityParser,
  nordnetParser,
  tastytradeParser,
  freetradeParser,
  etoroParser,
  wealthsimpleParser,
  questradeParser,
  firsttradeParser,
  myinvestorParser,
];

const parserMap = new Map<string, BrokerParser>(
  PARSERS.map((p) => [p.id, p]),
);

export function getBrokerParser(id: string): BrokerParser | undefined {
  return parserMap.get(id);
}

export function getAllBrokerParsers(): BrokerParser[] {
  return PARSERS;
}

/**
 * Try each registered parser's `detect()` in registry order and return the
 * id of the first match, or null if none recognize the CSV. Order matters:
 * stricter/more specific detectors (e.g. degiro's exact Spanish header set)
 * are registered before looser ones (e.g. myinvestor's fuzzy alias match)
 * so an ambiguous file resolves to the more specific format.
 */
export function detectBrokerFormat(csv: string): string | null {
  const matches = PARSERS.filter((p) => p.detect(csv));
  if (matches.length > 1) {
    console.warn(
      `[broker-parsers] Ambiguous CSV matched multiple formats: ${matches.map((p) => p.id).join(", ")}. Using "${matches[0].id}".`,
    );
  }
  return matches[0]?.id ?? null;
}
