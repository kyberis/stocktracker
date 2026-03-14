export interface FireParams {
  annualIncome: number;
  annualExpenses: number;
  currentPortfolioValue: number;
  expectedReturn: number;     // decimal, e.g. 0.07
  safeWithdrawalRate: number; // decimal, e.g. 0.04
  currentAge: number;
  includeDividendYield?: number; // decimal, added on top of expected return
}

export interface FireVariant {
  label: string;
  fireNumber: number;
  yearsToFire: number | null;
  ageAtFire: number | null;
}

export interface FireProjectionPoint {
  year: number;
  age: number;
  value: number;
  fireNumber: number;
}

export function calculateFireNumber(annualExpenses: number, swr: number): number {
  if (swr <= 0) return Infinity;
  return annualExpenses / swr;
}

export function calculateTimeToFire(
  currentValue: number,
  annualSavings: number,
  expectedReturn: number,
  fireNumber: number,
  maxYears = 100
): number | null {
  if (currentValue >= fireNumber) return 0;
  if (annualSavings <= 0 && expectedReturn <= 0) return null;

  let value = currentValue;
  for (let y = 1; y <= maxYears; y++) {
    value = value * (1 + expectedReturn) + annualSavings;
    if (value >= fireNumber) {
      const prev = (value - annualSavings) / (1 + expectedReturn);
      if (prev >= fireNumber) return y - 1;
      const fraction = expectedReturn > 0
        ? Math.log(fireNumber / (prev + annualSavings / expectedReturn)) / Math.log(1 + expectedReturn)
        : (fireNumber - prev) / annualSavings;
      return Math.max(0, y - 1 + Math.min(1, Math.max(0, fraction)));
    }
  }
  return null;
}

export function calculateCoastFireNumber(
  currentAge: number,
  retirementAge: number,
  expectedReturn: number,
  fireNumber: number
): number {
  const years = retirementAge - currentAge;
  if (years <= 0 || expectedReturn <= 0) return fireNumber;
  return fireNumber / Math.pow(1 + expectedReturn, years);
}

export function calculateBaristaFireNumber(
  partTimeAnnualIncome: number,
  annualExpenses: number,
  swr: number
): number {
  const gap = Math.max(0, annualExpenses - partTimeAnnualIncome);
  if (swr <= 0) return Infinity;
  return gap / swr;
}

export function calculateFireVariants(params: FireParams): FireVariant[] {
  const { annualExpenses, currentPortfolioValue, expectedReturn, safeWithdrawalRate, currentAge } = params;
  const annualSavings = params.annualIncome - params.annualExpenses;
  const totalReturn = expectedReturn + (params.includeDividendYield ?? 0);

  const lean = calculateFireNumber(annualExpenses * 0.5, safeWithdrawalRate);
  const regular = calculateFireNumber(annualExpenses, safeWithdrawalRate);
  const fat = calculateFireNumber(annualExpenses * 2, safeWithdrawalRate);
  const coast = calculateCoastFireNumber(currentAge, 65, totalReturn, regular);
  const barista = calculateBaristaFireNumber(annualExpenses * 0.4, annualExpenses, safeWithdrawalRate);

  const variants: FireVariant[] = [
    { label: "Lean FIRE", fireNumber: lean, yearsToFire: null, ageAtFire: null },
    { label: "Regular FIRE", fireNumber: regular, yearsToFire: null, ageAtFire: null },
    { label: "Fat FIRE", fireNumber: fat, yearsToFire: null, ageAtFire: null },
    { label: "Coast FIRE", fireNumber: coast, yearsToFire: null, ageAtFire: null },
    { label: "Barista FIRE", fireNumber: barista, yearsToFire: null, ageAtFire: null },
  ];

  for (const v of variants) {
    const years = calculateTimeToFire(currentPortfolioValue, annualSavings, totalReturn, v.fireNumber);
    v.yearsToFire = years !== null ? Math.round(years * 10) / 10 : null;
    v.ageAtFire = years !== null ? Math.round((currentAge + years) * 10) / 10 : null;
  }

  return variants;
}

export function projectFirePath(params: FireParams & { horizonYears: number }): FireProjectionPoint[] {
  const { currentPortfolioValue, expectedReturn, annualExpenses, safeWithdrawalRate, currentAge, horizonYears } = params;
  const annualSavings = params.annualIncome - params.annualExpenses;
  const totalReturn = expectedReturn + (params.includeDividendYield ?? 0);
  const fireNumber = calculateFireNumber(annualExpenses, safeWithdrawalRate);

  const points: FireProjectionPoint[] = [];
  let value = currentPortfolioValue;

  for (let y = 0; y <= horizonYears; y++) {
    points.push({ year: y, age: currentAge + y, value, fireNumber });
    value = value * (1 + totalReturn) + annualSavings;
  }

  return points;
}

export function savingsRate(annualIncome: number, annualExpenses: number): number {
  if (annualIncome <= 0) return 0;
  return Math.max(0, Math.min(1, (annualIncome - annualExpenses) / annualIncome));
}
