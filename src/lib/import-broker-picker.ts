import type { AvailableBrokerage } from "@/lib/snaptrade-client";

export type PickerBrokerKind = "sync" | "csv";

export interface PickerBroker {
  id: string;
  slug: string;
  name: string;
  displayName: string;
  kind: PickerBrokerKind;
  logoUrl: string | null;
  pinned?: boolean;
}

export const TRADE_REPUBLIC_PICKER: PickerBroker = {
  id: "trade-republic",
  slug: "trade-republic",
  name: "Trade Republic",
  displayName: "Trade Republic",
  kind: "csv",
  logoUrl: "/brokers/trade-republic.svg",
  pinned: true,
};

export function mergePickerBrokers(snaptrade: AvailableBrokerage[]): PickerBroker[] {
  const fromSnap = snaptrade
    .filter((b) => b.enabled && b.slug)
    .map((b): PickerBroker => ({
      id: b.id || b.slug,
      slug: b.slug,
      name: b.name,
      displayName: b.displayName || b.name,
      kind: "sync",
      logoUrl: b.logoUrl,
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));

  return [TRADE_REPUBLIC_PICKER, ...fromSnap];
}

export function filterPickerBrokers(brokers: PickerBroker[], query: string): PickerBroker[] {
  const q = query.trim().toLowerCase();
  if (!q) return brokers;
  return brokers.filter((b) => {
    return (
      b.displayName.toLowerCase().includes(q) ||
      b.name.toLowerCase().includes(q) ||
      b.slug.toLowerCase().includes(q)
    );
  });
}

export function brokerInitials(name: string): string {
  const caps = name.replace(/[^A-Z]/g, "").slice(0, 2);
  if (caps.length >= 2) return caps;
  return name.slice(0, 2).toUpperCase();
}
