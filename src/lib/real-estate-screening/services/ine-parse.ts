export const INE_SALE_VARCD = "0012234";
export const INE_RENT_VARCD = "0014696";
export const INE_HOUSING_TOTAL = "H1";
export const INE_META_URL =
  "https://www.ine.pt/ine/json_indicador/pindicaMeta.jsp?varcd=0012234&lang=PT";

export function ineDataUrl(varcd: string, dim1: string): string {
  return `https://www.ine.pt/ine/json_indicador/pindica.jsp?op=2&varcd=${encodeURIComponent(varcd)}&Dim1=${encodeURIComponent(dim1)}&lang=PT`;
}

/** Dim1 = S5A{year}{quarter} e.g. S5A20194, S5A20261 */
export function periodToDim1(year: number, quarter: 1 | 2 | 3 | 4): string {
  return `S5A${year}${quarter}`;
}

export function parseDim1(dim1: string): { year: number; quarter: number } | null {
  const m = /^S5A(\d{4})([1-4])$/.exec(dim1);
  if (!m) return null;
  return { year: Number(m[1]), quarter: Number(m[2]) };
}

export function listPeriodsFrom(startYear: number, startQuarter: 1 | 2 | 3 | 4, lastDim1: string): string[] {
  const last = parseDim1(lastDim1);
  if (!last) return [periodToDim1(startYear, startQuarter)];
  const out: string[] = [];
  let y = startYear;
  let q = startQuarter as number;
  while (y < last.year || (y === last.year && q <= last.quarter)) {
    out.push(periodToDim1(y, q as 1 | 2 | 3 | 4));
    q += 1;
    if (q > 4) {
      q = 1;
      y += 1;
    }
  }
  return out;
}

export function parseIneNumber(raw: unknown): number | null {
  if (raw == null) return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  const s = String(raw).trim();
  if (!s || s === "-") return null;
  const normalized = s.replace(/\s/g, "").replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

export interface IneDataRow {
  geocod: string;
  geodsg: string;
  dim3?: string;
  valor: number | null;
  nulo: boolean;
}

export function parseIneDataPayload(json: unknown, housingDim = INE_HOUSING_TOTAL): IneDataRow[] {
  if (!Array.isArray(json) || json.length === 0) return [];
  const root = json[0] as Record<string, unknown>;
  const dados = root.Dados as Record<string, unknown> | undefined;
  if (!dados || typeof dados !== "object") return [];
  const rows: IneDataRow[] = [];
  for (const periodRows of Object.values(dados)) {
    if (!Array.isArray(periodRows)) continue;
    for (const item of periodRows) {
      if (!item || typeof item !== "object") continue;
      const rec = item as Record<string, unknown>;
      const dim3 = String(rec.dim_3 ?? "");
      if (housingDim && dim3 && dim3 !== housingDim) continue;
      const nulo =
        String(rec.sinal_conv_desc ?? "").toLowerCase().includes("nulo") ||
        String(rec.ind_string ?? "") === "-";
      rows.push({
        geocod: String(rec.geocod ?? ""),
        geodsg: String(rec.geodsg ?? ""),
        dim3,
        valor: nulo ? null : parseIneNumber(rec.valor ?? rec.ind_string),
        nulo,
      });
    }
  }
  return rows.filter((r) => r.geocod);
}

export interface IneGeoCategory {
  geocod: string;
  nombre: string;
  nivel: number;
}

export function parseIneMetaGeographies(json: unknown): {
  lastDim1: string;
  geos: IneGeoCategory[];
} {
  if (!Array.isArray(json) || json.length === 0) {
    return { lastDim1: "", geos: [] };
  }
  const root = json[0] as Record<string, unknown>;
  const dims = root.Dimensoes as { Categoria_Dim?: unknown[] } | undefined;
  const cats = dims?.Categoria_Dim?.[0] as Record<string, unknown> | undefined;
  if (!cats) return { lastDim1: "", geos: [] };

  let lastDim1 = "";
  const geos: IneGeoCategory[] = [];
  for (const [key, value] of Object.entries(cats)) {
    if (!Array.isArray(value) || value.length === 0) continue;
    const rec = value[0] as Record<string, unknown>;
    const dimNum = String(rec.dim_num ?? "");
    const cod = String(rec.categ_cod ?? rec.cat_id ?? "");
    const nivel = Number(rec.categ_nivel ?? 0);
    const dsg = String(rec.categ_dsg ?? "");
    if (dimNum === "1" && cod.startsWith("S5A")) {
      lastDim1 = cod;
      continue;
    }
    if (dimNum === "2" && cod && nivel >= 3) {
      geos.push({ geocod: cod, nombre: dsg, nivel });
    }
  }
  return { lastDim1, geos };
}

export function nivelToTipo(nivel: number): "nuts2" | "nuts3" | "concelho" | "freguesia" | null {
  if (nivel === 3) return "nuts2";
  if (nivel === 4) return "nuts3";
  if (nivel === 5) return "concelho";
  if (nivel === 6) return "freguesia";
  return null;
}

export function isMetroName(nombre: string): boolean {
  return /metropolitana|grande lisboa|pen[ií]nsula de set[uú]bal/i.test(nombre);
}

export function assignParents(geos: IneGeoCategory[]): Map<string, { parent: string; distrito: string; metro: boolean }> {
  const lastByNivel = new Map<number, IneGeoCategory>();
  const out = new Map<string, { parent: string; distrito: string; metro: boolean }>();
  const sorted = [...geos].sort((a, b) => a.nivel - b.nivel || a.geocod.localeCompare(b.geocod));
  for (const g of sorted) {
    lastByNivel.set(g.nivel, g);
    const parent = lastByNivel.get(g.nivel - 1);
    const nuts3 = lastByNivel.get(4);
    out.set(g.geocod, {
      parent: parent?.geocod ?? "",
      distrito: nuts3?.nombre ?? g.nombre,
      metro: isMetroName(nuts3?.nombre ?? "") || isMetroName(g.nombre),
    });
  }
  return out;
}

export function cagrPct(start: number, end: number, years: number): number | null {
  if (start <= 0 || end <= 0 || years <= 0) return null;
  return (Math.pow(end / start, 1 / years) - 1) * 100;
}

export function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function yieldBrutaPct(rentaM2: number | null, precioM2: number | null): number | null {
  if (rentaM2 == null || precioM2 == null || precioM2 <= 0) return null;
  return ((rentaM2 * 12) / precioM2) * 100;
}
