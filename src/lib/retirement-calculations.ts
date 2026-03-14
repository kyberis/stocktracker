export interface RetirementParams {
  currentAge: number;
  retirementAge: number;
  lifeExpectancy: number;
  currentPortfolioValue: number;
  monthlyContribution: number;
  preRetirementReturn: number;   // decimal, e.g. 0.07
  postRetirementReturn: number;  // decimal, e.g. 0.04
  inflationRate: number;         // decimal, e.g. 0.02
  annualPensionIncome: number;   // post-retirement pension/social security (today's EUR)
}

export interface RetirementProjectionPoint {
  age: number;
  year: number;
  nominalValue: number;
  realValue: number;
  phase: "accumulation" | "distribution";
}

export interface RetirementSummary {
  peakValue: number;
  peakAge: number;
  sustainableMonthlyWithdrawal: number;
  incomeReplacement: number; // ratio vs monthly contribution
  runsOutOfMoney: boolean;
  depletionAge: number | null;
}

export function projectRetirement(params: RetirementParams): RetirementProjectionPoint[] {
  const {
    currentAge, retirementAge, lifeExpectancy, currentPortfolioValue,
    monthlyContribution, preRetirementReturn, postRetirementReturn,
    inflationRate, annualPensionIncome,
  } = params;

  const points: RetirementProjectionPoint[] = [];
  let value = currentPortfolioValue;
  const annualContrib = monthlyContribution * 12;

  // Calculate sustainable withdrawal at retirement
  const yearsToRetire = retirementAge - currentAge;
  let valueAtRetirement = currentPortfolioValue;
  for (let y = 0; y < yearsToRetire; y++) {
    valueAtRetirement = valueAtRetirement * (1 + preRetirementReturn) + annualContrib;
  }
  const retirementYears = lifeExpectancy - retirementAge;
  const sustainableWithdrawal = calculateSustainableWithdrawal(
    valueAtRetirement, retirementYears, postRetirementReturn, inflationRate
  );
  const annualWithdrawal = sustainableWithdrawal + annualPensionIncome;

  // Generate projection
  value = currentPortfolioValue;
  for (let age = currentAge; age <= lifeExpectancy; age++) {
    const year = age - currentAge;
    const inflationFactor = Math.pow(1 + inflationRate, year);

    points.push({
      age,
      year,
      nominalValue: value,
      realValue: value / inflationFactor,
      phase: age < retirementAge ? "accumulation" : "distribution",
    });

    if (age < retirementAge) {
      value = value * (1 + preRetirementReturn) + annualContrib;
    } else {
      const inflatedWithdrawal = (sustainableWithdrawal) * Math.pow(1 + inflationRate, age - retirementAge);
      value = value * (1 + postRetirementReturn) - inflatedWithdrawal;
      if (value < 0) value = 0;
    }
  }

  return points;
}

export function calculateSustainableWithdrawal(
  portfolio: number,
  years: number,
  expectedReturn: number,
  inflationRate: number
): number {
  if (years <= 0 || portfolio <= 0) return 0;
  const realReturn = (1 + expectedReturn) / (1 + inflationRate) - 1;
  if (Math.abs(realReturn) < 0.0001) return portfolio / years;
  const factor = realReturn / (1 - Math.pow(1 + realReturn, -years));
  return portfolio * factor;
}

export function summarizeRetirement(
  params: RetirementParams,
  projection: RetirementProjectionPoint[]
): RetirementSummary {
  const peak = projection.reduce((a, b) => (b.nominalValue > a.nominalValue ? b : a), projection[0]);
  const annualContrib = params.monthlyContribution * 12;

  const retirementYears = params.lifeExpectancy - params.retirementAge;
  const retirementPoint = projection.find((p) => p.age === params.retirementAge);
  const valueAtRetirement = retirementPoint?.nominalValue ?? 0;

  const sustainableAnnual = calculateSustainableWithdrawal(
    valueAtRetirement, retirementYears, params.postRetirementReturn, params.inflationRate
  );
  const monthlyWithdrawal = sustainableAnnual / 12 + params.annualPensionIncome / 12;

  const depletionPoint = projection.find((p) => p.phase === "distribution" && p.nominalValue <= 0);

  return {
    peakValue: peak.nominalValue,
    peakAge: peak.age,
    sustainableMonthlyWithdrawal: monthlyWithdrawal,
    incomeReplacement: annualContrib > 0 ? (monthlyWithdrawal / params.monthlyContribution) : 0,
    runsOutOfMoney: !!depletionPoint,
    depletionAge: depletionPoint?.age ?? null,
  };
}

export interface MonteCarloResult {
  median: RetirementProjectionPoint[];
  p10: number[];
  p25: number[];
  p75: number[];
  p90: number[];
  successRate: number;
}

/** Box-Muller transform for normal random */
function normalRandom(mean: number, stdDev: number): number {
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + stdDev * z;
}

export function monteCarloSimulation(
  params: RetirementParams,
  iterations: number = 1000,
  volatility: number = 0.15
): MonteCarloResult {
  const { currentAge, retirementAge, lifeExpectancy, currentPortfolioValue, monthlyContribution } = params;
  const totalYears = lifeExpectancy - currentAge;
  const annualContrib = monthlyContribution * 12;

  const allPaths: number[][] = [];
  let successCount = 0;

  for (let i = 0; i < iterations; i++) {
    let value = currentPortfolioValue;
    const path: number[] = [value];

    let ranOutOfMoney = false;
    for (let y = 1; y <= totalYears; y++) {
      const age = currentAge + y;
      if (age <= retirementAge) {
        const r = normalRandom(params.preRetirementReturn, volatility);
        value = value * (1 + r) + annualContrib;
      } else {
        const r = normalRandom(params.postRetirementReturn, volatility * 0.7);
        const retireYears = params.lifeExpectancy - params.retirementAge;
        const sw = calculateSustainableWithdrawal(
          path[retirementAge - currentAge] ?? value,
          retireYears, params.postRetirementReturn, params.inflationRate
        );
        const inflatedWithdrawal = sw * Math.pow(1 + params.inflationRate, age - retirementAge);
        value = value * (1 + r) - inflatedWithdrawal;
        if (value < 0) { value = 0; ranOutOfMoney = true; }
      }
      path.push(value);
    }

    allPaths.push(path);
    if (!ranOutOfMoney) successCount++;
  }

  // Calculate percentiles
  const p10: number[] = [];
  const p25: number[] = [];
  const p75: number[] = [];
  const p90: number[] = [];

  for (let y = 0; y <= totalYears; y++) {
    const values = allPaths.map((p) => p[y]).sort((a, b) => a - b);
    p10.push(values[Math.floor(iterations * 0.1)]);
    p25.push(values[Math.floor(iterations * 0.25)]);
    p75.push(values[Math.floor(iterations * 0.75)]);
    p90.push(values[Math.floor(iterations * 0.9)]);
  }

  const median = projectRetirement(params);

  return { median, p10, p25, p75, p90, successRate: successCount / iterations };
}
