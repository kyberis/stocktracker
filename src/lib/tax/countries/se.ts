/**
 * Sweden (SE) tax report module.
 * ISK (Investeringssparkonto): imputed income = (gov borrowing rate + 1%) × avg value, taxed at 30%.
 * KF (Kapitalförsäkring): similar imputed income model.
 * Regular account: 30% flat on realized gains and dividends.
 * K4 form field mapping.
 */
import type { TaxReportInput, TaxReport, FormField, IskCalculation } from "../types";
import { calculateRealizedGains, aggregateDividends, runDataQualityChecks } from "../engine";

const CAPITAL_GAINS_RATE = 0.30;

const GOV_BORROWING_RATE: Record<number, number> = {
  2023: 1.94,
  2024: 2.62,
  2025: 2.62, // placeholder
  2026: 2.62,
};

export function generateSE(input: TaxReportInput): TaxReport {
  const { taxYear, transactions, exchangeRates, baseCurrency, swedenAccountType = "regular" } = input;

  const gains = calculateRealizedGains(transactions, taxYear, "average", exchangeRates, baseCurrency);
  const dividends = aggregateDividends(transactions, taxYear, exchangeRates, baseCurrency, ["SE"]);

  for (const g of gains) {
    g.taxableGain = g.gain;
  }

  const totalGain = gains.filter((g) => g.gain > 0).reduce((s, g) => s + g.gain, 0);
  const totalLoss = gains.filter((g) => g.gain < 0).reduce((s, g) => s + g.gain, 0);
  const netGain = totalGain + totalLoss;

  const totalGrossDividends = dividends.reduce((s, d) => s + d.grossAmount, 0);
  const totalWithholdingTax = dividends.reduce((s, d) => s + d.withholdingTax, 0);

  let estimatedTax: number;
  let iskCalc: IskCalculation | undefined;

  if (swedenAccountType === "isk" || swedenAccountType === "kf") {
    const govRate = GOV_BORROWING_RATE[taxYear] ?? 2.62;
    const imputedRate = govRate + 1.0;
    const jan1 = input.jan1ValueEUR ?? 0;
    const dec31 = input.dec31ValueEUR ?? 0;
    const avgValue = (jan1 + dec31) / 2;
    const imputedIncome = round(avgValue * imputedRate / 100);
    const tax = round(imputedIncome * CAPITAL_GAINS_RATE);

    iskCalc = {
      accountType: swedenAccountType,
      averageValue: round(avgValue),
      govBorrowingRate: govRate,
      imputedIncomeRate: imputedRate,
      imputedIncome,
      taxRate: CAPITAL_GAINS_RATE,
      tax,
    };
    estimatedTax = tax;
  } else {
    const taxableIncome = Math.max(0, netGain) + totalGrossDividends;
    estimatedTax = round(taxableIncome * CAPITAL_GAINS_RATE);
  }

  const formFields: FormField[] = [];
  if (swedenAccountType === "isk" || swedenAccountType === "kf") {
    formFields.push(
      { label: "Kapitalunderlag (average value)", reference: "K11/K12", value: iskCalc!.averageValue },
      { label: "Schablonintäkt (imputed income)", reference: "K11/K12", value: iskCalc!.imputedIncome },
      { label: "Skatt (30%)", reference: "Deklaration", value: iskCalc!.tax },
    );
  } else {
    formFields.push(
      { label: "Vinst fondandelar/aktier", reference: "K4 Avsnitt A", value: round(Math.max(0, netGain)) },
      { label: "Förlust fondandelar/aktier", reference: "K4 Avsnitt A", value: round(Math.abs(totalLoss)) },
      { label: "Utdelning", reference: "K4 Avsnitt A", value: round(totalGrossDividends) },
      { label: "Avräkningsbar utländsk skatt", reference: "K4", value: round(totalWithholdingTax) },
      { label: "Skatt (30%)", reference: "Deklaration", value: estimatedTax },
    );
  }

  const dataQuality = runDataQualityChecks(transactions, taxYear, gains, dividends, input.jan1ValueEUR, input.dec31ValueEUR);

  return {
    country: "SE",
    taxYear,
    baseCurrency,
    costBasisMethod: "average",
    generatedAt: new Date().toISOString(),
    realizedGains: swedenAccountType === "regular" ? gains : [],
    totalRealizedGain: swedenAccountType === "regular" ? round(totalGain) : 0,
    totalRealizedLoss: swedenAccountType === "regular" ? round(totalLoss) : 0,
    netRealizedGain: swedenAccountType === "regular" ? round(netGain) : 0,
    dividends: swedenAccountType === "regular" ? dividends : [],
    totalGrossDividends: swedenAccountType === "regular" ? round(totalGrossDividends) : 0,
    totalWithholdingTax: round(totalWithholdingTax),
    totalNetDividends: swedenAccountType === "regular" ? round(totalGrossDividends - totalWithholdingTax) : 0,
    estimatedTaxableIncome: iskCalc ? iskCalc.imputedIncome : round(Math.max(0, netGain) + totalGrossDividends),
    estimatedTax,
    seIskCalculation: iskCalc,
    seAccountType: swedenAccountType,
    formFields,
    dataQuality,
  };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
