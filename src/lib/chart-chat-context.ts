/**
 * Build compact chart samples and invested deltas for the chart AI assistant.
 */

export interface ChartSampleRow {
  date: string;
  value: number;
  invested: number;
  performancePct?: number;
}

export function downsampleChartSamples<T extends { date: string }>(points: T[], maxPoints: number): T[] {
  if (points.length <= maxPoints) return points;
  const step = Math.ceil(points.length / maxPoints);
  const out: T[] = [];
  for (let i = 0; i < points.length; i += step) out.push(points[i]);
  const last = points[points.length - 1];
  if (out[out.length - 1] !== last) out.push(last);
  return out;
}

export function computeInvestedDeltas(
  points: { date: string; invested: number }[],
  max = 24,
): { fromDate: string; toDate: string; delta: number }[] {
  const d: { fromDate: string; toDate: string; delta: number }[] = [];
  for (let i = 1; i < points.length; i++) {
    const delta = points[i].invested - points[i - 1].invested;
    if (Math.abs(delta) > 1e-6) {
      d.push({ fromDate: points[i - 1].date, toDate: points[i].date, delta });
    }
  }
  return d.slice(-max);
}
