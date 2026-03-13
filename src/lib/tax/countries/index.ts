import type { TaxCountry, TaxReportInput, TaxReport } from "../types";
import { generateDE } from "./de";
import { generateFR } from "./fr";
import { generateES } from "./es";
import { generateNL } from "./nl";
import { generateIT } from "./it";
import { generateGB } from "./gb";
import { generateUS } from "./us";
import { generateCH } from "./ch";
import { generateAT } from "./at";
import { generatePT } from "./pt";
import { generateBE } from "./be";
import { generateIE } from "./ie";
import { generateSE } from "./se";
import { generateDK } from "./dk";
import { generateNO } from "./no";
import { generateFI } from "./fi";
import { generatePL } from "./pl";

type CountryGenerator = (input: TaxReportInput) => TaxReport;

const GENERATORS: Record<TaxCountry, CountryGenerator> = {
  DE: generateDE,
  FR: generateFR,
  ES: generateES,
  NL: generateNL,
  IT: generateIT,
  GB: generateGB,
  US: generateUS,
  CH: generateCH,
  AT: generateAT,
  PT: generatePT,
  BE: generateBE,
  IE: generateIE,
  SE: generateSE,
  DK: generateDK,
  NO: generateNO,
  FI: generateFI,
  PL: generatePL,
};

export function generateTaxReport(input: TaxReportInput): TaxReport {
  const generator = GENERATORS[input.country];
  if (!generator) {
    throw new Error(`Unsupported tax country: ${input.country}`);
  }
  return generator(input);
}

export {
  generateDE, generateFR, generateES, generateNL, generateIT,
  generateGB, generateUS, generateCH, generateAT, generatePT,
  generateBE, generateIE, generateSE, generateDK, generateNO,
  generateFI, generatePL,
};
