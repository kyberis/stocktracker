export interface RentComparable {
  id: string;
  m2: number;
  rent: number;
  tipologia: string;
}

export interface RentEstimate {
  renta: number | null;
  mediana: number | null;
  p25: number | null;
  p75: number | null;
  r2: number | null;
  usedRegression: boolean;
  widenedBand: boolean;
  comparableCount: number;
  brechaVsInePct: number | null;
  revisionManual: boolean;
  explicacion: string;
  afterNegotiation: number | null;
}

function percentile(sorted: number[], p: number): number | null {
  if (sorted.length === 0) return null;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] * (hi - idx) + sorted[hi] * (idx - lo);
}

function rSquared(xs: number[], ys: number[]): { r2: number; slope: number; intercept: number } {
  const n = xs.length;
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let denX = 0;
  let denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  const slope = denX === 0 ? 0 : num / denX;
  const intercept = meanY - slope * meanX;
  const r2 = denX === 0 || denY === 0 ? 0 : (num * num) / (denX * denY);
  return { r2, slope, intercept };
}

const NEGOTIATION = 0.08;

export function estimateRent(opts: {
  areaM2: number;
  tipologia: string;
  comps: RentComparable[];
  rentaIneM2: number | null;
}): RentEstimate {
  const empty = (explicacion: string): RentEstimate => ({
    renta: null,
    mediana: null,
    p25: null,
    p75: null,
    r2: null,
    usedRegression: false,
    widenedBand: false,
    comparableCount: 0,
    brechaVsInePct: null,
    revisionManual: true,
    explicacion,
    afterNegotiation: null,
  });

  const sameTipo = opts.comps.filter((c) => c.tipologia === opts.tipologia || opts.tipologia === "");
  const pool = sameTipo.length > 0 ? sameTipo : opts.comps;

  const inBand = (band: number) =>
    pool.filter((c) => Math.abs(c.m2 - opts.areaM2) / opts.areaM2 <= band);

  let comps = inBand(0.3);
  let widened = false;
  if (comps.length < 4) {
    comps = inBand(0.4);
    widened = true;
  }
  if (comps.length === 0) {
    return empty("No rent comparables in the same zone and size band.");
  }

  const rents = comps.map((c) => c.rent).sort((a, b) => a - b);
  const mediana = percentile(rents, 0.5);
  const p25 = percentile(rents, 0.25);
  const p75 = percentile(rents, 0.75);

  let renta = mediana;
  let usedRegression = false;
  let r2: number | null = null;
  if (comps.length >= 5) {
    const fit = rSquared(
      comps.map((c) => c.m2),
      comps.map((c) => c.rent),
    );
    r2 = fit.r2;
    if (fit.r2 > 0.6) {
      renta = fit.slope * opts.areaM2 + fit.intercept;
      usedRegression = true;
    }
  }

  const ineImplied = opts.rentaIneM2 != null ? opts.rentaIneM2 * opts.areaM2 : null;
  const brechaVsInePct =
    renta != null && ineImplied != null && ineImplied > 0
      ? ((renta - ineImplied) / ineImplied) * 100
      : null;

  const iqr = p25 != null && p75 != null ? p75 - p25 : null;
  const outsideIqr =
    iqr != null && p25 != null && p75 != null && renta != null
      ? renta < p25 - 1.5 * iqr || renta > p75 + 1.5 * iqr
      : false;

  const revisionManual =
    (brechaVsInePct != null && Math.abs(brechaVsInePct) > 40) ||
    comps.length < 5 ||
    outsideIqr;

  const afterNegotiation = renta != null ? renta * (1 - NEGOTIATION) : null;

  const explicacion = [
    `Median of ${comps.length} comps` + (widened ? " (size band widened to ±40%)" : " (±30% size)"),
    usedRegression && r2 != null ? `linear rent~m² R²=${r2.toFixed(2)}` : "no regression (R²≤0.6 or n<5)",
    brechaVsInePct != null
      ? `asking/model vs INE signed rent gap ${brechaVsInePct.toFixed(0)}%`
      : "no INE rent to contrast",
    `−8% negotiation haircut applied`,
    revisionManual ? "REVISION_MANUAL: low confidence — micro-location is human judgement" : "",
  ]
    .filter(Boolean)
    .join(". ");

  return {
    renta,
    mediana,
    p25,
    p75,
    r2,
    usedRegression,
    widenedBand: widened,
    comparableCount: comps.length,
    brechaVsInePct,
    revisionManual,
    explicacion,
    afterNegotiation,
  };
}
