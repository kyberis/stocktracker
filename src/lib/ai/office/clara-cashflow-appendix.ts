import type { ClaraSavingsSummary } from "./types";

/**
 * Injected into Warren's system prompt on the Clara channel.
 * Aggregates only — never expense line items.
 */
export function formatClaraCashflowAppendix(summary: ClaraSavingsSummary): string {
  if (!summary.available) {
    return [
      "Clara cashflow snapshot: unavailable.",
      summary.note ? `Note: ${summary.note}` : "",
      "Do not invent Clara numbers. Still ground the trefolio portfolio with tools.",
    ]
      .filter(Boolean)
      .join(" ");
  }

  const ccy = summary.currency || "EUR";
  const month =
    summary.monthKey && summary.dayOfMonth && summary.daysInMonth
      ? `${summary.monthKey}, UTC day ${summary.dayOfMonth} of ${summary.daysInMonth}`
      : "current month (calendar unknown)";

  const monthLines = summary.hasMonthRecord
    ? [
        `- Income received: ${ccy} ${summary.incomeReceived ?? 0} (expected ${ccy} ${summary.incomeExpected ?? 0}).`,
        `- Expenses planned ${ccy} ${summary.plannedExpenses ?? 0} / paid ${ccy} ${summary.paidExpenses ?? 0} / remaining ${ccy} ${summary.remainingExpenses ?? 0}.`,
        `- Month balance (effective income − planned): ${ccy} ${summary.monthBalance ?? 0}.`,
      ]
    : ["- This month is not set up yet in Clara (no month record)."];

  return [
    "Clara cashflow snapshot (aggregates only — no expense line items):",
    `- Calendar: ${month}.`,
    `- Emergency pile: ${ccy} ${summary.emergencyBalanceEur ?? 0} (target ${ccy} ${summary.emergencyTargetEur ?? 0}); surplus above target: ${ccy} ${summary.surplusEur ?? 0}.`,
    ...monthLines,
    summary.note ? `- Note: ${summary.note}` : "",
    "When the user asks whether they have room to invest, combine this snapshot with portfolio tools. Frame as cash capacity (emergency fund vs target, remaining expenses, day of month, surplus). Never tell them to buy or sell a specific asset. You are not a licensed advisor; this is not investment advice.",
  ]
    .filter(Boolean)
    .join("\n");
}
