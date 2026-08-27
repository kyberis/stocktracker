/**
 * Discount vs current median AND vs 5-year mean.
 * The product uses the current-median figure for screening; both are shown.
 */
export function discountPct(askingEurM2: number, referenceEurM2: number | null): number | null {
  if (referenceEurM2 == null || referenceEurM2 <= 0 || askingEurM2 <= 0) return null;
  return ((askingEurM2 - referenceEurM2) / referenceEurM2) * 100;
}

export function dualDiscount(askingEurM2: number, medianaActual: number | null, media5a: number | null): {
  vsMedianaPct: number | null;
  vsMedia5aPct: number | null;
} {
  return {
    vsMedianaPct: discountPct(askingEurM2, medianaActual),
    vsMedia5aPct: discountPct(askingEurM2, media5a),
  };
}
