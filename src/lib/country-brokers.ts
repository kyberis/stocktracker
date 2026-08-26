import type { BrokerFormat } from "@/hooks/import-types";

export interface CountryBroker {
  name: string;
  csvFormat?: BrokerFormat;
  hasSnapTrade: boolean;
}

const GLOBAL_BROKERS: CountryBroker[] = [
  { name: "Interactive Brokers", csvFormat: "interactive_brokers", hasSnapTrade: true },
  { name: "eToro", csvFormat: "etoro", hasSnapTrade: false },
];

const COUNTRY_BROKER_MAP: Record<string, CountryBroker[]> = {
  DE: [
    { name: "Scalable Capital", hasSnapTrade: true },
    { name: "Trade Republic", csvFormat: "trade_republic", hasSnapTrade: false },
    { name: "DEGIRO", csvFormat: "degiro", hasSnapTrade: false },
    ...GLOBAL_BROKERS,
  ],
  AT: [
    { name: "DEGIRO", csvFormat: "degiro", hasSnapTrade: false },
    { name: "Flatex", hasSnapTrade: false },
    ...GLOBAL_BROKERS,
  ],
  NL: [
    { name: "DEGIRO", csvFormat: "degiro", hasSnapTrade: false },
    { name: "ABN AMRO", hasSnapTrade: false },
    ...GLOBAL_BROKERS,
  ],
  GB: [
    { name: "Trading 212", csvFormat: "trading_212", hasSnapTrade: false },
    { name: "Freetrade", csvFormat: "freetrade", hasSnapTrade: false },
    { name: "Hargreaves Lansdown", hasSnapTrade: false },
    ...GLOBAL_BROKERS,
  ],
  IE: [
    { name: "DEGIRO", csvFormat: "degiro", hasSnapTrade: false },
    { name: "Trading 212", csvFormat: "trading_212", hasSnapTrade: false },
    ...GLOBAL_BROKERS,
  ],
  FR: [
    { name: "DEGIRO", csvFormat: "degiro", hasSnapTrade: false },
    { name: "Trading 212", csvFormat: "trading_212", hasSnapTrade: false },
    ...GLOBAL_BROKERS,
  ],
  ES: [
    { name: "MyInvestor", csvFormat: "myinvestor", hasSnapTrade: false },
    { name: "DEGIRO", csvFormat: "degiro", hasSnapTrade: false },
    { name: "Trading 212", csvFormat: "trading_212", hasSnapTrade: false },
    ...GLOBAL_BROKERS,
  ],
  PT: [
    { name: "DEGIRO", csvFormat: "degiro", hasSnapTrade: false },
    { name: "Trading 212", csvFormat: "trading_212", hasSnapTrade: false },
    ...GLOBAL_BROKERS,
  ],
  IT: [
    { name: "DEGIRO", csvFormat: "degiro", hasSnapTrade: false },
    { name: "Trading 212", csvFormat: "trading_212", hasSnapTrade: false },
    ...GLOBAL_BROKERS,
  ],
  BE: [
    { name: "DEGIRO", csvFormat: "degiro", hasSnapTrade: false },
    { name: "Trading 212", csvFormat: "trading_212", hasSnapTrade: false },
    ...GLOBAL_BROKERS,
  ],
  CH: [
    { name: "Swissquote", hasSnapTrade: false },
    { name: "DEGIRO", csvFormat: "degiro", hasSnapTrade: false },
    ...GLOBAL_BROKERS,
  ],
  SE: [
    { name: "Nordnet", csvFormat: "nordnet", hasSnapTrade: false },
    { name: "Avanza", hasSnapTrade: false },
    ...GLOBAL_BROKERS,
  ],
  NO: [
    { name: "Nordnet", csvFormat: "nordnet", hasSnapTrade: false },
    ...GLOBAL_BROKERS,
  ],
  DK: [
    { name: "Nordnet", csvFormat: "nordnet", hasSnapTrade: false },
    { name: "Saxo Bank", hasSnapTrade: false },
    ...GLOBAL_BROKERS,
  ],
  FI: [
    { name: "Nordnet", csvFormat: "nordnet", hasSnapTrade: false },
    ...GLOBAL_BROKERS,
  ],
  PL: [
    { name: "DEGIRO", csvFormat: "degiro", hasSnapTrade: false },
    { name: "XTB", hasSnapTrade: false },
    ...GLOBAL_BROKERS,
  ],
  CZ: [
    { name: "DEGIRO", csvFormat: "degiro", hasSnapTrade: false },
    ...GLOBAL_BROKERS,
  ],
  US: [
    { name: "Charles Schwab", csvFormat: "charles_schwab", hasSnapTrade: true },
    { name: "Fidelity", csvFormat: "fidelity", hasSnapTrade: true },
    { name: "Tastytrade", csvFormat: "tastytrade", hasSnapTrade: false },
    { name: "Firstrade", csvFormat: "firstrade", hasSnapTrade: false },
    ...GLOBAL_BROKERS,
  ],
  CA: [
    { name: "Questrade", csvFormat: "questrade", hasSnapTrade: true },
    { name: "Wealthsimple", csvFormat: "wealthsimple", hasSnapTrade: true },
    ...GLOBAL_BROKERS,
  ],
  AU: [
    { name: "Revolut", csvFormat: "revolut", hasSnapTrade: false },
    ...GLOBAL_BROKERS,
  ],
  NZ: [
    ...GLOBAL_BROKERS,
  ],
};

export function getBrokersForCountry(countryCode: string): CountryBroker[] {
  return COUNTRY_BROKER_MAP[countryCode] || GLOBAL_BROKERS;
}
