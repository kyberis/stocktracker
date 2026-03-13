/**
 * Finland (FI) tax report module.
 * Capital income: 30% up to €30,000, 34% above.
 * FIFO cost basis. Presumptive acquisition cost: 20% (held <10 years) or 40% (held >=10 years)
 * of sale proceeds can be used as cost basis if higher than actual cost.
 * Form 9A field mapping.
 */
import type { TaxReportInput, TaxReport, FormField } from "../types";
import { calculateRealizedGains, aggregateDividends, runDataQualityChecks } from "../engine";

const BRACKET_THRESHOLD = 30000;
const LOWER_RATE = 0.30;
const UPPER_RATE = 0.34;

const PRESUMPTIVE_SHORT = 0.20; // held < 10 years
const PRESUMPTIVE_LONG = 0.40;  // held >= 10 years

function calcCapitalTax(income: number): number {
  if (income <= 0) return 0;
  if (income <= BRACKET_THRESHOLD) return round(income * LOWER_RATE);
  return round(BRACKET_THRESHOLD * LOWER_RATE + (income - BRACKET_THRESHOLD) * UPPER_RATE);
}

export function generateFI(input: TaxReportInput): TaxReport {
  const { taxYear, transactions, exchangeRates, baseCurrency } = input;

  const gains = calculateRealizedGains(transactions, taxYear, "fifo", exchangeRates, baseCurrency);
  const dividends = aggregateDividends(transactions, taxYear, exchangeRates, baseCurrency, ["FI"]);

  let presumptiveUsed = false;

  for (const g of gains) {
    const yearsHeld = (g.holdingDays ?? 0) / 365;
    const presumptiveRate = yearsHeld >= 10 ? PRESUMPTIVE_LONG : PRESUMPTIVE_SHORT;
    const presumptiveCost = g.proceeds * presumptiveRate;

    if (presumptiveCost > g.costBasis && g.gain > 0) {
      // Use presumptive acquisition cost — results in lower taxable gain
      g.taxableGain = g.proceeds - presumptiveCost;
      g.adjustmentLabel = `Hankintameno-olettama ${Math.round(presumptiveRate * 100)}%`;
      presumptiveUsed = true;
    } else {
      g.taxableGain = g.gain;
    }
  }

  const totalGain = gains.filter((g) => g.gain > 0).reduce((s, g) => s + g.gain, 0);
  const totalLoss = gains.filter((g) => g.gain < 0).reduce((s, g) => s + g.gain, 0);
  const netGain = totalGain + totalLoss;

  const totalGrossDividends = dividends.reduce((s, d) => s + d.grossAmount, 0);
  const totalWithholdingTax = dividends.reduce((s, d) => s + d.withholdingTax, 0);

  // Dividends: 85% taxable for listed stocks
  const taxableDividends = round(totalGrossDividends * 0.85);
  const taxableGains = gains.reduce((s, g) => s + Math.max(0, g.taxableGain ?? g.gain), 0);
  const totalCapitalIncome = taxableGains + taxableDividends;
  const estimatedTax = calcCapitalTax(totalCapitalIncome);

  const formFields: FormField[] = [
    { label: "Luovutusvoitot (capital gains)", reference: "Lomake 9A", value: round(taxableGains) },
    { label: "Luovutustappiot (capital losses)", reference: "Lomake 9A", value: round(Math.abs(totalLoss)) },
    { label: "Osingot (dividends, 85% taxable)", reference: "Esitäytetty veroilmoitus", value: round(taxableDividends) },
    { label: "Ulkomainen lähdevero", reference: "Lomake 16", value: round(totalWithholdingTax) },
    { label: "Pääomatulot yhteensä", reference: "Veroilmoitus", value: round(totalCapitalIncome) },
    { label: "Vero (30%/34%)", reference: "Veroilmoitus", value: estimatedTax },
  ];

  if (presumptiveUsed) {
    formFields.push({
      label: "Hankintameno-olettama used",
      reference: "Lomake 9A",
      value: 1,
      note: "Presumptive acquisition cost applied where beneficial",
    });
  }

  const dataQuality = runDataQualityChecks(transactions, taxYear, gains, dividends, input.jan1ValueEUR, input.dec31ValueEUR);

  return {
    country: "FI",
    taxYear,
    baseCurrency,
    costBasisMethod: "fifo",
    generatedAt: new Date().toISOString(),
    realizedGains: gains,
    totalRealizedGain: round(totalGain),
    totalRealizedLoss: round(totalLoss),
    netRealizedGain: round(netGain),
    dividends,
    totalGrossDividends: round(totalGrossDividends),
    totalWithholdingTax: round(totalWithholdingTax),
    totalNetDividends: round(totalGrossDividends - totalWithholdingTax),
    estimatedTaxableIncome: round(totalCapitalIncome),
    estimatedTax,
    fiPresumptiveCostUsed: presumptiveUsed,
    formFields,
    dataQuality,
  };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
