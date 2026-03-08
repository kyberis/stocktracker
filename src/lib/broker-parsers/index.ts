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
