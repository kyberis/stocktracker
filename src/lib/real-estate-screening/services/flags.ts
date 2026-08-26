import type { ListingFlag, ListingFlagKind } from "../schemas";

export const FLAGS: Record<ListingFlagKind, { re: RegExp; severity: "hard" | "soft" }> = {
  SIN_LICENCA: {
    re: /licen[çc]a de utiliza[çc][ãa]o|simplex|capitais pr[óo]prios|pronto pagamento/i,
    severity: "hard",
  },
  USUFRUTO: { re: /usufruto|nua propriedade/i, severity: "hard" },
  OCUPADO: { re: /im[óo]vel ocupado|indispon[íi]vel para visitas/i, severity: "soft" },
  RECOMPRA: { re: /opera[çc][ãa]o financeira|op[çc][ãa]o de recompra/i, severity: "hard" },
  RUINA: {
    re: /ru[íi]na|recupera[çc][ãa]o total|remodela[çc][ãa]o total|para recuperar/i,
    severity: "soft",
  },
  PROJETO_CADUCADO: { re: /projeto caducado/i, severity: "soft" },
  COMERCIAL: { re: /im[óo]vel comercial|afeta[çc][ãa]o servi[çc]os/i, severity: "hard" },
  PROPOSTAS: { re: /propostas m[úu]ltiplas|pre[çc]o base/i, severity: "soft" },
  TERRENO: { re: /quinta|herdade|terreno de \d+/i, severity: "hard" },
};

export const HARD_FLAGS: ListingFlagKind[] = [
  "USUFRUTO",
  "RECOMPRA",
  "SIN_LICENCA",
  "COMERCIAL",
  "TERRENO",
];

export function classifyFlags(description: string): ListingFlag[] {
  const flags: ListingFlag[] = [];
  for (const [kind, spec] of Object.entries(FLAGS) as Array<
    [ListingFlagKind, (typeof FLAGS)[ListingFlagKind]]
  >) {
    const m = spec.re.exec(description);
    if (!m) continue;
    flags.push({ kind, severity: spec.severity, quote: m[0] });
  }
  return flags;
}

export function extractUsableAreaM2(description: string, listedM2: number): {
  areaUtilM2: number | null;
  areaUsadaM2: number;
} {
  const m = description.match(/(\d+)\s*m²\s*(de área|útil|privativa)/i);
  const extracted = m ? Number(m[1]) : null;
  if (extracted == null || !Number.isFinite(extracted) || extracted <= 0) {
    return { areaUtilM2: null, areaUsadaM2: listedM2 };
  }
  return { areaUtilM2: extracted, areaUsadaM2: Math.min(listedM2, extracted) };
}

export function isHardExcluded(flags: ListingFlag[]): boolean {
  return flags.some((f) => f.severity === "hard");
}
