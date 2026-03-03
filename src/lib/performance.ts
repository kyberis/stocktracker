import type { Transaction } from "./types";

/**
 * True-Time Weighted Rate of Return (TTWROR)
 * Geometric linking of sub-period returns between cash flows.
 * Returns a percentage (e.g. 12.5 for +12.5%).
 */
export function calculateTTWROR(
  transactions: Transaction[],
  currentValueEUR: number,
  totalInvestedEUR: number
): number {
  if (totalInvestedEUR <= 0 || transactions.length === 0) return 0;

  const sorted = [...transactions]
    .filter((t) => t.type === "buy" || t.type === "sell")
    .sort((a, b) => a.date.localeCompare(b.date));

  if (sorted.length === 0) {
    return totalInvestedEUR > 0
      ? ((currentValueEUR - totalInvestedEUR) / totalInvestedEUR) * 100
      : 0;
  }

  // Simple approximation: compound sub-period returns between cash flow dates
  let portfolioValue = 0;
  let compoundReturn = 1;

  for (const tx of sorted) {
    const cashFlow =
      tx.type === "buy"
        ? tx.totalAmount + (tx.fees || 0) + (tx.taxes || 0)
        : -(tx.totalAmount - (tx.fees || 0) - (tx.taxes || 0));

    if (portfolioValue > 0 && cashFlow !== 0) {
      const subPeriodReturn = (portfolioValue + cashFlow) / portfolioValue;
      if (subPeriodReturn > 0) compoundReturn *= subPeriodReturn;
    }

    portfolioValue += cashFlow;
  }

  if (portfolioValue > 0 && currentValueEUR > 0) {
    compoundReturn *= currentValueEUR / portfolioValue;
  }

  return (compoundReturn - 1) * 100;
}

/**
 * Internal Rate of Return via Newton-Raphson XIRR
 * Takes dated cash flows (negative = outflow, positive = inflow)
 * Returns annualized rate as percentage (e.g. 8.5 for +8.5%).
 */
export function calculateXIRR(
  cashFlows: { date: Date; amount: number }[]
): number {
  if (cashFlows.length < 2) return 0;

  const sorted = [...cashFlows].sort((a, b) => a.date.getTime() - b.date.getTime());
  const d0 = sorted[0].date.getTime();

  function yearFrac(d: Date): number {
    return (d.getTime() - d0) / (365.25 * 86400000);
  }

  function npv(rate: number): number {
    return sorted.reduce((sum, cf) => {
      const t = yearFrac(cf.date);
      return sum + cf.amount / Math.pow(1 + rate, t);
    }, 0);
  }

  function dnpv(rate: number): number {
    return sorted.reduce((sum, cf) => {
      const t = yearFrac(cf.date);
      if (t === 0) return sum;
      return sum - (t * cf.amount) / Math.pow(1 + rate, t + 1);
    }, 0);
  }

  let rate = 0.1;
  for (let i = 0; i < 100; i++) {
    const val = npv(rate);
    const deriv = dnpv(rate);
    if (Math.abs(deriv) < 1e-12) break;
    const newRate = rate - val / deriv;
    if (Math.abs(newRate - rate) < 1e-8) {
      rate = newRate;
      break;
    }
    rate = newRate;
    if (rate < -0.99) rate = -0.99;
    if (rate > 10) rate = 10;
  }

  return rate * 100;
}

/**
 * Build XIRR cash flows from transactions + current portfolio value.
 */
export function buildXIRRCashFlows(
  transactions: Transaction[],
  currentValueEUR: number
): { date: Date; amount: number }[] {
  const flows: { date: Date; amount: number }[] = [];

  for (const tx of transactions) {
    const d = new Date(tx.date);
    if (isNaN(d.getTime())) continue;

    switch (tx.type) {
      case "buy":
        flows.push({ date: d, amount: -(tx.totalAmount + (tx.fees || 0) + (tx.taxes || 0)) });
        break;
      case "sell":
        flows.push({ date: d, amount: tx.totalAmount - (tx.fees || 0) - (tx.taxes || 0) });
        break;
      case "dividend":
        flows.push({ date: d, amount: tx.totalAmount });
        break;
      case "fee":
        flows.push({ date: d, amount: -tx.totalAmount });
        break;
    }
  }

  if (currentValueEUR > 0) {
    flows.push({ date: new Date(), amount: currentValueEUR });
  }

  return flows;
}
