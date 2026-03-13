import type { TaxCountry, TaxReportInput, TaxReport } from "../types";
import { generateDE } from "./de";
import { generateFR } from "./fr";
import { generateES } from "./es";
import { generateNL } from "./nl";
import { generateIT } from "./it";

type CountryGenerator = (input: TaxReportInput) => TaxReport;

const GENERATORS: Record<TaxCountry, CountryGenerator> = {
  DE: generateDE,
  FR: generateFR,
  ES: generateES,
  NL: generateNL,
  IT: generateIT,
};

export function generateTaxReport(input: TaxReportInput): TaxReport {
  const generator = GENERATORS[input.country];
  if (!generator) {
    throw new Error(`Unsupported tax country: ${input.country}`);
  }
  return generator(input);
}

export { generateDE, generateFR, generateES, generateNL, generateIT };
