import DemoShell from "./demo-shell";
import type { Holding, CashEntry, QuoteData, ExchangeRates } from "@/lib/types";

import seedHoldings from "../../../data/seed-holdings.json";
import seedCash from "../../../data/seed-cash.json";
import demoQuotes from "../../../data/demo-quotes.json";
import demoRates from "../../../data/demo-exchange-rates.json";

export default function DemoPage() {
  const holdings = seedHoldings.map((h, i) => ({ ...h, id: `demo-${i}` })) as unknown as Holding[];
  const cash = seedCash.map((c, i) => ({ ...c, id: `demo-cash-${i}` })) as CashEntry[];
  const quotes = demoQuotes as Record<string, QuoteData>;
  const rates = demoRates as ExchangeRates;

  return (
    <DemoShell
      initialHoldings={holdings}
      initialCash={cash}
      initialQuotes={quotes}
      initialExchangeRates={rates}
    />
  );
}
