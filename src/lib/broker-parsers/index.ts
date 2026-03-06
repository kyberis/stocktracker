import type { BrokerParser } from "./types";
import { degiroParser } from "./degiro";
import { ibkrParser } from "./interactive-brokers";
import { trading212Parser } from "./trading-212";
import { revolutParser } from "./revolut";

export type { BrokerParser, ParsedTransaction, CashBalance } from "./types";

const PARSERS: BrokerParser[] = [
  degiroParser,
  ibkrParser,
  trading212Parser,
  revolutParser,
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
