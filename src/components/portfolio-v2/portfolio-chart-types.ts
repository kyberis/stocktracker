export interface BenchmarkOverlayEntry {
  key: string;
  symbol: string;
  label: string;
  color: string;
}

export interface EventMarker {
  id?: string;
  date: string;
  type: string;
  ticker: string;
  name: string;
  shares: number;
  totalAmount?: number;
  currency?: string;
}

export interface SpikeContributor {
  ticker: string;
  name: string;
  contribution: number;
  dayChangePct: number;
}

export interface SpikeTypeBreakdown {
  type: string;
  delta: number;
  pct: number;
}

export interface SpikeDetail {
  delta: number;
  deltaPct: number;
  byType: SpikeTypeBreakdown[];
}
